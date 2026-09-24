/**
 * Process exactly ONE page for a single fair-use source (inbox → provider → discovery).
 */
const fs = require("fs");
const path = require("path");
const {
  DATA_DIR,
  ensureDir,
  fetchPage,
  getSourceState,
  appendSeed,
  inboxFilesForSource,
  writeLastLead,
} = require("./common.cjs");
const { buildCitationSeed, ensureGate } = require("./seedBuilder.cjs");
const { isAcceptableLead, hostOf } = require("./leadQuality.cjs");
const { isDeadHubUrl } = require("./deadHubPatterns.cjs");
const {
  emitFairUseAttempt,
  emitFairUseReject,
  emitFairUseSeed,
  mapFairUseReason,
} = require("./fairUseEvents.cjs");
const {
  loadBriefFromDisk,
  orderDiscoveryPagesByBrief,
} = require("../../lib/scarcityResearchBrief.cjs");
const { SCARCITY_BRIEF_PATH } = require("../../lib/paths.cjs");

function recordHttpFailure(srcState, url, page, sourceId, mode) {
  const at = new Date().toISOString();
  const reasonCode =
    page.status === 404 ? "http_not_found" : page.blocked || page.status === 403 ? "http_blocked" : "fetch_error";
  srcState.done[url] = {
    at,
    status: page.status,
    blocked: page.blocked,
    error: true,
    reason: reasonCode,
    reasonCode,
  };
  srcState.queue = srcState.queue.filter((u) => u !== url);
  srcState.lastError = { at, url, status: page.status, blocked: page.blocked, reasonCode };
  emitFairUseReject({
    sourceId,
    mode,
    url,
    status: page.status,
    blocked: page.blocked,
    reason: reasonCode,
    reasonCode,
  });
  return {
    ok: false,
    sourceId,
    mode,
    url,
    status: page.status,
    blocked: page.blocked,
    reason: reasonCode,
    reasonCode,
  };
}

