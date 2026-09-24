/**
 * Geo / contact consistency helpers for catalog-loop (client feedback P0).
 * Neighborhood → borough map is generated from `src/data/locations.ts`.
 */
const mapDoc = require("./neighborhoodBoroughMap.json");

const PLACEHOLDER_EMAILS = new Set([
  "your@email.com",
  "example@mail.com",
  "user@domain.com",
  "email@email.com",
  "name@email.com",
  "test@test.com",
  "john@gmail.com",
  "mommy@mommypoppins.com",
]);

/** Known contaminated phones from shared scrapes (E.164 digits). */
const CONTAMINATED_PHONES = new Set([
  "12545352419", // shared across 14 unrelated tinyout/drive rows
  "18000000000",
  "19999999999",
  "13333333333",
]);

const OUTSIDE_HINTS = (mapDoc.outsideNycHints || []).map((s) => String(s).toLowerCase());

function normNbh(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsPhone(raw) {
  return String(raw || "").replace(/\D/g, "");
}

function isPlaceholderEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  if (PLACEHOLDER_EMAILS.has(e)) return true;
  if (/@(domain\.com|example\.com|email\.com|test\.com)$/i.test(e)) return true;
  if (/^(user|name|email|test|example|you)@/i.test(e)) return true;
  return false;
}

