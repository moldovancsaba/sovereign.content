#!/usr/bin/env node
/**
 * Fair-use multi-source pass: walk every enabled source and take ONE page each
 * (inbox snapshot, provider detail, or discovery index — same rules as RQK).
 *
 * Never more than one HTTP request per source per pass.
 * Inter-source delay: FAIR_USE_INTER_SOURCE_SEC (default 45).
 */
const {
  loadRootState,
  saveRootState,
  sleep,
  checkRobotsAllowed,
} = require("./lib/common.cjs");
const {
  loadEnabledSources,
  BY_ID,
  sourceCooldownRemainingSec,
} = require("./lib/sources/index.cjs");
const { processOneSource } = require("./lib/processOneSource.cjs");

async function main() {
  const only = process.env.FAIR_USE_ONLY;
  const sources = only ? [BY_ID[only]].filter(Boolean) : loadEnabledSources();
  if (!sources.length) {
    console.log(JSON.stringify({ ok: false, reason: "no_sources" }));
    process.exit(2);
  }

  const interSec = Number(process.env.FAIR_USE_INTER_SOURCE_SEC || 45);
  const root = loadRootState();
  const results = [];
  let skippedCooldown = 0;

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const srcState = root.sources[source.id] || (root.sources[source.id] = { queue: [], done: {} });
    const remaining = sourceCooldownRemainingSec(source, srcState);
    if (remaining > 0 && process.env.FAIR_USE_CHECK_ROBOTS !== "1") {
      skippedCooldown += 1;
      results.push({
        sourceId: source.id,
        ok: true,
        skipped: true,
        reason: "cooldown",
        cooldownSec: source.cooldownSec || null,
        remainingSec: remaining,
      });
      continue;
    }

    if (process.env.FAIR_USE_CHECK_ROBOTS === "1") {
      const robots = await checkRobotsAllowed(source.robotsBase || source.base);
      srcState.lastFetchAt = new Date().toISOString();
      results.push({
        sourceId: source.id,
        mode: "robots_only",
        ok: robots.ok,
        reason: robots.reason || null,
      });
      if (i < sources.length - 1 && interSec > 0) await sleep(interSec * 1000);
      continue;
    }

    try {
      const out = await processOneSource(source, root);
      results.push(out);
    } catch (e) {
      results.push({
        ok: false,
        sourceId: source.id,
        error: String(e && e.message ? e.message : e),
      });
    }
    saveRootState(root);
    if (i < sources.length - 1 && interSec > 0) await sleep(interSec * 1000);
  }

  root.passCount = (root.passCount || 0) + 1;
  root.lastPassAt = new Date().toISOString();
  // Back-compat field for RQK monitors
  if (root.sources.rqk) root.lastRqkFetchAt = root.sources.rqk.lastFetchAt || root.lastRqkFetchAt;
  saveRootState(root);

  const summary = {
    ok: true,
    pass: root.passCount,
    at: root.lastPassAt,
    sources: sources.map((s) => s.id),
    results,
    skippedCooldown,
    leadsAddedThisPass: results.filter((r) => r && r.added).length,
    discoveryThisPass: results.filter((r) => r && r.mode === "discovery" && r.ok).length,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
