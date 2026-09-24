#!/usr/bin/env node
/**
 * ClassScout catalog loop — one Improve cycle with deep enrich.
 *
 * Prefers open recommendation records (from recommend-improve.cjs), then fills
 * the batch with oldest-updated public listings that still have blank
 * trial/sessions/contacts/price/age/address fields. Optional
 * `CATALOG_IMPROVE_PREFER_LANE` (e.g. `age`) pulls soft-lane blanks ahead of
 * generic oldest blanks after recommendations. Runs a bounded multi-page
 * official-site enrich (all lanes in one pass), applies evidenced patches,
 * bumps updatedAt, and closes recommendations when gaps resolve (or exhaust).
 * Evidence-only; never invents contacts.
 */
require("./_productRoot.cjs").loadProductEnv();
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const {
  STATE_PATH,
  DATA_DIR,
  IMPROVE_LOG,
  ensureDir,
  migrateTmpStateIfNeeded,
} = require("./lib/paths.cjs");
const { appendEvent } = require("./lib/events.cjs");
const { sortOldestUpdatedFirst } = require("./lib/scarcityResearchBrief.cjs");
const { listingQualityGaps } = require("./lib/listingQualityGaps.cjs");
const {
  loadRecommendations,
  saveRecommendations,
  openRecommendations,
  settleRecommendationAfterAttempt,
  eligibleOpenRecommendations,
} = require("./lib/recommendationStore.cjs");

const LANES = ["trial", "sessions", "contacts", "price", "age", "address", "description"];

function loadState() {
  migrateTmpStateIfNeeded();
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { cycle: 0, appliedIds: [], trialOffset: 0, laneOffsets: {} };
  }
}

