/**
 * About quality score (Sovereign Content ABOUT_QUALITY_TARGET = 75).
 *
 * Soft Abouts that clear a length+locality bar without real recommendation tone
 * starve about-curate / quality-loop. Locality name-drop is capped so it alone
 * cannot reach the target.
 *
 * Does not import composeListingCopy (avoids a require cycle). Callers combine
 * this with `isWeakListingCopy` for chrome / inventory boilerplate.
 */
const { publicCopyHasUnsafeChrome } = require("./publicCopyHygiene.cjs");

const ABOUT_QUALITY_TARGET = Math.max(
  50,
  Math.min(95, Number(process.env.CATALOG_ABOUT_QUALITY_TARGET || 75))
);

/** Cap so "… in Brooklyn" cannot push a soft About over the target alone. */
const LOCALITY_BONUS_CAP = 10;

const LOCALITY_RE =
  /\b(?:Brooklyn|Manhattan|Queens|Bronx|Staten Island|Los Angeles|Boston|NYC|New York|Central LA|Westside)\b/i;

/**
 * @param {string} shortDescription
 * @param {string} longDescription
 * @param {{ name?: string, place?: string, chrome?: boolean }} [ctx]
 * @returns {{
 *   score: number,
 *   target: number,
 *   passes: boolean,
 *   parts: Record<string, number>,
 *   soft: boolean,
 *   chrome: boolean,
 * }}
 */
function aboutQualityScore(shortDescription, longDescription, ctx = {}) {
  const short = String(shortDescription || "").trim();
  const long = String(longDescription || "").trim();
  const blob = `${short}\n${long}`.trim();
  const parts = {
    floor: 0,
    lengthLong: 0,
    lengthShort: 0,
    substance: 0,
    localityBonus: 0,
  };

  const chrome =
    ctx.chrome === true ||
    !long ||
    long.length < 40 ||
    !short ||
    short.length < 40 ||
    publicCopyHasUnsafeChrome(blob);

  if (chrome) {
    if (long.length >= 80) parts.lengthLong = 15;
    else if (long.length >= 40) parts.lengthLong = 8;
    const score = Math.min(40, parts.lengthLong + (LOCALITY_RE.test(blob) ? 10 : 0));
    return {
      score,
      target: ABOUT_QUALITY_TARGET,
      passes: false,
      parts,
      soft: false,
      chrome: true,
    };
  }

  parts.floor = 50;

  if (long.length >= 300) parts.lengthLong = 20;
  else if (long.length >= 160) parts.lengthLong = 15;
  else if (long.length >= 100) parts.lengthLong = 10;
  else parts.lengthLong = 5;

  if (short.length >= 100) parts.lengthShort = 10;
  else if (short.length >= 60) parts.lengthShort = 7;
  else parts.lengthShort = 4;

  const sentenceCount = (long.match(/[.!?]+/g) || []).length;
  if (sentenceCount >= 3) parts.substance += 12;
  else if (sentenceCount >= 2) parts.substance += 8;
  else parts.substance += 3;

  const name = String(ctx.name || "").trim();
  if (name.length >= 3) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(esc, "i").test(blob)) parts.substance += 5;
  }
  if (
    /\b(?:class(?:es)?|lesson(?:s)?|program(?:s)?|camp(?:s)?|workshop(?:s)?|session(?:s)?|coach(?:ing)?|studio|school|yoga|swim|soccer|martial)\b/i.test(
      blob
    )
  ) {
    parts.substance += 8;
  }
  parts.substance = Math.min(25, parts.substance);

  if (LOCALITY_RE.test(blob) || (ctx.place && String(ctx.place).trim())) {
    parts.localityBonus = Math.min(LOCALITY_BONUS_CAP, 10);
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      parts.floor + parts.lengthLong + parts.lengthShort + parts.substance + parts.localityBonus
    )
  );
  return {
    score,
    target: ABOUT_QUALITY_TARGET,
    passes: score >= ABOUT_QUALITY_TARGET,
    parts,
    soft: score < ABOUT_QUALITY_TARGET,
    chrome: false,
  };
}

/**
 * Soft-below-target (non-chrome) About — use with isWeakListingCopy for full gate.
 * @param {string} shortDescription
 * @param {string} longDescription
 * @param {{ name?: string, place?: string, chrome?: boolean }} [ctx]
 */
function isSoftBelowAboutTarget(shortDescription, longDescription, ctx) {
  const r = aboutQualityScore(shortDescription, longDescription, ctx);
  return !r.chrome && !r.passes;
}

module.exports = {
  ABOUT_QUALITY_TARGET,
  LOCALITY_BONUS_CAP,
  aboutQualityScore,
  isSoftBelowAboutTarget,
};
