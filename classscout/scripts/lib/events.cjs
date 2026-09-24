/**
 * JSONL event log for the catalog find+improve loop (quality plan Phase 1).
 * Closed event types + skip reason codes — extend only with a lesson entry.
 */
const fs = require("fs");
const { EVENTS_PATH, ensureDir, DATA_DIR } = require("./paths.cjs");

/** Closed vocabulary — find skips. */
const FIND_SKIP_CODES = Object.freeze([
  "http_blocked",
  "http_not_found",
  "no_street_address",
  "no_image",
  "duplicate_existing",
  "activity_not_public",
  "region_not_public",
  // No registered city owns the seed's region — a data-quality stop (unknown filing city), rule 441.
  "region_unknown",
  "paused_seed",
  "fetch_error",
  "ingest_reject",
  "smoke_not_public",
  "no_activity_mapped",
]);

/** Closed vocabulary — operator feedback tags. */
const FEEDBACK_TAGS = Object.freeze([
  "wrong_address",
  "wrong_phone",
  "not_public_worthy",
  "reclassified",
  "good_example",
  "seed_url_bad",
  "duplicate",
]);

const EVENT_TYPES = Object.freeze([
  "find_attempt",
  "find_skip",
  "find_publish",
  "find_smoke",
  "find_image_fallback",
  "improve_scan",
  "improve_reject",
  "improve_apply",
  "reclassify_repair",
  "ingest_reject",
  "operator_feedback",
  "lesson_encoded",
  "seed_paused",
  "fair_use_attempt",
  "fair_use_reject",
  "fair_use_seed",
  "scarcity_research_brief",
  "find_deep_enrich",
  "find_revive_false_duplicate",
  "find_deferred_self_heal",
  "find_until_attempt",
  "contact_enrich_applied",
  "contact_enrich_no_evidence",
  "improve_recommend",
  "improve_recommend_close",
]);

/**
 * Map freeform / legacy skip strings to a stable reason code.
 * @param {string} reason
 * @returns {string}
 */
function mapSkipReason(reason) {
  const r = String(reason || "");
  if (/duplicate[_\s-]*source[_\s-]*url/i.test(r)) return "duplicate_existing";
  if (/^exists:|^duplicate/i.test(r)) return "duplicate_existing";
  if (/paused/i.test(r)) return "paused_seed";
  if (/smoke_not|publicStatus.*404/i.test(r)) return "smoke_not_public";
  if (/http_404|not_found/i.test(r) && !/or_blocked/i.test(r) && !/smoke/i.test(r)) return "http_not_found";
  if (/http_403|blocked|cf-browser|challenge|http_\d+_or_blocked/i.test(r)) return "http_blocked";
  if (/no_street|address_unusable|no_address/i.test(r)) return "no_street_address";
  if (/no_image|image:/i.test(r)) return "no_image";
  if (/region_unknown/i.test(r)) return "region_unknown";
  if (/not_nyc|region_not/i.test(r)) return "region_not_public";
  if (/activity_not|music.*enabled|not_public_activity/i.test(r)) return "activity_not_public";
  if (/^ingest:|ingest_reject|scraped page chrome|without URLs/i.test(r)) return "ingest_reject";
  if (/no_activity|activity_unmapped|activity_not_mapped/i.test(r)) return "no_activity_mapped";
  if (/^fetch:|fetch_error|AbortError|timeout/i.test(r)) return "fetch_error";
  return "fetch_error";
}

/**
 * Append one structured event. Never throws (ops path must not die on log I/O).
 * @param {string} type
 * @param {Record<string, unknown>} payload
 */
function appendEvent(type, payload = {}) {
  try {
    ensureDir(DATA_DIR);
    const row = {
      at: new Date().toISOString(),
      type,
      ...payload,
    };
    fs.appendFileSync(EVENTS_PATH, `${JSON.stringify(row)}\n`);
  } catch (e) {
    console.error("catalog-loop event append failed", String(e && e.message ? e.message : e));
  }
}

/**
 * Read events since ISO timestamp (or all if null). Bounded read for large files.
 * @param {string|null} sinceIso
 * @param {number} maxLines
 */
function readEventsSince(sinceIso, maxLines = 50_000) {
  try {
    if (!fs.existsSync(EVENTS_PATH)) return [];
    const raw = fs.readFileSync(EVENTS_PATH, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const slice = lines.length > maxLines ? lines.slice(-maxLines) : lines;
    const sinceMs = sinceIso ? Date.parse(sinceIso) : 0;
    const out = [];
    for (const line of slice) {
      try {
        const row = JSON.parse(line);
        if (!sinceMs || (row.at && Date.parse(row.at) >= sinceMs)) out.push(row);
      } catch {
        /* skip bad line */
      }
    }
    return out;
  } catch {
    return [];
  }
}

module.exports = {
  FIND_SKIP_CODES,
  FEEDBACK_TAGS,
  EVENT_TYPES,
  mapSkipReason,
  appendEvent,
  readEventsSince,
  EVENTS_PATH,
};
