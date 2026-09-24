/**
 * Durable improve-recommendation store (quality self-improvement loop).
 * One record per providerId; exhausted stays closed until cooldown; progress
 * resets attempt counters so Improve does not thrash the same dead ends.
 */
const fs = require("fs");
const { RECOMMENDATIONS_PATH, DATA_DIR, ensureDir } = require("./paths.cjs");
const { PRIORITY_GAP_CODES, priorityGapsOf } = require("./listingQualityGaps.cjs");

const MAX_ATTEMPTS = Math.max(1, Number(process.env.CATALOG_RECOMMEND_MAX_ATTEMPTS || 5));
const RETAIN_CLOSED_MS = 14 * 24 * 60 * 60 * 1000;
/** Do not reopen exhausted rows until this cooldown elapses (default 7 days). */
const EXHAUSTED_COOLDOWN_MS = Math.max(
  60 * 60 * 1000,
  Number(process.env.CATALOG_RECOMMEND_EXHAUSTED_COOLDOWN_MS || 7 * 24 * 60 * 60 * 1000)
);
/** Skip open rows Improve already tried within this window (default 3 hours). */
const RETRY_COOLDOWN_MS = Math.max(
  5 * 60 * 1000,
  Number(process.env.CATALOG_RECOMMEND_RETRY_COOLDOWN_MS || 3 * 60 * 60 * 1000)
);

const PRIORITY_GAPS = PRIORITY_GAP_CODES;
const RESOLVED_CLOSE_REASONS = Object.freeze([
  "resolved",
  "resolved_priority",
  "soft_deferred",
]);

function emptyDoc() {
  return { updatedAt: null, recommendations: [] };
}

function loadRecommendations() {
  try {
    const doc = JSON.parse(fs.readFileSync(RECOMMENDATIONS_PATH, "utf8"));
    if (!doc || !Array.isArray(doc.recommendations)) return emptyDoc();
    return doc;
  } catch {
    return emptyDoc();
  }
}

function saveRecommendations(doc) {
  ensureDir(DATA_DIR);
  doc.updatedAt = new Date().toISOString();
  fs.writeFileSync(RECOMMENDATIONS_PATH, JSON.stringify(doc, null, 2) + "\n");
  return doc;
}

function pruneClosed(doc, nowMs = Date.now()) {
  doc.recommendations = (doc.recommendations || []).filter((r) => {
    if (!r || r.status === "open") return true;
    const closedAt = r.closedAt ? Date.parse(r.closedAt) : 0;
    if (!closedAt) return true;
    return nowMs - closedAt < RETAIN_CLOSED_MS;
  });
  return doc;
}

function openRecommendations(doc = loadRecommendations()) {
  return (doc.recommendations || []).filter((r) => r && r.status === "open");
}

