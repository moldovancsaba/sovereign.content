#!/usr/bin/env node
/**
 * Audit live public listings → open/close improve recommendation records.
 *
 * Opens recommendations only for public-quality gaps (bad address / weak description / blank contacts).
 * blank_contacts = missing phone. Missing email alone is soft `blank_email` (oldest-blank Improve).
 * Soft blanks (email/trial/sessions/price/age) stay on oldest-blank Improve rotation.
 * Exhausted and resolved_priority rows stay closed until cooldown / priority gaps return.
 */
require("./_productRoot.cjs").loadProductEnv();
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const { ensureDir, DATA_DIR, migrateTmpStateIfNeeded } = require("./lib/paths.cjs");
const { appendEvent } = require("./lib/events.cjs");
const { listingQualityGaps } = require("./lib/listingQualityGaps.cjs");
const {
  loadRecommendations,
  saveRecommendations,
  pruneClosed,
  upsertOpenRecommendation,
  closeRecommendation,
  openRecommendations,
} = require("./lib/recommendationStore.cjs");

/**
 * Recommendations cover public + inventory listings (browse_only / disabled regions still Improve —
 * rule 439). Hidden and quarantined stay out.
 */
function isImproveEligible(row) {
  return row.visibility !== "hidden" && row.qualityStatus !== "quarantined";
}

async function main() {
  migrateTmpStateIfNeeded();
  ensureDir(DATA_DIR);

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const col = client.db("classscoutcluster").collection("providers");
  const pub = (await col.find({}).toArray()).filter(isImproveEligible);
  await client.close();

  const doc = pruneClosed(loadRecommendations());
  const beforeOpen = openRecommendations(doc).length;
  const byId = new Map((doc.recommendations || []).map((r) => [r.providerId, r]));

  let opened = 0;
  let refreshed = 0;
  let reopened = 0;
  let skippedExhausted = 0;
  let skippedResolved = 0;
  let closedResolved = 0;
  let closedSoftDeferred = 0;
  let closedNotPublic = 0;
  let closedNoWebsite = 0;
  const gapHist = {};

  const seen = new Set();
  for (const row of pub) {
    if (!row || !row.id) continue;
    seen.add(row.id);
    const audit = listingQualityGaps(row);
    for (const g of audit.gaps) gapHist[g] = (gapHist[g] || 0) + 1;

    const existing = byId.get(row.id);

    // No website / nothing enrichable → close any open rec.
    if (!audit.enrichable) {
      if (existing && existing.status === "open") {
        const reason = audit.hasWebsite ? "resolved" : "missing_website";
        closeRecommendation(doc, row.id, reason);
        if (reason === "missing_website") closedNoWebsite += 1;
        else closedResolved += 1;
        appendEvent("improve_recommend_close", {
          providerId: row.id,
          closeReason: reason,
          gaps: audit.gaps,
        });
      }
      continue;
    }

    // Soft blanks only → do not open; defer existing soft-only opens off the queue.
    if (!audit.recommendable) {
      if (existing && existing.status === "open") {
        closeRecommendation(doc, row.id, "soft_deferred");
        closedSoftDeferred += 1;
        appendEvent("improve_recommend_close", {
          providerId: row.id,
          closeReason: "soft_deferred",
          gaps: audit.gaps,
        });
      }
      continue;
    }

    const gaps = audit.gaps.filter((g) => g !== "missing_website");
    // Recommendation payload keeps soft gaps for context, but priority drives the queue.
    const { action } = upsertOpenRecommendation(doc, {
      providerId: row.id,
      name: row.name || null,
      gaps,
      lanes: audit.lanes,
      priority: audit.priority,
    });

    if (action === "skipped_exhausted") {
      skippedExhausted += 1;
      continue;
    }
    if (action === "skipped_resolved") {
      skippedResolved += 1;
      continue;
    }
    if (action === "refreshed") {
      refreshed += 1;
      continue;
    }
    if (action === "reopened") {
      reopened += 1;
      appendEvent("improve_recommend", {
        providerId: row.id,
        gaps,
        lanes: audit.lanes,
        priority: audit.priority,
        reopened: true,
      });
      continue;
    }
    if (action === "created") {
      opened += 1;
      appendEvent("improve_recommend", {
        providerId: row.id,
        gaps,
        lanes: audit.lanes,
        priority: audit.priority,
      });
    }
  }

  for (const row of doc.recommendations || []) {
    if (!row || row.status !== "open") continue;
    if (seen.has(row.providerId)) continue;
    closeRecommendation(doc, row.providerId, "not_public");
    closedNotPublic += 1;
    appendEvent("improve_recommend_close", {
      providerId: row.providerId,
      closeReason: "not_public",
    });
  }

  saveRecommendations(doc);
  const afterOpen = openRecommendations(doc).length;
  const summary = {
    at: new Date().toISOString(),
    public: pub.length,
    open_before: beforeOpen,
    open_after: afterOpen,
    opened,
    refreshed,
    reopened,
    skipped_exhausted: skippedExhausted,
    skipped_resolved: skippedResolved,
    closed_resolved: closedResolved,
    closed_soft_deferred: closedSoftDeferred,
    closed_missing_website: closedNoWebsite,
    closed_not_public: closedNotPublic,
    top_gaps: Object.entries(gapHist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code, count]) => `${code}:${count}`),
  };
  console.log(JSON.stringify(summary));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
