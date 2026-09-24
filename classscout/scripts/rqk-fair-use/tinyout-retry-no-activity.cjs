#!/usr/bin/env node
/**
 * Retry tinyout studio URLs previously rejected as no_activity_mapped, after the
 * subtitle / activity-hint extract improves. Also rediscovers /studios pages for
 * any studios not yet in done.
 *
 * Env:
 *   TINYOUT_RETRY_DELAY_MS   delay between detail fetches (default 750)
 *   TINYOUT_RETRY_LIMIT      cap retries (default unlimited)
 *   TINYOUT_RETRY_DRY        if "1", report only
 */
require("../_productRoot.cjs").loadProductEnv();
const fs = require("fs");
const path = require("path");
const {
  fetchPage,
  checkRobotsAllowed,
  loadRootState,
  saveRootState,
  getSourceState,
  appendSeed,
  sleep,
  DATA_DIR,
  ensureDir,
} = require("./lib/common.cjs");
const tinyout = require("./lib/sources/tinyout.cjs");
const { buildCitationSeed, ensureGate } = require("./lib/seedBuilder.cjs");
const { isAcceptableLead } = require("./lib/leadQuality.cjs");
const {
  emitFairUseAttempt,
  emitFairUseReject,
  emitFairUseSeed,
  mapFairUseReason,
} = require("./lib/fairUseEvents.cjs");

const DELAY = Math.max(200, Number(process.env.TINYOUT_RETRY_DELAY_MS || 750));
const LIMIT = process.env.TINYOUT_RETRY_LIMIT
  ? Math.max(0, Number(process.env.TINYOUT_RETRY_LIMIT))
  : Infinity;
const DRY = process.env.TINYOUT_RETRY_DRY === "1";
const PAGE_DELAY = Math.max(200, Number(process.env.TINYOUT_PAGE_DELAY_MS || 800));
const MAX_PAGES = Math.max(1, Number(process.env.TINYOUT_MAX_PAGES || 30));

function discoveryUrl(page) {
  return page <= 1 ? `${tinyout.base}/studios` : `${tinyout.base}/studios?page=${page}`;
}

async function harvestNewStudioUrls(srcState) {
  const known = new Set([...Object.keys(srcState.done || {}), ...(srcState.queue || [])]);
  let newCount = 0;
  let emptyStreak = 0;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = discoveryUrl(page);
    console.error(`tinyout rediscovery ${page}`, url);
    const res = await fetchPage(url);
    if (res.blocked || res.status >= 400) break;
    const urls = tinyout.harvestDetailUrls(res.html);
    let pageNew = 0;
    for (const u of urls) {
      if (known.has(u) || srcState.done[u]) continue;
      srcState.queue.push(u);
      known.add(u);
      pageNew += 1;
      newCount += 1;
    }
    console.error(JSON.stringify({ page, harvested: urls.length, new: pageNew }));
    if (urls.length === 0) {
      emptyStreak += 1;
      if (emptyStreak >= 2) break;
    } else emptyStreak = 0;
    await sleep(PAGE_DELAY);
  }
  srcState.queue = [...new Set(srcState.queue || [])].filter((u) => !srcState.done[u]);
  return newCount;
}