function gapsEqual(a, b) {
  const aa = [...(a || [])].sort();
  const bb = [...(b || [])].sort();
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

function canReopenExhausted(row, nowMs = Date.now()) {
  if (!row || row.status !== "exhausted") return false;
  const closedAt = row.closedAt ? Date.parse(row.closedAt) : 0;
  if (!closedAt) return true;
  return nowMs - closedAt >= EXHAUSTED_COOLDOWN_MS;
}

function isInRetryCooldown(row, nowMs = Date.now()) {
  if (!row || !row.lastAttemptAt) return false;
  const t = Date.parse(row.lastAttemptAt);
  if (!t) return false;
  return nowMs - t < RETRY_COOLDOWN_MS;
}

/**
 * Upsert an open recommendation from an audit gap result.
 * Does not reopen exhausted rows until EXHAUSTED_COOLDOWN_MS (unless forceReopen).
 * Does not reopen resolved/resolved_priority/soft_deferred unless priority gaps return.
 * @returns {{ row: object|null, action: string }}
 */
function upsertOpenRecommendation(doc, input, opts = {}) {
  const now = new Date().toISOString();
  const nowMs = Date.parse(now);
  const providerId = String(input.providerId || "");
  if (!providerId) return { row: null, action: "noop" };
  const id = `rec:${providerId}`;
  let row = (doc.recommendations || []).find((r) => r && r.id === id);
  const nextGaps = [...(input.gaps || [])];
  const nextLanes = [...(input.lanes || [])];
  const nextPriority = typeof input.priority === "number" ? input.priority : 999;
  const nextPriorityGaps = priorityGapsOf(nextGaps);

  if (!row) {
    row = {
      id,
      providerId,
      status: "open",
      gaps: nextGaps,
      lanes: nextLanes,
      priority: nextPriority,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      closeReason: null,
      lastAttemptAt: null,
      source: "audit",
      name: input.name || null,
    };
    doc.recommendations = doc.recommendations || [];
    doc.recommendations.push(row);
    return { row, action: "created" };
  }

  if (row.status === "exhausted" && !opts.forceReopen && !canReopenExhausted(row, nowMs)) {
    row.gaps = nextGaps;
    row.lanes = nextLanes;
    row.priority = nextPriority;
    row.name = input.name || row.name || null;
    row.updatedAt = now;
    return { row, action: "skipped_exhausted" };
  }

  if (
    row.status === "closed" &&
    !opts.forceReopen &&
    RESOLVED_CLOSE_REASONS.includes(row.closeReason || "")
  ) {
    // Soft blanks alone must not reopen a priority resolve.
    if (!nextPriorityGaps.length) {
      row.gaps = nextGaps;
      row.lanes = nextLanes;
      row.priority = nextPriority;
      row.name = input.name || row.name || null;
      row.updatedAt = now;
      return { row, action: "skipped_resolved" };
    }
  }

  const wasOpen = row.status === "open";
  const reopened = row.status !== "open";
  row.status = "open";
  row.gaps = nextGaps;
  row.lanes = nextLanes;
  row.priority = nextPriority;
  row.name = input.name || row.name || null;
  row.updatedAt = now;
  row.closedAt = null;
  row.closeReason = null;
  row.source = row.source || "audit";
  if (reopened) {
    row.attempts = 0;
    row.lastAttemptAt = null;
    return { row, action: "reopened" };
  }
  return { row, action: wasOpen ? "refreshed" : "created" };
}

/**
 * @param {object} doc
 * @param {string} providerId
 * @param {string} closeReason
 */
function closeRecommendation(doc, providerId, closeReason) {
  const id = `rec:${providerId}`;
  const row = (doc.recommendations || []).find((r) => r && r.id === id);
  if (!row || row.status !== "open") return null;
  const now = new Date().toISOString();
  row.status = closeReason === "exhausted" ? "exhausted" : "closed";
  row.closeReason = closeReason || "resolved";
  row.closedAt = now;
  row.updatedAt = now;
  return row;
}

/**
 * After Improve investigates: update gaps, credit progress, close or exhaust.
 * @returns {{ outcome: string, row: object|null, progress: boolean }}
 */
function settleRecommendationAfterAttempt(doc, providerId, nextGaps, nextLanes, nextPriority) {
  const id = `rec:${providerId}`;
  const row = (doc.recommendations || []).find((r) => r && r.id === id && r.status === "open");
  if (!row) return { outcome: null, row: null, progress: false };

  const now = new Date().toISOString();
  const beforeGaps = [...(row.gaps || [])];
  const beforePriority = priorityGapsOf(beforeGaps);
  const afterGaps = [...(nextGaps || [])];
  const afterPriority = priorityGapsOf(afterGaps);
  const progress =
    !gapsEqual(beforeGaps, afterGaps) &&
    (afterGaps.length < beforeGaps.length || afterPriority.length < beforePriority.length);

  row.gaps = afterGaps;
  row.lanes = [...(nextLanes || [])];
  if (typeof nextPriority === "number") row.priority = nextPriority;
  row.updatedAt = now;
  row.lastAttemptAt = now;

  // Fully clear (no enrichable lanes left).
  if (!afterGaps.length || !(nextLanes || []).length) {
    row.status = "closed";
    row.closeReason = "resolved";
    row.closedAt = now;
    row.attempts = (row.attempts || 0) + 1;
    return { outcome: "resolved", row, progress: true };
  }

  // Priority gaps (address / contacts) cleared — count as resolved even if soft blanks remain.
  if (beforePriority.length && afterPriority.length === 0) {
    row.status = "closed";
    row.closeReason = "resolved_priority";
    row.closedAt = now;
    row.attempts = (row.attempts || 0) + 1;
    return { outcome: "resolved_priority", row, progress: true };
  }

  if (progress) {
    // Credit progress: do not burn toward exhaust.
    row.attempts = 0;
    return { outcome: "progress", row, progress: true };
  }

  row.attempts = (row.attempts || 0) + 1;
  if (row.attempts >= MAX_ATTEMPTS) {
    row.status = "exhausted";
    row.closeReason = "exhausted";
    row.closedAt = now;
    return { outcome: "exhausted", row, progress: false };
  }
  return { outcome: "attempted", row, progress: false };
}

/** @deprecated Prefer settleRecommendationAfterAttempt — kept for callers that only bump attempts. */
function markRecommendationAttempted(doc, providerId) {
  const id = `rec:${providerId}`;
  const row = (doc.recommendations || []).find((r) => r && r.id === id && r.status === "open");
  if (!row) return null;
  const now = new Date().toISOString();
  row.attempts = (row.attempts || 0) + 1;
  row.lastAttemptAt = now;
  row.updatedAt = now;
  if (row.attempts >= MAX_ATTEMPTS) {
    row.status = "exhausted";
    row.closeReason = "exhausted";
    row.closedAt = now;
    return "exhausted";
  }
  return "attempted";
}

function recommendationSortKey(a, b) {
  const pa = typeof a.priority === "number" ? a.priority : 999;
  const pb = typeof b.priority === "number" ? b.priority : 999;
  if (pa !== pb) return pa - pb;
  const aa = a.attempts || 0;
  const bb = b.attempts || 0;
  if (aa !== bb) return aa - bb;
  const la = a.lastAttemptAt || "";
  const lb = b.lastAttemptAt || "";
  if (la !== lb) return la < lb ? -1 : 1;
  const ca = a.createdAt || "";
  const cb = b.createdAt || "";
  if (ca !== cb) return ca < cb ? -1 : 1;
  return String(a.providerId || "").localeCompare(String(b.providerId || ""));
}

function eligibleOpenRecommendations(doc = loadRecommendations(), nowMs = Date.now()) {
  return openRecommendations(doc)
    .filter((r) => !isInRetryCooldown(r, nowMs))
    .slice()
    .sort(recommendationSortKey);
}

module.exports = {
  MAX_ATTEMPTS,
  RETAIN_CLOSED_MS,
  EXHAUSTED_COOLDOWN_MS,
  RETRY_COOLDOWN_MS,
  PRIORITY_GAPS,
  RECOMMENDATIONS_PATH,
  loadRecommendations,
  saveRecommendations,
  pruneClosed,
  openRecommendations,
  upsertOpenRecommendation,
  closeRecommendation,
  markRecommendationAttempted,
  settleRecommendationAfterAttempt,
  recommendationSortKey,
  eligibleOpenRecommendations,
  isInRetryCooldown,
  canReopenExhausted,
  gapsEqual,
  priorityGapsOf,
};