async function processOneSource(source, rootState) {
  ensureDir();
  fs.mkdirSync(path.join(DATA_DIR, "processed"), { recursive: true });
  const srcState = getSourceState(rootState, source.id, source.bootstrapQueue || []);
  const gate = await ensureGate();

  // Inbox snapshots (citation-path) — one file = one lead for this source.
  const inbox = inboxFilesForSource(source.id);
  if (inbox.length) {
    const full = inbox[0];
    const html = fs.readFileSync(full, "utf8");
    const metaPath = full.replace(/\.html?$/i, ".json");
    let pageUrl = source.base + "/";
    if (fs.existsSync(metaPath)) {
      try {
        pageUrl = JSON.parse(fs.readFileSync(metaPath, "utf8")).url || pageUrl;
      } catch {
        /* ignore */
      }
    } else {
      const m = html.match(/canonical[^>]+href=["']([^"']+)/i);
      if (m) pageUrl = m[1];
    }
    emitFairUseAttempt({ sourceId: source.id, mode: "inbox", url: pageUrl });
    const facts = source.extractFacts(html, pageUrl);
    facts.citationUrl = facts.citationUrl || pageUrl;
    const quality = isAcceptableLead(facts, source);
    if (!quality.ok) {
      const at = new Date().toISOString();
      srcState.lastFetchAt = at;
      if (pageUrl) {
        srcState.done[pageUrl] = {
          at,
          error: "quality_reject",
          reason: quality.reason,
          reasonCode: mapFairUseReason(quality.reason),
          via: "inbox_snapshot",
        };
        srcState.queue = srcState.queue.filter((u) => u !== pageUrl);
      }
      emitFairUseReject({
        sourceId: source.id,
        mode: "inbox",
        url: pageUrl,
        reason: quality.reason,
      });
      const dest = path.join(DATA_DIR, "processed", `${Date.now()}-${source.id}-${path.basename(full)}`);
      fs.renameSync(full, dest);
      if (fs.existsSync(metaPath)) {
        fs.renameSync(metaPath, dest.replace(/\.html?$/i, ".json"));
      }
      return {
        ok: false,
        sourceId: source.id,
        mode: "inbox",
        pageUrl,
        reason: quality.reason,
        reasonCode: mapFairUseReason(quality.reason),
      };
    }
    const built = buildCitationSeed(facts, source, gate);
    if (!built.seed) {
      emitFairUseReject({
        sourceId: source.id,
        mode: "inbox",
        url: pageUrl,
        reason: built.rejectReason || "extract_failed",
      });
      const dest = path.join(DATA_DIR, "processed", `${Date.now()}-${source.id}-${path.basename(full)}`);
      fs.renameSync(full, dest);
      if (fs.existsSync(metaPath)) fs.renameSync(metaPath, dest.replace(/\.html?$/i, ".json"));
      return {
        ok: false,
        sourceId: source.id,
        mode: "inbox",
        pageUrl,
        reason: built.rejectReason || "extract_failed",
      };
    }
    const seed = built.seed;
    const result = facts.name ? appendSeed(seed) : { added: false, reason: "extract_failed" };
    const at = new Date().toISOString();
    srcState.lastFetchAt = at;
    if (pageUrl) {
      srcState.done[pageUrl] = {
        at,
        seedId: seed.id,
        added: result.added,
        reason: result.reason || null,
        via: "inbox_snapshot",
      };
      srcState.queue = srcState.queue.filter((u) => u !== pageUrl);
    }
    if (result.added) {
      srcState.leadsAdded = (srcState.leadsAdded || 0) + 1;
      emitFairUseSeed({
        sourceId: source.id,
        mode: "inbox",
        url: pageUrl,
        seedId: seed.id,
        publicTarget: seed.publicTarget,
        inventoryOnly: seed.inventoryOnly,
        activityTypes: seed.activityTypes,
      });
    } else {
      emitFairUseReject({
        sourceId: source.id,
        mode: "inbox",
        url: pageUrl,
        seedId: seed.id,
        reason: result.reason || "duplicate_seed",
      });
    }
    const dest = path.join(DATA_DIR, "processed", `${Date.now()}-${source.id}-${path.basename(full)}`);
    fs.renameSync(full, dest);
    if (fs.existsSync(metaPath)) {
      fs.renameSync(metaPath, dest.replace(/\.html?$/i, ".json"));
    }
    const out = {
      ok: Boolean(result.added || result.reason === "duplicate_seed"),
      sourceId: source.id,
      mode: "inbox",
      pageUrl,
      seedId: seed.id,
      added: result.added,
      reason: result.reason || null,
      leadsAddedTotal: srcState.leadsAdded,
      queueRemaining: srcState.queue.length,
    };
    writeLastLead({ at, ...out, facts, seed, result });
    return out;
  }

  // Drop known-dead hub URLs from the front of the queue without fetching.
  while ((srcState.queue || []).length) {
    const head = srcState.queue[0];
    if (!isDeadHubUrl(head, source.id)) break;
    const at = new Date().toISOString();
    srcState.done[head] = { at, error: true, reason: "dead_hub_url", reasonCode: "dead_hub_url" };
    srcState.queue.shift();
    emitFairUseReject({
      sourceId: source.id,
      mode: "provider",
      url: head,
      reason: "dead_hub_url",
      reasonCode: "dead_hub_url",
    });
  }

  const pending = (srcState.queue || []).filter((u) => !srcState.done[u]);
  if (pending.length) {
    const url = pending[0];
    console.error(`${source.id} provider`, url);
    emitFairUseAttempt({ sourceId: source.id, mode: "provider", url });
    let page = await fetchPage(url);
    if (typeof source.prepareDiscoveryBody === "function") {
      page = await source.prepareDiscoveryBody(page);
    }
    const at = new Date().toISOString();
    srcState.lastFetchAt = at;
    if (page.blocked || page.status >= 400) {
      return recordHttpFailure(srcState, url, page, source.id, "provider");
    }

    const facts = source.extractFacts(page.html, page.finalUrl || url);
    facts.citationUrl = facts.citationUrl || page.finalUrl || url;
    if (typeof source.expandDetailQueue === "function") {
      const more = source.expandDetailQueue(page.html, page.finalUrl || url) || [];
      let enqueued = 0;
      for (const u of more) {
        if (srcState.done[u] || srcState.queue.includes(u)) continue;
        if (isDeadHubUrl(u, source.id)) continue;
        srcState.queue.push(u);
        enqueued += 1;
      }
      if (facts._skipSeed || enqueued > 0) {
        srcState.done[url] = { at, status: page.status, via: "expand_detail", enqueued };
        srcState.queue = srcState.queue.filter((u) => u !== url);
        return {
          ok: true,
          sourceId: source.id,
          mode: "expand",
          url,
          enqueued,
          queueRemaining: srcState.queue.length,
          note: "Detail page expanded into venue/provider queue; no seed this cycle.",
        };
      }
    }
    if (facts._skipSeed) {
      srcState.done[url] = { at, status: page.status, error: "skip_seed", reason: "skip_seed" };
      srcState.queue = srcState.queue.filter((u) => u !== url);
      emitFairUseReject({ sourceId: source.id, mode: "provider", url, reason: "extract_failed" });
      return { ok: false, sourceId: source.id, mode: "provider", url, reason: "skip_seed" };
    }
    if (!facts.name || (!facts.website && !facts.address)) {
      srcState.done[url] = {
        at,
        status: page.status,
        error: "extract_failed",
        reason: "extract_failed",
        reasonCode: "extract_failed",
      };
      srcState.queue = srcState.queue.filter((u) => u !== url);
      emitFairUseReject({ sourceId: source.id, mode: "provider", url, reason: "extract_failed" });
      return {
        ok: false,
        sourceId: source.id,
        mode: "provider",
        url,
        reason: "extract_failed",
        facts,
      };
    }

    const quality = isAcceptableLead(facts, source);
    if (!quality.ok) {
      srcState.done[url] = {
        at,
        status: page.status,
        error: "quality_reject",
        reason: quality.reason,
        reasonCode: mapFairUseReason(quality.reason),
      };
      srcState.queue = srcState.queue.filter((u) => u !== url);
      emitFairUseReject({
        sourceId: source.id,
        mode: "provider",
        url,
        reason: quality.reason,
      });
      return {
        ok: false,
        sourceId: source.id,
        mode: "provider",
        url,
        reason: quality.reason,
        reasonCode: mapFairUseReason(quality.reason),
        facts,
      };
    }

    const built = buildCitationSeed(facts, source, gate);
    if (!built.seed) {
      srcState.done[url] = {
        at,
        status: page.status,
        error: "quality_reject",
        reason: built.rejectReason,
        reasonCode: mapFairUseReason(built.rejectReason),
      };
      srcState.queue = srcState.queue.filter((u) => u !== url);
      emitFairUseReject({
        sourceId: source.id,
        mode: "provider",
        url,
        reason: built.rejectReason || "no_activity_mapped",
      });
      return {
        ok: false,
        sourceId: source.id,
        mode: "provider",
        url,
        reason: built.rejectReason,
      };
    }
    const seed = built.seed;
    const result = appendSeed(seed);
    srcState.done[url] = {
      at,
      status: page.status,
      seedId: seed.id,
      added: result.added,
      reason: result.reason || null,
    };
    srcState.queue = srcState.queue.filter((u) => u !== url);
    if (result.added) {
      srcState.leadsAdded = (srcState.leadsAdded || 0) + 1;
      emitFairUseSeed({
        sourceId: source.id,
        mode: "provider",
        url,
        seedId: seed.id,
        publicTarget: seed.publicTarget,
        inventoryOnly: seed.inventoryOnly,
        activityTypes: seed.activityTypes,
      });
    } else {
      emitFairUseReject({
        sourceId: source.id,
        mode: "provider",
        url,
        seedId: seed.id,
        reason: result.reason || "duplicate_seed",
      });
    }
    const out = {
      ok: true,
      sourceId: source.id,
      mode: "provider",
      url,
      seedId: seed.id,
      added: result.added,
      officialWebsite: seed.website,
      inventoryOnly: seed.inventoryOnly,
      leadsAddedTotal: srcState.leadsAdded,
      queueRemaining: srcState.queue.length,
    };
    writeLastLead({ at, ...out, facts, seed, result });
    return out;
  }

  // Discovery — one index/sitemap page only. Prefer pages matching the hourly
  // scarcity brief (thin neighborhoods / scarce sports) when present.
  const brief = loadBriefFromDisk(fs, SCARCITY_BRIEF_PATH);
  const pages = orderDiscoveryPagesByBrief(source.discoveryPages || [], brief);
  if (!pages.length) {
    return { ok: false, sourceId: source.id, mode: "discovery", reason: "no_discovery_pages" };
  }
  const idx = Number(srcState.discoveryCursor || 0) % pages.length;
  const discUrl = pages[idx];
  console.error(`${source.id} discovery`, discUrl, brief ? `(brief ${brief.hourUtc})` : "(no brief)");
  emitFairUseAttempt({ sourceId: source.id, mode: "discovery", url: discUrl });
  let page = await fetchPage(discUrl);
  if (typeof source.prepareDiscoveryBody === "function") {
    page = await source.prepareDiscoveryBody(page);
  }
  const at = new Date().toISOString();
  srcState.lastFetchAt = at;
  srcState.discoveryCursor = idx + 1;
  srcState.discoveryRuns = (srcState.discoveryRuns || 0) + 1;

  if (page.blocked || page.status >= 400) {
    const reasonCode =
      page.status === 404 ? "http_not_found" : page.blocked || page.status === 403 ? "http_blocked" : "fetch_error";
    srcState.lastError = { at, url: discUrl, status: page.status, blocked: page.blocked, reasonCode };
    emitFairUseReject({
      sourceId: source.id,
      mode: "discovery",
      url: discUrl,
      status: page.status,
      blocked: page.blocked,
      reason: reasonCode,
      reasonCode,
    });
    return {
      ok: false,
      sourceId: source.id,
      mode: "discovery",
      url: discUrl,
      status: page.status,
      blocked: page.blocked,
      reason: reasonCode,
    };
  }

  const found = source.harvestDetailUrls(page.html, page.finalUrl || discUrl) || [];
  let enqueued = 0;
  for (const u of found) {
    if (srcState.done[u]) continue;
    if (srcState.queue.includes(u)) continue;
    if (isDeadHubUrl(u, source.id)) continue;
    if (u.replace(/\/$/, "") === discUrl.replace(/\/$/, "")) continue;
    if (u.replace(/\/$/, "") === String(page.finalUrl || "").replace(/\/$/, "")) continue;
    try {
      const h = hostOf(u);
      const srcH = hostOf(source.base);
      if (h && srcH && h !== srcH && !h.endsWith("." + srcH) && !srcH.endsWith("." + h)) {
        if (!/activityhero\.com$/i.test(h)) continue;
      }
    } catch {
      continue;
    }
    if (source.isDetailUrl && !source.isDetailUrl(u)) continue;
    srcState.queue.push(u);
    enqueued += 1;
  }

  return {
    ok: true,
    sourceId: source.id,
    mode: "discovery",
    url: discUrl,
    harvested: found.length,
    enqueued,
    queueRemaining: srcState.queue.length,
    note: "No provider seed this cycle for this source — next pass processes one lead.",
  };
}

module.exports = { processOneSource };
