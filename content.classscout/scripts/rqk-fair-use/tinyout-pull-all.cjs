#!/usr/bin/env node
/**
 * One-shot: pull ALL tinyout studio listings into find-seeds.json.
 *
 * 1) Harvest /studios?page=1..N into the fair-use tinyout queue
 * 2) Fetch each studio detail page (polite delay), extract, quality-gate, append seed
 *
 * Env:
 *   TINYOUT_PAGE_DELAY_MS   delay between discovery pages (default 800)
 *   TINYOUT_DETAIL_DELAY_MS delay between studio detail fetches (default 750)
 *   TINYOUT_MAX_PAGES       cap discovery pages (default 30)
 *   TINYOUT_MAX_DETAILS     cap detail fetches (default unlimited)
 *   TINYOUT_DRY_RUN         if "1", harvest URLs only — do not fetch details / write seeds
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

const PAGE_DELAY = Math.max(200, Number(process.env.TINYOUT_PAGE_DELAY_MS || 800));
const DETAIL_DELAY = Math.max(200, Number(process.env.TINYOUT_DETAIL_DELAY_MS || 750));
const MAX_PAGES = Math.max(1, Number(process.env.TINYOUT_MAX_PAGES || 30));
const MAX_DETAILS = process.env.TINYOUT_MAX_DETAILS
  ? Math.max(0, Number(process.env.TINYOUT_MAX_DETAILS))
  : Infinity;
const DRY = process.env.TINYOUT_DRY_RUN === "1";

function discoveryUrl(page) {
  return page <= 1 ? `${tinyout.base}/studios` : `${tinyout.base}/studios?page=${page}`;
}

async function harvestAllStudioUrls(srcState) {
  const all = new Set(srcState.queue || []);
  let emptyStreak = 0;
  let pagesFetched = 0;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = discoveryUrl(page);
    console.error(`tinyout discovery ${page}`, url);
    const res = await fetchPage(url);
    pagesFetched += 1;
    if (res.blocked || res.status >= 400) {
      console.error(JSON.stringify({ ok: false, stage: "discovery", page, status: res.status, blocked: res.blocked }));
      break;
    }
    const urls = tinyout.harvestDetailUrls(res.html);
    let newCount = 0;
    for (const u of urls) {
      if (srcState.done[u]) continue;
      if (!all.has(u)) {
        all.add(u);
        newCount += 1;
      }
    }
    console.error(JSON.stringify({ page, harvested: urls.length, new: newCount, totalUnique: all.size }));
    if (urls.length === 0) {
      emptyStreak += 1;
      if (emptyStreak >= 2) break;
    } else {
      emptyStreak = 0;
    }
    await sleep(PAGE_DELAY);
  }
  srcState.queue = [...all].filter((u) => !srcState.done[u]);
  srcState.discoveryRuns = (srcState.discoveryRuns || 0) + 1;
  srcState.discoveryCursor = pagesFetched;
  return { pagesFetched, queueSize: srcState.queue.length };
}

async function processDetail(url, source, srcState, gate, summary) {
  emitFairUseAttempt({ sourceId: source.id, mode: "provider", url, batch: "tinyout-pull-all" });
  const page = await fetchPage(url);
  const at = new Date().toISOString();
  srcState.lastFetchAt = at;
  if (page.blocked || page.status >= 400) {
    const reasonCode =
      page.status === 404 ? "http_not_found" : page.blocked || page.status === 403 ? "http_blocked" : "fetch_error";
    srcState.done[url] = { at, status: page.status, blocked: page.blocked, error: true, reason: reasonCode, reasonCode };
    srcState.queue = srcState.queue.filter((u) => u !== url);
    emitFairUseReject({ sourceId: source.id, mode: "provider", url, status: page.status, blocked: page.blocked, reason: reasonCode, reasonCode });
    summary.rejects[reasonCode] = (summary.rejects[reasonCode] || 0) + 1;
    return;
  }

  const facts = source.extractFacts(page.html, page.finalUrl || url);
  facts.citationUrl = facts.citationUrl || page.finalUrl || url;

  if (!facts.name || (!facts.website && !facts.address)) {
    srcState.done[url] = { at, status: page.status, error: "extract_failed", reason: "extract_failed", reasonCode: "extract_failed" };
    srcState.queue = srcState.queue.filter((u) => u !== url);
    emitFairUseReject({ sourceId: source.id, mode: "provider", url, reason: "extract_failed" });
    summary.rejects.extract_failed = (summary.rejects.extract_failed || 0) + 1;
    return;
  }

  const quality = isAcceptableLead(facts, source);
  if (!quality.ok) {
    const reasonCode = mapFairUseReason(quality.reason);
    srcState.done[url] = { at, status: page.status, error: "quality_reject", reason: quality.reason, reasonCode };
    srcState.queue = srcState.queue.filter((u) => u !== url);
    emitFairUseReject({ sourceId: source.id, mode: "provider", url, reason: quality.reason });
    summary.rejects[quality.reason] = (summary.rejects[quality.reason] || 0) + 1;
    return;
  }

  const built = buildCitationSeed(facts, source, gate);
  if (!built.seed) {
    const reasonCode = mapFairUseReason(built.rejectReason);
    srcState.done[url] = { at, status: page.status, error: "quality_reject", reason: built.rejectReason, reasonCode };
    srcState.queue = srcState.queue.filter((u) => u !== url);
    emitFairUseReject({ sourceId: source.id, mode: "provider", url, reason: built.rejectReason });
    summary.rejects[built.rejectReason || "extract_failed"] =
      (summary.rejects[built.rejectReason || "extract_failed"] || 0) + 1;
    return;
  }

  const result = appendSeed(built.seed);
  srcState.done[url] = {
    at,
    status: page.status,
    seedId: built.seed.id,
    added: result.added,
    reason: result.reason || null,
    via: "tinyout-pull-all",
  };
  srcState.queue = srcState.queue.filter((u) => u !== url);
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
      batch: "tinyout-pull-all",
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

  const harvest = await harvestAllStudioUrls(srcState);
  saveRootState(root);
  console.error(JSON.stringify({ stage: "harvest_done", ...harvest, dry: DRY }));

  if (DRY) {
    const report = {
      at: new Date().toISOString(),
      sourceId: "tinyout",
      dry: true,
      ...harvest,
      queueSample: srcState.queue.slice(0, 20),
    };
    const outPath = path.join(DATA_DIR, "tinyout-pull-all-report.json");
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const summary = {
    at: new Date().toISOString(),
    sourceId: "tinyout",
    pagesFetched: harvest.pagesFetched,
    queueAtStart: harvest.queueSize,
    attempted: 0,
    added: 0,
    duplicates: 0,
    rejects: {},
    addedIds: [],
  };

  const pending = [...srcState.queue];
  const limit = Math.min(pending.length, MAX_DETAILS);
  for (let i = 0; i < limit; i += 1) {
    const url = pending[i];
    if (srcState.done[url]) continue;
    summary.attempted += 1;
    if (summary.attempted % 25 === 1 || summary.attempted === limit) {
      console.error(
        JSON.stringify({
          progress: `${summary.attempted}/${limit}`,
          added: summary.added,
          duplicates: summary.duplicates,
          rejects: summary.rejects,
        })
      );
    }
    try {
      await processDetail(url, tinyout, srcState, gate, summary);
    } catch (e) {
      const reason = `fetch_error:${String(e && e.message ? e.message : e).slice(0, 120)}`;
      srcState.done[url] = { at: new Date().toISOString(), error: true, reason, reasonCode: "fetch_error" };
      srcState.queue = srcState.queue.filter((u) => u !== url);
      summary.rejects.fetch_error = (summary.rejects.fetch_error || 0) + 1;
      emitFairUseReject({ sourceId: tinyout.id, mode: "provider", url, reason: "fetch_error" });
    }
    if (summary.attempted % 20 === 0) saveRootState(root);
    await sleep(DETAIL_DELAY);
  }

  saveRootState(root);
  summary.queueRemaining = srcState.queue.length;
  summary.leadsAddedTotal = srcState.leadsAdded;
  summary.doneCount = Object.keys(srcState.done || {}).length;

  const outPath = path.join(DATA_DIR, "tinyout-pull-all-report.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, addedIds: summary.addedIds.slice(0, 30), addedIdsTotal: summary.addedIds.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
