/**
 * Find seed ranking + terminal-skip retirement helpers.
 * Prefer street-ready / fair-use / OSM-style seeds over address-less Drive harvest.
 */
const HARD_TERMINAL_FIND_SKIP_CODES = Object.freeze([
  "no_street_address",
  "http_not_found",
  "http_blocked",
  "duplicate_existing",
  "no_activity_mapped",
  "region_unknown",
]);

/** Soft terminal: retire only after repeated tries (flaky hosts). */
const SOFT_TERMINAL_FIND_SKIP_CODES = Object.freeze(["fetch_error"]);

const TERMINAL_FIND_SKIP_CODES = Object.freeze([
  ...HARD_TERMINAL_FIND_SKIP_CODES,
  ...SOFT_TERMINAL_FIND_SKIP_CODES,
]);

function looksLikeStreetAddress(address) {
  const addr = String(address || "").trim();
  if (!addr) return false;
  return (
    /^\d{1,5}\s+\S+/.test(addr) &&
    /\b(Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Place|Pl\.?|Way|Broadway|Parkway|Pkwy\.?|Plaza|Bowery|Court|Ct\.?|Terrace|Ter\.?)\b/i.test(
      addr
    ) &&
    !/\b(year|years|month|months|old|players?|students?)\b/i.test(addr)
  );
}

function seedFamily(id) {
  const s = String(id || "");
  if (s.startsWith("prov-drive-sheets")) return "drive";
  if (s.startsWith("prov-beyond") || s.startsWith("prov-rqk") || s.startsWith("prov-classcub")) {
    return "fair_use";
  }
  // Multi-city system-region seeds (rule 443 / LA+BOS open Find).
  if (s.startsWith("prov-la-") || s.startsWith("prov-bos-")) return "multi_city";
  if (s.startsWith("prov-tinyout")) return "tinyout";
  return "other";
}

function shouldRetireFindAttempt(attempt, reasonCode) {
  const code = reasonCode || (attempt && attempt.lastReasonCode) || "";
  const tries = attempt && typeof attempt.tries === "number" ? attempt.tries : 0;
  if (HARD_TERMINAL_FIND_SKIP_CODES.includes(code)) return true;
  if (SOFT_TERMINAL_FIND_SKIP_CODES.includes(code) && tries >= 3) return true;
  return false;
}

function isTerminalFindAttempt(attempt) {
  if (!attempt) return false;
  if (attempt.done) return true;
  return shouldRetireFindAttempt(attempt, attempt.lastReasonCode);
}

/**
 * Extra readiness points on top of scarcity. Street-ready + fair-use win;
 * address-less Drive harvest is penalized so Find stops burning the batch on them.
 */
function findSeedQualityBonus(seed, attempt) {
  if (!seed) return 0;
  let score = 0;
  const id = String(seed.id || "");
  const family = seedFamily(id);
  const street = looksLikeStreetAddress(seed.address);

  if (street) score += 120;
  if (family === "fair_use") score += 90;
  else if (family === "multi_city") score += 110; // deliver LA/BOS system regions ahead of NYC tinyout backlog
  else if (family === "other" && street) score += 40;
  else if (family === "tinyout" && street) score += 35;
  else if (family === "tinyout" && !street) score -= 20;

  // Drive harvest without a seed street is the starvation pattern (rule 438).
  if (family === "drive") {
    if (street) score += 25;
    else score -= 90;
  }

  const tries = attempt && typeof attempt.tries === "number" ? attempt.tries : 0;
  if (tries === 0) score += 25;
  else if (tries >= 3) score -= 40;

  if (attempt && shouldRetireFindAttempt(attempt, attempt.lastReasonCode)) {
    score -= 250;
  }
  return score;
}

module.exports = {
  HARD_TERMINAL_FIND_SKIP_CODES,
  SOFT_TERMINAL_FIND_SKIP_CODES,
  TERMINAL_FIND_SKIP_CODES,
  looksLikeStreetAddress,
  seedFamily,
  shouldRetireFindAttempt,
  isTerminalFindAttempt,
  findSeedQualityBonus,
};
