#!/usr/bin/env node
/**
 * Operator feedback intake → lessons.json / seed pause / improve recommendations
 * (quality plan Phase 3).
 *
 * Drop JSON files into scripts/catalog-loop/data/feedback/ with shape:
 *   { "providerId"|"seedId": "...", "tag": "wrong_address"|..., "note": "...", "at"?: iso }
 * Processed files move to feedback/done/.
 *
 * BINDING: the operator note is for lessons + event log only. It must NEVER be
 * written into shortDescription / longDescription / About. Improve opens a
 * recommendation so evidence-backed enrich can fix the gap.
 */
const fs = require("fs");
const path = require("path");
const {
  FEEDBACK_DIR,
  SEEDS_PATH,
  LESSONS_PATH,
  ensureDir,
  migrateTmpStateIfNeeded,
} = require("./lib/paths.cjs");
const { FEEDBACK_TAGS, appendEvent } = require("./lib/events.cjs");
const {
  loadRecommendations,
  saveRecommendations,
  upsertOpenRecommendation,
} = require("./lib/recommendationStore.cjs");

const TAG_TO_GAPS = Object.freeze({
  wrong_address: { gaps: ["bad_address"], lanes: ["address"], priority: 10 },
  wrong_phone: { gaps: ["blank_contacts"], lanes: ["contacts"], priority: 20 },
});

function main() {
  migrateTmpStateIfNeeded();
  ensureDir(FEEDBACK_DIR);
  const doneDir = path.join(FEEDBACK_DIR, "done");
  ensureDir(doneDir);

  const files = fs
    .readdirSync(FEEDBACK_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("."));
  if (!files.length) {
    console.log(JSON.stringify({ processed: 0 }));
    return;
  }

  const seedsDoc = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
  const lessonsDoc = JSON.parse(fs.readFileSync(LESSONS_PATH, "utf8"));
  const now = new Date().toISOString();
  let processed = 0;

  for (const file of files) {
    const full = path.join(FEEDBACK_DIR, file);
    let row;
    try {
      row = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch {
      console.error("skip bad feedback json", file);
      continue;
    }
    const tag = String(row.tag || "");
    if (!FEEDBACK_TAGS.includes(tag)) {
      console.error("skip unknown tag", tag, file);
      continue;
    }
    const seedId = row.seedId || row.providerId;
    appendEvent("operator_feedback", {
      seedId,
      providerId: row.providerId,
      tag,
      note: String(row.note || "").slice(0, 500),
      file,
    });

    const pauseTags = new Set(["wrong_address", "wrong_phone", "not_public_worthy", "seed_url_bad", "duplicate"]);
    if (seedId && pauseTags.has(tag)) {
      const seed = (seedsDoc.seeds || []).find((s) => s.id === seedId);
      if (seed && !seed.paused) {
        seed.paused = true;
        seed.pauseReason = `operator_feedback:${tag}`;
        seed.pausedAt = now;
        appendEvent("seed_paused", { seedId, reasonCode: tag, tier: "B" });
      }
    }

    const lid = `lesson-feedback-${tag}-${(seedId || file).replace(/\W+/g, "-").slice(0, 48)}`;
    lessonsDoc.lessons = lessonsDoc.lessons || [];
    if (!lessonsDoc.lessons.some((l) => l.id === lid)) {
      lessonsDoc.lessons.push({
        id: lid,
        incidentAt: (row.at || now).slice(0, 10),
        summary: row.note || `Operator feedback ${tag} on ${seedId || "unknown"}`,
        failureMode: tag,
        encode: {
          tier: "B",
          actions: pauseTags.has(tag)
            ? [`pause seed ${seedId}`, `tag ${tag}`]
            : [`record good/reclassify signal ${tag}`],
        },
        status: tag === "good_example" ? "encoded" : "open",
        relatedIds: seedId ? [seedId] : [],
      });
      appendEvent("lesson_encoded", { lessonId: lid, tier: "B", tag });
    }

    const gapMap = TAG_TO_GAPS[tag];
    if (row.providerId && gapMap) {
      const recDoc = loadRecommendations();
      const { row: rec, action } = upsertOpenRecommendation(
        recDoc,
        {
          providerId: row.providerId,
          name: row.name || null,
          gaps: gapMap.gaps,
          lanes: gapMap.lanes,
          priority: gapMap.priority,
        },
        { forceReopen: true }
      );
      if (rec) {
        rec.source = "operator_feedback";
        // Never paste operator notes into About — store for humans / lessons only.
        rec.operatorNote = String(row.note || "").slice(0, 500);
        delete rec.aboutOverride;
        delete rec.forcedDescription;
      }
      saveRecommendations(recDoc);
      if (action === "created" || action === "reopened" || action === "refreshed") {
        appendEvent("improve_recommend", {
          providerId: row.providerId,
          gaps: gapMap.gaps,
          lanes: gapMap.lanes,
          priority: gapMap.priority,
          source: "operator_feedback",
        });
      }
    }

    fs.renameSync(full, path.join(doneDir, `${Date.now()}-${file}`));
    processed += 1;
  }

  if (processed) {
    seedsDoc.updatedAt = now;
    lessonsDoc.updatedAt = now;
    fs.writeFileSync(SEEDS_PATH, JSON.stringify(seedsDoc, null, 2) + "\n");
    fs.writeFileSync(LESSONS_PATH, JSON.stringify(lessonsDoc, null, 2) + "\n");
  }
  console.log(JSON.stringify({ processed }));
}

main();