async function processDetail(url, source, srcState, gate, summary) {
  emitFairUseAttempt({ sourceId: source.id, mode: "provider", url, batch: "tinyout-retry-no-activity" });
  const page = await fetchPage(url);
  const at = new Date().toISOString();
  srcState.lastFetchAt = at;
  if (page.blocked || page.status >= 400) {
    const reasonCode =
      page.status === 404 ? "http_not_found" : page.blocked || page.status === 403 ? "http_blocked" : "fetch_error";
    srcState.done[url] = { at, status: page.status, blocked: page.blocked, error: true, reason: reasonCode, reasonCode, via: "tinyout-retry" };
    srcState.queue = (srcState.queue || []).filter((u) => u !== url);
    emitFairUseReject({ sourceId: source.id, mode: "provider", url, status: page.status, reason: reasonCode, reasonCode });
    summary.rejects[reasonCode] = (summary.rejects[reasonCode] || 0) + 1;
    return;
  }

  const facts = source.extractFacts(page.html, page.finalUrl || url);
  facts.citationUrl = facts.citationUrl || page.finalUrl || url;

  if (!facts.name || (!facts.website && !facts.address)) {
    srcState.done[url] = { at, status: page.status, error: "extract_failed", reason: "extract_failed", reasonCode: "extract_failed", via: "tinyout-retry" };
    srcState.queue = (srcState.queue || []).filter((u) => u !== url);
    emitFairUseReject({ sourceId: source.id, mode: "provider", url, reason: "extract_failed" });
    summary.rejects.extract_failed = (summary.rejects.extract_failed || 0) + 1;
    return;
  }

  const quality = isAcceptableLead(facts, source);
  if (!quality.ok) {
    const reasonCode = mapFairUseReason(quality.reason);
    srcState.done[url] = { at, status: page.status, error: "quality_reject", reason: quality.reason, reasonCode, via: "tinyout-retry" };
    srcState.queue = (srcState.queue || []).filter((u) => u !== url);
    emitFairUseReject({ sourceId: source.id, mode: "provider", url, reason: quality.reason });
    summary.rejects[quality.reason] = (summary.rejects[quality.reason] || 0) + 1;
    return;
  }

  const built = buildCitationSeed(facts, source, gate);
  if (!built.seed) {
    const reasonCode = mapFairUseReason(built.rejectReason);
    srcState.done[url] = { at, status: page.status, error: "quality_reject", reason: built.rejectReason, reasonCode, via: "tinyout-retry" };
    srcState.queue = (srcState.queue || []).filter((u) => u !== url);
    emitFairUseReject({ sourceId: source.id, mode: "provider", url, reason: built.rejectReason });
    summary.rejects[built.rejectReason || "extract_failed"] =
      (summary.rejects[built.rejectReason || "extract_failed"] || 0) + 1;
    return;
  }

  if (DRY) {
    summary.wouldAdd += 1;
    summary.wouldAddIds.push(built.seed.id);
    srcState.queue = (srcState.queue || []).filter((u) => u !== url);
    // Leave done unset in dry mode so a live run can still process.
    return;
  }

  const result = appendSeed(built.seed);
  srcState.done[url] = {
    at,
    status: page.status,
    seedId: built.seed.id,
    added: result.added,
    reason: result.reason || null,
    via: "tinyout-retry-no-activity",
  };
  srcState.queue = (srcState.queue || []).filter((u) => u !== url);
  if (result.added) {
    srcState.leadsAdded = (srcState.leadsAdded || 0) + 1;
    summary.added += 1;
    summary.addedIds.push(built.seed.id);
    emitFairUseSeed({
      sourceId: source.id,
      mode: "provider",
      url,
      seedId: built.seed.id,
      publicTarget: built.seed.publicTarget,
      inventoryOnly: built.seed.inventoryOnly,
      activityTypes: built.seed.activityTypes,
      batch: "tinyout-retry-no-activity",
    });
  } else {
    summary.duplicates += 1;
    summary.rejects.duplicate_seed = (summary.rejects.duplicate_seed || 0) + 1;
    emitFairUseReject({
      sourceId: source.id,
      mode: "provider",
      url,
      seedId: built.seed.id,
      reason: result.reason || "duplicate_seed",
    });
  }
}

async function main() {
  ensureDir();
  const robots = await checkRobotsAllowed(tinyout.robotsBase || tinyout.base);
  if (!robots.ok) {
    console.error(JSON.stringify({ ok: false, reason: "robots_blocked", detail: robots.reason }));
    process.exit(2);
  }

  const root = loadRootState();
  const srcState = getSourceState(root, tinyout.id, tinyout.bootstrapQueue || []);
  const gate = await ensureGate();

  // Re-open prior no_activity_mapped rejects for retry.
  const requeued = [];
  for (const [url, entry] of Object.entries(srcState.done || {})) {
    if (!entry) continue;
    const reason = entry.reason || entry.reasonCode || "";
    if (reason === "no_activity_mapped") {
      delete srcState.done[url];
      requeued.push(url);
    }
  }
  srcState.queue = [...new Set([...(srcState.queue || []), ...requeued])];
  console.error(JSON.stringify({ stage: "requeue_no_activity", count: requeued.length }));

  const discovered = await harvestNewStudioUrls(srcState);
  saveRootState(root);
  console.error(JSON.stringify({ stage: "rediscovery_done", newStudios: discovered, queue: srcState.queue.length }));

  const summary = {
    at: new Date().toISOString(),
    sourceId: "tinyout",
    dry: DRY,
    requeued: requeued.length,
    discovered,
    attempted: 0,
    added: 0,
    wouldAdd: 0,
    duplicates: 0,
    rejects: {},
    addedIds: [],
    wouldAddIds: [],
  };

  let n = 0;
  while (srcState.queue.length && n < LIMIT) {
    const url = srcState.queue[0];
    n += 1;
    summary.attempted += 1;
    console.error(`tinyout retry ${n}/${Math.min(LIMIT, srcState.queue.length + n - 1)}`, url);
    await processDetail(url, tinyout, srcState, gate, summary);
    saveRootState(root);
    await sleep(DELAY);
  }

  const outPath = path.join(DATA_DIR, "tinyout-retry-no-activity-report.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  if (summary.addedIds.length > 40) {
    summary.addedIdsSample = summary.addedIds.slice(0, 40);
    delete summary.addedIds;
  }
  if (summary.wouldAddIds.length > 40) {
    summary.wouldAddIdsSample = summary.wouldAddIds.slice(0, 40);
    delete summary.wouldAddIds;
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err && err.stack ? err.stack : err) }));
  process.exit(1);
});
