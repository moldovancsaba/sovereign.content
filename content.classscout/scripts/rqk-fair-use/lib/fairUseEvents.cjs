/**
 * Fair-use → shared catalog-loop event bridge.
 * Fair-use used to write only into rqk-fair-use/state.json, so quality rollup / Tier A / digests
 * never saw discovery failures. Every attempt/reject/seed now lands in events.jsonl.
 */
const { appendEvent } = require("../../lib/events.cjs");

/** Closed vocabulary — fair-use reject / skip reasons. */
const FAIR_USE_REASON_CODES = Object.freeze([
  "bad_name",
  "brand_or_chrome_name",
  "source_brand_name",
  "address_as_name",
  "guide_or_hub_name",
  "one_off_event",
  "out_of_market",
  "junk_website",
  "no_official_or_address",
  "no_activity_mapped",
  "http_blocked",
  "http_not_found",
  "fetch_error",
  "extract_failed",
  "quality_reject",
  "duplicate_seed",
  "dead_hub_url",
]);

/**
 * @param {string} reason
 */
function mapFairUseReason(reason) {
  const r = String(reason || "");
  if (FAIR_USE_REASON_CODES.includes(r)) return r;
  if (/guide|hub|directory|things to do/i.test(r)) return "guide_or_hub_name";
  if (/event|festival|faire|fest\b/i.test(r)) return "one_off_event";
  if (/official|address/i.test(r)) return "no_official_or_address";
  if (/404|not_found/i.test(r)) return "http_not_found";
  if (/403|blocked|challenge/i.test(r)) return "http_blocked";
  if (/activity/i.test(r)) return "no_activity_mapped";
  if (/duplicate/i.test(r)) return "duplicate_seed";
  if (/junk|wa\.me|mailto/i.test(r)) return "junk_website";
  if (/los angeles|out.of.market|non.?nyc/i.test(r)) return "out_of_market";
  return "quality_reject";
}

function emitFairUseAttempt(payload) {
  appendEvent("fair_use_attempt", payload);
}

function emitFairUseReject(payload) {
  const reason = payload.reason || payload.error || "quality_reject";
  appendEvent("fair_use_reject", {
    ...payload,
    reason,
    reasonCode: payload.reasonCode || mapFairUseReason(reason),
  });
}

function emitFairUseSeed(payload) {
  appendEvent("fair_use_seed", payload);
}

module.exports = {
  FAIR_USE_REASON_CODES,
  mapFairUseReason,
  emitFairUseAttempt,
  emitFairUseReject,
  emitFairUseSeed,
};