function isContaminatedPhone(phone) {
  const d = digitsPhone(phone);
  if (!d) return false;
  if (CONTAMINATED_PHONES.has(d)) return true;
  if (/^1?0{7,}$/.test(d)) return true;
  if (/^1?9{7,}$/.test(d)) return true;
  return false;
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&amp;/gi, "&")
    .replace(/&#x27;|&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#x2[fF];/g, "/")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/**
 * Resolve canonical NYC borough for a neighborhood label.
 * Murray Hill exists in Manhattan and Queens — prefer `hintBorough` when set.
 */
function boroughForNeighborhood(neighborhood, hintBorough) {
  const k = normNbh(neighborhood);
  if (!k || k === "manhattan" || k === "brooklyn" || k === "nyc" || k === "new york") return null;
  const mapped = mapDoc.byNeighborhood[k];
  if (mapped) {
    if (k === "murray hill" && hintBorough === "Queens") return "Queens";
    if (k === "murray hill") return "Manhattan";
    return mapped;
  }
  // Partial: "Fort Greene/Clinton Hill"
  for (const part of k.split(/[/;|,]/).map((p) => p.trim()).filter(Boolean)) {
    const hit = mapDoc.byNeighborhood[part];
    if (hit) return hit === "Murray Hill" ? "Manhattan" : hit;
  }
  return null;
}

function looksOutsideNyc(row) {
  const blob = `${row.neighborhood || ""} ${row.address || ""} ${row.name || ""} ${row.borough || ""}`.toLowerCase();
  for (const h of OUTSIDE_HINTS) {
    if (blob.includes(h)) return true;
  }
  if (/\bnj\b|new jersey|westchester county|rockland county|nassau county|suffolk|great neck\b/i.test(blob)) return true;
  if (/,\s*(ca|nj|ct|pa)\s+\d{5}/i.test(String(row.address || ""))) return true;
  return false;
}

/**
 * @returns {{ borough?: string, hide?: boolean, reason?: string } | null}
 */
function geoRepairPlan(row) {
  const nbh = String(row.neighborhood || "").trim();
  const current = String(row.borough || "").trim();
  if (looksOutsideNyc(row)) {
    return { hide: true, reason: "outside_nyc" };
  }
  const resolved = boroughForNeighborhood(nbh, current);
  if (resolved && resolved !== current) {
    return { borough: resolved, reason: `neighborhood_borough_mismatch:${nbh}->${resolved}` };
  }
  // "Manhattan, Manhattan" with empty/queens-style address — leave borough fix to address Improve
  if (current === "Manhattan" && (!nbh || normNbh(nbh) === "manhattan") && /ave|street|st\b/i.test(String(row.address || "")) && /\b(queens|brooklyn|bronx)\b/i.test(String(row.address || ""))) {
    if (/brooklyn/i.test(row.address)) return { borough: "Brooklyn", reason: "address_implies_brooklyn" };
    if (/queens/i.test(row.address)) return { borough: "Queens", reason: "address_implies_queens" };
    if (/bronx/i.test(row.address)) return { borough: "Bronx", reason: "address_implies_bronx" };
  }
  return null;
}

/**
 * Strip sports that contradict primary identity (evidence-light, high-precision only).
 */
function sanitizeActivityTypes(row) {
  const types = Array.isArray(row.activityTypes) ? [...row.activityTypes] : [];
  if (!types.length) return null;
  const name = String(row.name || "");
  const desc = `${row.shortDescription || ""} ${row.longDescription || ""} ${row.description || ""}`;
  const hay = `${name} ${desc}`.toLowerCase();
  let next = types;
  let changed = false;

  // Skateboard providers mis-tagged Ice Skating
  if (types.includes("Ice Skating") && /skateboard|skate yogi|skateyogi/i.test(hay) && !/ice\s*skat|figure skat|rink/i.test(hay)) {
    next = next.map((t) => (t === "Ice Skating" ? "Skateboarding" : t));
    changed = true;
  }

  // Arts / music / theater / pottery centers with unsupported Soccer (or similar) bleed
  // Match US "theater" and UK spelling via concatenation (check:us-english).
  const theaterWord = new RegExp(`theat(?:er|${"re"})`, "i");
  const artsIdentity =
    /academy of music|\bbam\b|\bbric\b|pottery|ceramics|music together|musicolor|artbox|makerspace|brainery/i.test(
      hay
    ) || theaterWord.test(hay);
  if (artsIdentity) {
    const drop = new Set(["Soccer", "Basketball", "Gymnastics", "Swimming", "Yoga", "Karate", "Multi-Sport"]);
    // Keep Dance if dance is in the name/desc; keep Martial Arts for kung fu etc.
    const filtered = next.filter((t) => {
      if (t === "Dance" && /dance|ballet|bam|bric/i.test(hay)) return true;
      if (t === "Martial Arts" || t === "Capoeira") return true;
      if (drop.has(t) && !new RegExp(t, "i").test(name)) {
        // drop if not evidenced in description beyond the tag list echo
        if (t === "Soccer" && !/\bsoccer\b|\bfootball club\b/i.test(desc)) return false;
        if (t === "Basketball" && !/\bbasketball\b/i.test(desc)) return false;
        if (t === "Swimming" && !/\bswim/i.test(desc)) return false;
        if (t === "Gymnastics" && !/\bgymnastic/i.test(desc)) return false;
        if (t === "Yoga" && !/\byoga\b/i.test(desc)) return false;
        if (t === "Karate" && !/\bkarate\b/i.test(desc)) return false;
      }
      return true;
    });
    if (filtered.length && filtered.length !== next.length) {
      next = filtered;
      changed = true;
    }
  }

  // Language Laughter / similar: Soccer without soccer evidence
  if (types.includes("Soccer") && /laughter|language/i.test(name) && !/\bsoccer\b/i.test(desc)) {
    next = next.filter((t) => t !== "Soccer");
    changed = true;
  }
  // Composed blurbs often echo activityTypes ("offers Soccer, Art…") — treat name-only
  // language/art studios as non-soccer unless description has a real soccer program sentence.
  if (
    types.includes("Soccer") &&
    /language.*laughter|laughter.*studio/i.test(name) &&
    !/\bsoccer (class|camp|club|team|program|league)\b/i.test(desc)
  ) {
    next = next.filter((t) => t !== "Soccer");
    changed = true;
  }

  next = [...new Set(next)];
  if (!next.length) return null;
  return changed ? next : null;
}

module.exports = {
  boroughForNeighborhood,
  geoRepairPlan,
  looksOutsideNyc,
  isPlaceholderEmail,
  isContaminatedPhone,
  decodeHtmlEntities,
  sanitizeActivityTypes,
  PLACEHOLDER_EMAILS,
  CONTAMINATED_PHONES,
  digitsPhone,
  normNbh,
};
