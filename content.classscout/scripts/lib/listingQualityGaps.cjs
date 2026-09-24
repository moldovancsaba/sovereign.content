/**
 * Deterministic quality-gap audit for one live listing (evidence-only).
 * Shared by recommend-improve (writes records) and improve-cycle (consumes them).
 * Never invents contacts — only names blank / unusable fields Improve can try to fill.
 */
const { hasStreetAddress } = require("./extractOfficialPage.cjs");
const { isWeakListingCopy } = require("./composeListingCopy.cjs");
const { isSoftBelowAboutTarget } = require("./aboutQualityScore.cjs");

/** Closed vocabulary — gap codes on recommendation records. */
const GAP_CODES = Object.freeze([
  "bad_address",
  "weak_description",
  "blank_contacts",
  "blank_email",
  "blank_trial",
  "blank_sessions",
  "blank_price",
  "blank_age",
  "missing_website",
]);

/**
 * Public-quality gaps that open Improve recommendation records.
 * Soft blanks (email/trial/sessions/price/age) stay on oldest-blank Improve rotation only.
 *
 * Contacts priority = missing phone. A phone-only listing is publicly usable; missing email
 * is tracked as soft `blank_email` so Improve still fills it when the page states one,
 * without clogging the recommendation queue on hosts that never publish email.
 */
const PRIORITY_GAP_CODES = Object.freeze(["bad_address", "weak_description", "blank_contacts"]);

/** Lower number = higher Improve priority (quality plan §6 + public address floor). */
const GAP_PRIORITY = Object.freeze({
  bad_address: 10,
  weak_description: 15,
  blank_contacts: 20,
  blank_trial: 30,
  blank_sessions: 40,
  blank_price: 50,
  blank_email: 55,
  blank_age: 60,
  missing_website: 900,
});

const GAP_TO_LANE = Object.freeze({
  bad_address: "address",
  weak_description: "description",
  blank_contacts: "contacts",
  blank_email: "contacts",
  blank_trial: "trial",
  blank_sessions: "sessions",
  blank_price: "price",
  blank_age: "age",
});

function hasPhone(r) {
  return Boolean(
    (r.phone && String(r.phone).trim()) ||
      (r.contactLinks || []).some((l) => l && (l.type === "phone" || /^tel:/i.test(l.url || "")))
  );
}

function hasEmail(r) {
  return Boolean(
    (r.email && String(r.email).trim()) ||
      (r.contactLinks || []).some((l) => l && l.type === "email")
  );
}

function priorityGapsOf(gaps) {
  return (gaps || []).filter((g) => PRIORITY_GAP_CODES.includes(g));
}

/**
 * @param {Record<string, unknown>} row
 * @returns {{
 *   gaps: string[],
 *   priorityGaps: string[],
 *   lanes: string[],
 *   priority: number,
 *   enrichable: boolean,
 *   recommendable: boolean,
 *   hasWebsite: boolean,
 * }}
 */
function listingQualityGaps(row) {
  const gaps = [];
  const website = row && row.website ? String(row.website).trim() : "";
  const hasWebsite = Boolean(website);
  const phoneOk = hasPhone(row);
  const emailOk = hasEmail(row);

  if (!hasStreetAddress((row && row.address) || "")) gaps.push("bad_address");
  {
    const short = (row && row.shortDescription) || "";
    const long = (row && row.longDescription) || "";
    const chromeWeak = isWeakListingCopy(short, long);
    const softBelow = isSoftBelowAboutTarget(short, long, {
      name: row && row.name,
      place: row && (row.borough || row.city),
      chrome: chromeWeak,
    });
    // Chrome / inventory boilerplate OR soft About below SC target (~75).
    if (chromeWeak || softBelow) gaps.push("weak_description");
  }
  // Priority: need a phone. Soft: email when phone already present.
  if (!phoneOk) gaps.push("blank_contacts");
  else if (!emailOk) gaps.push("blank_email");
  if (!row || !row.trialPolicy) gaps.push("blank_trial");
  if (!row || !Array.isArray(row.sessions) || !row.sessions.length) gaps.push("blank_sessions");
  if (!row || !row.price || row.price.evidence === "unknown" || !row.price.evidence) {
    gaps.push("blank_price");
  }
  if (!row || !Array.isArray(row.ageRanges) || !row.ageRanges.length) gaps.push("blank_age");
  if (!hasWebsite) gaps.push("missing_website");

  const priorityGaps = priorityGapsOf(gaps);
  const lanes = [];
  for (const g of gaps) {
    const lane = GAP_TO_LANE[g];
    if (lane && !lanes.includes(lane)) lanes.push(lane);
  }

  let priority = 999;
  for (const g of gaps) {
    const p = GAP_PRIORITY[g];
    if (typeof p === "number" && p < priority) priority = p;
  }

  return {
    gaps,
    priorityGaps,
    lanes,
    priority,
    enrichable: hasWebsite && lanes.length > 0,
    recommendable: hasWebsite && priorityGaps.length > 0,
    hasWebsite,
  };
}

module.exports = {
  GAP_CODES,
  PRIORITY_GAP_CODES,
  GAP_PRIORITY,
  GAP_TO_LANE,
  listingQualityGaps,
  priorityGapsOf,
  hasPhone,
  hasEmail,
};
