/**
 * Process exactly ONE page for a single fair-use source.
 * Priority: inbox snapshot → queued detail URL → discovery page (harvest only).
 */

import { readFileSync, renameSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import {
  DATA_DIR,
  appendCandidate,
  emitEvent,
  ensureDataDir,
  fetchPage,
  getSourceState,
  hostOf,
  inboxFilesForSource,
  type Registry,
  type RootState,
  type SourceMeta,
} from "./common.ts";
import {
  extractGenericFacts,
  harvestByHrefPattern,
  harvestPadelClubLinks,
} from "./extract.ts";
import { isAcceptableLead, isDeadHubUrl, isPromisingDetailUrl } from "./leadQuality.ts";
import { buildCandidate } from "./seedBuilder.ts";

export type ProcessResult = {
  ok: boolean;
  sourceId: string;
  mode?: string;
  url?: string;
  skipped?: boolean;
  reason?: string;
  reasonCode?: string;
  status?: number;
  blocked?: boolean;
  candidateId?: string;
  harvested?: number;
};

function markDone(
  srcState: ReturnType<typeof getSourceState>,
  url: string,
  reasonCode: string,
): void {
  srcState.done[url] = { at: new Date().toISOString(), reasonCode, reason: reasonCode };
  srcState.queue = srcState.queue.filter((u) => u !== url);
}

function enqueueUnique(
  srcState: ReturnType<typeof getSourceState>,
  urls: string[],
): number {
  let n = 0;
  for (const u of urls) {
    if (!u || srcState.done[u] || srcState.queue.includes(u)) continue;
    if (isDeadHubUrl(u) || !isPromisingDetailUrl(u)) continue;
    srcState.queue.push(u);
    n += 1;
  }
  return n;
}

function trySeedFromHtml(
  html: string,
  pageUrl: string,
  source: SourceMeta,
  srcState: ReturnType<typeof getSourceState>,
  mode: string,
): ProcessResult {
  const facts = extractGenericFacts(html, pageUrl, {
    sourceHost: hostOf(source.base),
  });
  const lead = isAcceptableLead(facts);
  if (!lead.ok) {
    markDone(srcState, pageUrl, lead.reason);
    emitEvent({
      type: "fair_use_reject",
      sourceId: source.id,
      mode,
      url: pageUrl,
      reasonCode: lead.reason,
    });
    return {
      ok: true,
      sourceId: source.id,
      mode,
      url: pageUrl,
      reason: lead.reason,
      reasonCode: lead.reason,
    };
  }

  const { candidate, rejectReason } = buildCandidate(facts, source);
  if (!candidate) {
    markDone(srcState, pageUrl, rejectReason || "build_failed");
    emitEvent({
      type: "fair_use_reject",
      sourceId: source.id,
      mode,
      url: pageUrl,
      reasonCode: rejectReason || "build_failed",
    });
    return {
      ok: true,
      sourceId: source.id,
      mode,
      url: pageUrl,
      reason: rejectReason || "build_failed",
      reasonCode: rejectReason || "build_failed",
    };
  }

  const added = appendCandidate(candidate);
  markDone(srcState, pageUrl, added ? "seeded" : "duplicate");
  srcState.leadsAdded = (srcState.leadsAdded || 0) + (added ? 1 : 0);
  emitEvent({
    type: added ? "fair_use_seed" : "fair_use_reject",
    sourceId: source.id,
    mode,
    url: pageUrl,
    candidateId: candidate.candidateId,
    reasonCode: added ? "seeded" : "duplicate",
  });
  return {
    ok: true,
    sourceId: source.id,
    mode,
    url: pageUrl,
    candidateId: added ? candidate.candidateId : undefined,
    reason: added ? "seeded" : "duplicate",
    reasonCode: added ? "seeded" : "duplicate",
  };
}

export async function processOneSource(
  source: SourceMeta,
  root: RootState,
  registry: Registry,
): Promise<ProcessResult> {
  ensureDataDir();
  const srcState = getSourceState(root, source.id, []);
  const ua = registry.userAgent;
  srcState.lastFetchAt = new Date().toISOString();

  // 1) Inbox citation snapshots (CF soft-skip path)
  const inbox = inboxFilesForSource(source.id);
  if (inbox.length) {
    const full = inbox[0]!;
    const html = readFileSync(full, "utf8");
    const metaPath = full.replace(/\.html?$/i, ".json");
    let pageUrl = source.base + "/";
    if (existsSync(metaPath)) {
      try {
        pageUrl = JSON.parse(readFileSync(metaPath, "utf8")).url || pageUrl;
      } catch {
        /* keep default */
      }
    }
    emitEvent({ type: "fair_use_attempt", sourceId: source.id, mode: "inbox", url: pageUrl });
    const out = trySeedFromHtml(html, pageUrl, source, srcState, "inbox");
    const dest = join(DATA_DIR, "processed", `${source.id}-${basename(full)}`);
    try {
      renameSync(full, dest);
    } catch {
      /* ignore */
    }
    return out;
  }

  // 2) Queued detail URL
  while (srcState.queue.length) {
    const url = srcState.queue.shift()!;
    if (srcState.done[url] || isDeadHubUrl(url) || !isPromisingDetailUrl(url)) {
      if (url) markDone(srcState, url, "not_promising_detail");
      continue;
    }
    emitEvent({ type: "fair_use_attempt", sourceId: source.id, mode: "detail", url });
    try {
      const page = await fetchPage(url, ua);
      if (page.blocked || page.status >= 400) {
        const reasonCode =
          page.status === 404
            ? "http_not_found"
            : page.blocked || page.status === 403
              ? "http_blocked"
              : "fetch_error";
        markDone(srcState, url, reasonCode);
        srcState.lastError = { at: new Date().toISOString(), url, reasonCode };
        emitEvent({
          type: "fair_use_reject",
          sourceId: source.id,
          mode: "detail",
          url,
          status: page.status,
          blocked: page.blocked,
          reasonCode,
        });
        return {
          ok: false,
          sourceId: source.id,
          mode: "detail",
          url,
          status: page.status,
          blocked: page.blocked,
          reason: reasonCode,
          reasonCode,
        };
      }
      return trySeedFromHtml(page.html, page.finalUrl || url, source, srcState, "detail");
    } catch (e) {
      const reasonCode = "fetch_error";
      markDone(srcState, url, reasonCode);
      srcState.lastError = {
        at: new Date().toISOString(),
        url,
        reasonCode,
      };
      emitEvent({
        type: "fair_use_reject",
        sourceId: source.id,
        mode: "detail",
        url,
        reasonCode,
        error: String(e instanceof Error ? e.message : e),
      });
      return {
        ok: false,
        sourceId: source.id,
        mode: "detail",
        url,
        reason: reasonCode,
        reasonCode,
      };
    }
  }

  // 3) Discovery page — harvest links into queue (one HTTP), optionally seed if page itself is a club card
  const pages = source.discoveryPages || [];
  if (!pages.length) {
    return { ok: true, sourceId: source.id, skipped: true, reason: "no_discovery_pages" };
  }
  const cursor = srcState.discoveryCursor % pages.length;
  const discoveryUrl = pages[cursor]!;
  srcState.discoveryCursor = cursor + 1;

  emitEvent({
    type: "fair_use_attempt",
    sourceId: source.id,
    mode: "discovery",
    url: discoveryUrl,
  });

  try {
    const page = await fetchPage(discoveryUrl, ua);
    if (page.blocked || page.status >= 400) {
      const reasonCode =
        page.blocked || page.status === 403 ? "http_blocked" : "fetch_error";
      // Soft-skip discovery: do not burn the page forever on CF — retry after cooldown
      srcState.lastError = {
        at: new Date().toISOString(),
        url: discoveryUrl,
        reasonCode,
      };
      emitEvent({
        type: "fair_use_reject",
        sourceId: source.id,
        mode: "discovery",
        url: discoveryUrl,
        status: page.status,
        blocked: page.blocked,
        reasonCode,
      });
      return {
        ok: false,
        sourceId: source.id,
        mode: "discovery",
        url: discoveryUrl,
        status: page.status,
        blocked: page.blocked,
        reason: reasonCode,
        reasonCode,
      };
    }

    const patterns = (source.detailHrefPatterns || []).map((p) => new RegExp(p, "i"));
    const harvested = [
      ...harvestByHrefPattern(page.html, source.base, patterns),
      ...harvestPadelClubLinks(page.html, source.base, hostOf(source.base)),
    ].filter((u) => u !== discoveryUrl);

    const added = enqueueUnique(srcState, harvested);
    // Do not permanently mark discovery URLs done — cursor + cooldown rotate them.

    emitEvent({
      type: "fair_use_attempt",
      sourceId: source.id,
      mode: "discovery_harvest",
      url: discoveryUrl,
      harvested: added,
    });

    return {
      ok: true,
      sourceId: source.id,
      mode: "discovery",
      url: discoveryUrl,
      harvested: added,
      reason: "harvested",
      reasonCode: "harvested",
    };
  } catch (e) {
    const reasonCode = "fetch_error";
    srcState.lastError = {
      at: new Date().toISOString(),
      url: discoveryUrl,
      reasonCode,
    };
    emitEvent({
      type: "fair_use_reject",
      sourceId: source.id,
      mode: "discovery",
      url: discoveryUrl,
      reasonCode,
      error: String(e instanceof Error ? e.message : e),
    });
    return {
      ok: false,
      sourceId: source.id,
      mode: "discovery",
      url: discoveryUrl,
      reason: reasonCode,
      reasonCode,
    };
  }
}
