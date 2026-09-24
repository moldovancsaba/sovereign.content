#!/usr/bin/env node
/**
 * Hourly quality scorecard from the event log (quality plan Phase 1 / §7).
 * Writes scripts/catalog-loop/data/quality-hourly.json and prints JSON.
 */
const fs = require("fs");
const {
  QUALITY_HOURLY_PATH,
  STATE_PATH,
  SEEDS_PATH,
  LESSONS_PATH,
  migrateTmpStateIfNeeded,
} = require("./lib/paths.cjs");
const { readEventsSince, mapSkipReason } = require("./lib/events.cjs");
const {
  loadRecommendations,
  openRecommendations,
} = require("./lib/recommendationStore.cjs");

function hourStartIso(d = new Date()) {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x.toISOString();
}

function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function main() {
  migrateTmpStateIfNeeded();
  const since = process.argv[2] || hourStartIso();
  const events = readEventsSince(since);
  const state = loadJson(STATE_PATH, {});
  const seeds = loadJson(SEEDS_PATH, { seeds: [] }).seeds || [];
  const lessons = loadJson(LESSONS_PATH, { lessons: [] }).lessons || [];

  const skipHist = {};
  let findPublish = 0;
  let findPublicNew = 0;
  let findSmoke200 = 0;
  let findSmokeFail = 0;
  let improveApply = 0;
  let improveReject = 0;
  let improveScan = 0;
  let reclassifyRepair = 0;
  let ingestReject = 0;
  let falsePublishes = 0;
  let lessonsEncoded = 0;
  let operatorFeedback = 0;
  let fairUseAttempt = 0;
  let fairUseReject = 0;
  let fairUseSeed = 0;
  let improveRecommend = 0;
  let improveRecommendClose = 0;
  const fairUseRejectHist = {};
  const recommendCloseHist = {};

  for (const e of events) {
    switch (e.type) {
      case "find_skip": {
        const code = e.reasonCode || mapSkipReason(e.reason);
        skipHist[code] = (skipHist[code] || 0) + 1;
        break;
      }
      case "find_publish":
        findPublish += 1;
        if (e.publicTarget) findPublicNew += 1;
        break;
      case "find_smoke":
        if (e.status === 200) findSmoke200 += 1;
        else {
          findSmokeFail += 1;
          if (e.publicTarget) falsePublishes += 1;
        }
        break;
      case "improve_apply":
        improveApply += 1;
        break;
      case "improve_reject":
        improveReject += 1;
        break;
      case "improve_scan":
        improveScan += 1;
        break;
      case "improve_recommend":
        improveRecommend += 1;
        break;
      case "improve_recommend_close": {
        improveRecommendClose += 1;
        const reason = e.closeReason || "resolved";
        recommendCloseHist[reason] = (recommendCloseHist[reason] || 0) + 1;
        break;
      }
      case "reclassify_repair":
        reclassifyRepair += 1;
        break;
      case "ingest_reject":
        ingestReject += 1;
        break;
      case "lesson_encoded":
      case "seed_paused":
        lessonsEncoded += 1;
        break;
      case "operator_feedback":
        operatorFeedback += 1;
        break;
      case "fair_use_attempt":
        fairUseAttempt += 1;
        break;
      case "fair_use_reject": {
        fairUseReject += 1;
        const code = e.reasonCode || e.reason || "quality_reject";
        fairUseRejectHist[code] = (fairUseRejectHist[code] || 0) + 1;
        break;
      }
      case "fair_use_seed":
        fairUseSeed += 1;
        break;
      default:
        break;
    }
  }

  // Lasting-public: watch statuses on publicTarget finds still 200.
  const attempts = state.findAttempts || {};
  let lastingNum = 0;
  let lastingDen = 0;
  for (const [id, att] of Object.entries(attempts)) {
    if (!att || !att.publicTarget || !att.publishedAt) continue;
    lastingDen += 1;
    const st = att.lastPublicStatus != null ? att.lastPublicStatus : att.publicStatus;
    if (st === 200) lastingNum += 1;
    void id;
  }

  const pendingSeeds = seeds.filter((s) => {
    if (!s || s.paused || s.publicTarget === false) return false;
    const att = attempts[s.id];
    if (att && att.done) return false;
    if (att && att.tries >= 5) return false;
    return true;
  }).length;

  const openLessons = lessons.filter((l) => l.status === "open" || l.status === "planned").length;

  const topSkip = Object.entries(skipHist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => `${code}:${count}`);

  const topFairUseReject = Object.entries(fairUseRejectHist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => `${code}:${count}`);

  const topRecommendClose = Object.entries(recommendCloseHist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => `${code}:${count}`);

  const recDoc = loadRecommendations();
  const recommendOpen = openRecommendations(recDoc).length;

  const scorecard = {
    hour_utc: since,
    at: new Date().toISOString(),
    cycles: state.cycle || 0,
    improve_applied: improveApply,
    improve_rejects: improveReject,
    improve_scans: improveScan,
    improve_recommend_opened: improveRecommend,
    improve_recommend_closed: improveRecommendClose,
    improve_recommend_open: recommendOpen,
    top_recommend_close_reasons: topRecommendClose,
    find_public_new: findPublicNew,
    find_publish_total: findPublish,
    find_lasting_public: `${lastingNum}/${lastingDen}`,
    lasting_public_rate: lastingDen ? lastingNum / lastingDen : null,
    false_publishes: falsePublishes,
    find_smoke_200: findSmoke200,
    find_smoke_fail: findSmokeFail,
    top_skip_reasons: topSkip,
    lessons_encoded: lessonsEncoded,
    lessons_open: openLessons,
    operator_feedback: operatorFeedback,
    reclassify_repairs: reclassifyRepair,
    ingest_rejects: ingestReject,
    ingest_auth_failures: 0,
    loop_up: true,
    seeds_pending: pendingSeeds,
    fair_use_attempt: fairUseAttempt,
    fair_use_reject: fairUseReject,
    fair_use_seed: fairUseSeed,
    fair_use_funnel: `${fairUseAttempt}→${fairUseSeed} seeds / ${fairUseReject} rejects`,
    top_fair_use_reject_reasons: topFairUseReject,
  };

  fs.writeFileSync(QUALITY_HOURLY_PATH, JSON.stringify(scorecard, null, 2));
  console.log(JSON.stringify(scorecard, null, 2));
}

main();