function saveState(s) {
  s.updatedAt = new Date().toISOString();
  ensureDir(DATA_DIR);
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

/**
 * Improve may enrich inventory / browse_only rows (non-public regions still get Find + Improve —
 * rule 439). Hidden and quarantined stay out.
 */
function isImproveEligible(row) {
  return row.visibility !== "hidden" && row.qualityStatus !== "quarantined";
}

function blankLanes(r) {
  return listingQualityGaps(r).lanes;
}

function needsEnrich(r) {
  return listingQualityGaps(r).enrichable;
}

async function snapshot(col) {
  const pub = (await col.find({}).toArray()).filter(isImproveEligible);
  const counts = {};
  for (const lane of LANES) {
    counts[`${lane}Blank`] = pub.filter((r) => blankLanes(r).includes(lane)).length;
  }
  counts.needsDeepEnrich = pub.filter(needsEnrich).length;
  return { public: pub.length, ...counts, pub };
}

/**
 * Recommendation-first batch (cooldown + least-attempted), then oldest-updated blanks.
 * Optional `CATALOG_IMPROVE_PREFER_LANE` (e.g. `age`) fills remaining slots from
 * listings that still blank that soft lane before generic oldest blanks.
 * @param {object[]} pub
 * @param {number} batchSize
 */
function selectBatch(pub, batchSize) {
  const preferLane = String(process.env.CATALOG_IMPROVE_PREFER_LANE || "")
    .trim()
    .toLowerCase();
  const byId = new Map(pub.map((r) => [r.id, r]));
  const openRecs = eligibleOpenRecommendations().filter((rec) => {
    const row = byId.get(rec.providerId);
    return row && needsEnrich(row);
  });

  const fromRecs = [];
  const recIds = new Set();
  for (const rec of openRecs) {
    if (fromRecs.length >= batchSize) break;
    const row = byId.get(rec.providerId);
    if (!row || recIds.has(row.id)) continue;
    fromRecs.push({ ...row, _fromRecommendation: true, _recPriority: rec.priority });
    recIds.add(row.id);
  }

  const remaining = () => batchSize - fromRecs.length;
  const blankPool = pub.filter((r) => needsEnrich(r) && !recIds.has(r.id));

  if (preferLane && remaining() > 0) {
    const preferred = sortOldestUpdatedFirst(
      blankPool.filter((r) => blankLanes(r).includes(preferLane))
    );
    for (const row of preferred) {
      if (remaining() <= 0) break;
      fromRecs.push({ ...row, _fromRecommendation: false, _preferLane: preferLane });
      recIds.add(row.id);
    }
  }

  if (remaining() > 0) {
    const fromBlanks = sortOldestUpdatedFirst(
      blankPool.filter((r) => !recIds.has(r.id))
    );
    for (const row of fromBlanks) {
      if (remaining() <= 0) break;
      fromRecs.push({ ...row, _fromRecommendation: false });
      recIds.add(row.id);
    }
  }

  return fromRecs.slice(0, batchSize);
}

function closeInvestigatedRecommendations(investigatedIds, byIdAfter) {
  const doc = loadRecommendations();
  let closedResolved = 0;
  let closedPriority = 0;
  let exhausted = 0;
  let attempted = 0;
  let progress = 0;

  for (const id of investigatedIds) {
    const row = byIdAfter.get(id);
    const audit = row
      ? listingQualityGaps(row)
      : { enrichable: false, gaps: [], lanes: [], priority: 999 };
    const gaps = (audit.gaps || []).filter((g) => g !== "missing_website");
    const settled = settleRecommendationAfterAttempt(
      doc,
      id,
      gaps,
      audit.lanes || [],
      typeof audit.priority === "number" ? audit.priority : 999
    );

    if (settled.outcome === "resolved") {
      closedResolved += 1;
      appendEvent("improve_recommend_close", {
        providerId: id,
        closeReason: "resolved",
        gaps,
      });
      continue;
    }
    if (settled.outcome === "resolved_priority") {
      closedPriority += 1;
      appendEvent("improve_recommend_close", {
        providerId: id,
        closeReason: "resolved_priority",
        gaps,
      });
      continue;
    }
    if (settled.outcome === "exhausted") {
      exhausted += 1;
      appendEvent("improve_recommend_close", {
        providerId: id,
        closeReason: "exhausted",
        gaps,
      });
      continue;
    }
    if (settled.outcome === "progress") {
      progress += 1;
      appendEvent("improve_recommend", {
        providerId: id,
        gaps,
        lanes: audit.lanes || [],
        priority: audit.priority,
        progress: true,
      });
      continue;
    }
    if (settled.outcome === "attempted") attempted += 1;
  }

  saveRecommendations(doc);
  return {
    closedResolved,
    closedPriority,
    exhausted,
    attempted,
    progress,
    openAfter: openRecommendations(doc).length,
  };
}

async function main() {
  ensureDir(DATA_DIR);
  const state = loadState();
  state.cycle = (state.cycle || 0) + 1;
  state.laneOffsets = state.laneOffsets || {};

  const client = new MongoClient(process.env.getyourfield_MONGODB_URI);
  await client.connect();
  const col = client.db("classscoutcluster").collection("providers");
  const snap = await snapshot(col);
  const { pub, ...counts } = snap;
  console.log("cycle", state.cycle, counts);

  const batchSize = Math.max(3, Number(process.env.CATALOG_IMPROVE_BATCH || 8));
  const preferLane = String(process.env.CATALOG_IMPROVE_PREFER_LANE || "")
    .trim()
    .toLowerCase() || null;
  const batch = selectBatch(pub, batchSize);
  const fromRecommendation = batch.filter((r) => r._fromRecommendation).length;
  const fromPreferLane = batch.filter((r) => r._preferLane).length;

  const listPath = path.join(DATA_DIR, `improve-blank-deep.json`);
  fs.writeFileSync(
    listPath,
    JSON.stringify(
      batch.map((r) => ({
        id: r.id,
        name: r.name,
        website: r.website,
        borough: r.borough,
        updatedAt: r.updatedAt || null,
        blanks: blankLanes(r),
        fromRecommendation: Boolean(r._fromRecommendation),
        preferLane: r._preferLane || null,
        recPriority: r._recPriority != null ? r._recPriority : null,
      })),
      null,
      2
    )
  );

  const out = path.join(DATA_DIR, `improve-deep-cycle-${state.cycle}.json`);
  let withEvidence = 0;
  let fields = {};
  if (batch.length) {
    const scan = spawnSync(
      "node",
      [require("path").join(__dirname, "deep-enrich-scan.mjs"), listPath, out],
      { encoding: "utf8", timeout: 20 * 60 * 1000 }
    );
    console.log(scan.stdout);
    if (scan.status !== 0) console.error(scan.stderr);
    try {
      const doc = JSON.parse(fs.readFileSync(out, "utf8"));
      withEvidence = doc.withEvidence || 0;
      fields = doc.fields || {};
    } catch {
      withEvidence = 0;
    }
  }

  const investigatedIds = batch.map((r) => r.id).filter(Boolean);
  let touched = 0;
  if (investigatedIds.length) {
    const touchAt = new Date().toISOString();
    const touchRes = await col.updateMany(
      { id: { $in: investigatedIds } },
      { $set: { updatedAt: touchAt } }
    );
    touched = touchRes.modifiedCount || 0;
  }

  appendEvent("improve_scan", {
    cycle: state.cycle,
    lane: "deep",
    preferLane,
    candidates: pub.filter(needsEnrich).length,
    batchSize,
    fromRecommendation,
    fromPreferLane,
    withEvidence,
    fields,
    investigated: investigatedIds.length,
    touchedUpdatedAt: touched,
    oldestUpdatedAt: batch[0] && batch[0].updatedAt ? batch[0].updatedAt : null,
  });

  state.lastImproveLane = "deep";
  state.nextLane = "deep";

  if (fs.existsSync(out)) {
    spawnSync("node", [require("path").join(__dirname, "apply-improve.cjs")], {
      encoding: "utf8",
      env: {
        ...process.env,
        CATALOG_LOOP_EXTRA_FILES: out,
        CATALOG_LOOP_LANE: "deep",
      },
    });
  }

  const snap2 = await snapshot(col);
  const { pub: pub2, ...counts2 } = snap2;
  const byIdAfter = new Map(pub2.map((r) => [r.id, r]));
  const recClose = closeInvestigatedRecommendations(
    batch.filter((r) => r._fromRecommendation).map((r) => r.id),
    byIdAfter
  );

  state.lastSnap = counts2;
  state.lastRecommendClose = recClose;
  saveState(state);

  const report = {
    at: new Date().toISOString(),
    cycle: state.cycle,
    lane: "deep",
    preferLane,
    before: counts,
    after: counts2,
    withEvidence,
    fields,
    investigated: investigatedIds.length,
    fromRecommendation,
    fromPreferLane,
    touchedUpdatedAt: touched,
    recommendClose: recClose,
  };
  fs.writeFileSync(IMPROVE_LOG, JSON.stringify(report, null, 2));
  console.log(
    "after",
    counts2,
    "lane deep",
    preferLane ? `prefer=${preferLane}` : "",
    "withEvidence",
    withEvidence,
    fields,
    "fromRecommendation",
    fromRecommendation,
    "fromPreferLane",
    fromPreferLane,
    "recommendClose",
    recClose
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
