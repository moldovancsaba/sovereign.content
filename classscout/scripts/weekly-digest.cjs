#!/usr/bin/env node
/**
 * Weekly digest from the event log + lessons (quality plan §5.5 / Phase 3).
 * Writes scripts/catalog-loop/data/digests/week-YYYY-MM-DD.json and prints a short summary.
 */
const fs = require("fs");
const path = require("path");
const {
  DIGESTS_DIR,
  LESSONS_PATH,
  SEEDS_PATH,
  QUALITY_HOURLY_PATH,
  ensureDir,
  migrateTmpStateIfNeeded,
} = require("./lib/paths.cjs");
const { readEventsSince, mapSkipReason } = require("./lib/events.cjs");

function main() {
  migrateTmpStateIfNeeded();
  ensureDir(DIGESTS_DIR);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const events = readEventsSince(since, 200_000);
  const lessons = JSON.parse(fs.readFileSync(LESSONS_PATH, "utf8")).lessons || [];
  const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8")).seeds || [];

  const skipHist = {};
  let findPublic = 0;
  let improveApply = 0;
  let feedback = 0;
  let encoded = 0;
  let recommendOpened = 0;
  let recommendClosed = 0;
  for (const e of events) {
    if (e.type === "find_skip") {
      const c = e.reasonCode || mapSkipReason(e.reason);
      skipHist[c] = (skipHist[c] || 0) + 1;
    }
    if (e.type === "find_publish" && e.publicTarget) findPublic += 1;
    if (e.type === "improve_apply") improveApply += 1;
    if (e.type === "operator_feedback") feedback += 1;
    if (e.type === "lesson_encoded" || e.type === "seed_paused") encoded += 1;
    if (e.type === "improve_recommend") recommendOpened += 1;
    if (e.type === "improve_recommend_close") recommendClosed += 1;
  }

  const topSkip = Object.entries(skipHist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const recentLessons = lessons
    .filter((l) => l.status === "encoded")
    .slice(-8)
    .map((l) => ({ id: l.id, summary: l.summary }));
  const openLessons = lessons.filter((l) => l.status === "open" || l.status === "planned");
  const pending = seeds.filter((s) => s.publicTarget !== false && !s.paused).length;

  let lasting = null;
  try {
    lasting = JSON.parse(fs.readFileSync(QUALITY_HOURLY_PATH, "utf8")).find_lasting_public;
  } catch {
    lasting = null;
  }

  const weekId = new Date().toISOString().slice(0, 10);
  const digest = {
    weekEnding: weekId,
    since,
    find_public_new: findPublic,
    improve_applied: improveApply,
    improve_recommend_opened: recommendOpened,
    improve_recommend_closed: recommendClosed,
    lasting_public: lasting,
    top_skip_reasons: topSkip,
    lessons_encoded_week: encoded,
    lessons_encoded_sample: recentLessons,
    lessons_open: openLessons.map((l) => l.id),
    operator_feedback: feedback,
    seeds_pending_public: pending,
  };

  const out = path.join(DIGESTS_DIR, `week-${weekId}.json`);
  fs.writeFileSync(out, JSON.stringify(digest, null, 2));
  console.log(JSON.stringify(digest, null, 2));
  console.log("wrote", out);
}

main();
