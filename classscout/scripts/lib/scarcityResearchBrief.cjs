/**
 * Catalog-loop scarcity research brief — pure ranking helpers.
 *
 * Ranks thin public neighborhoods and scarce sport activities so Find / fair-use
 * discovery always prefer under-supplied slices. Also sorts improve candidates
 * oldest-updated-first so each investigation rotates to another card.
 *
 * Sport vocabulary mirrors `ACTIVITY_COLLECTIVE_CHILDREN.Sports` in
 * `src/lib/media/activityIdentity.ts` (hand-kept; CJS cannot import that TS module).
 * Public neighborhood lists mirror `src/data/publicNeighborhoods.ts`.
 */

const PUBLIC_NEIGHBORHOODS = {
  Manhattan: [
    "Upper West Side",
    "Upper East Side",
    "Harlem",
    "Midtown",
    "Chelsea",
    "Greenwich Village",
    "East Village",
    "Lower East Side",
    "Chinatown",
    "Tribeca",
    "Financial District",
  ],
  Brooklyn: [
    "Boerum Hill",
    "Brooklyn Heights",
    "Carroll Gardens",
    "Cobble Hill",
    "DUMBO",
    "Fort Greene",
    "Park Slope",
    "Greenpoint",
    "Williamsburg",
    "Prospect Heights",
  ],
};

/** Sport-family tags used for scarcity ranking (Sports collective + children + Martial Arts). */
const SPORT_ACTIVITY_TAGS = [
  "Sports",
  "Multi-Sport",
  "Martial Arts",
  "Taekwondo",
  "Karate",
  "Kickboxing",
  "Judo",
  "Brazilian Jiu-Jitsu",
  "Muay Thai",
  "Aikido",
  "Capoeira",
  "Soccer",
  "Basketball",
  "Baseball",
  "Tennis",
  "Volleyball",
  "Beach Volleyball",
  "Football",
  "Flag Football",
  "Lacrosse",
  "Softball",
  "Golf",
  "Mini-Golf",
  "Squash",
  "Rugby",
  "Handball",
  "Ultimate Frisbee",
  "Swimming",
  "Rowing",
  "Sailing",
  "Kayaking",
  "Water Polo",
  "Boxing",
  "Wrestling",
  "Fencing",
  "Gymnastics",
  "Rhythmic Gymnastics",
  "Track & Field",
  "Running",
  "Parkour",
  "Cheerleading",
  "Climbing",
  "Bouldering",
  "Ice Hockey",
  "Ice Skating",
  "Figure Skating",
  "Roller Skating",
  "Skateboarding",
  "Skiing",
  "Horseback Riding",
  "Fitness",
];

const SPORT_SET = new Set(SPORT_ACTIVITY_TAGS.map((t) => t.toLowerCase()));

function isPublicProvider(row) {
  return (
    row &&
    row.visibility !== "hidden" &&
    row.qualityStatus !== "quarantined" &&
    row.discoveryTier !== "browse_only"
  );
}

function normLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function slugTokens(label) {
  return normLabel(label)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Count public listings per public-chip neighborhood (Manhattan 11 + Brooklyn 10).
 * Neighborhoods with zero listings stay in the ranking (true gaps).
 */
function rankThinNeighborhoods(providers, { topN = 12 } = {}) {
  const counts = new Map();
  for (const [borough, neighborhoods] of Object.entries(PUBLIC_NEIGHBORHOODS)) {
    for (const neighborhood of neighborhoods) {
      counts.set(`${borough}|${neighborhood}`, { borough, neighborhood, count: 0 });
    }
  }
  for (const p of providers) {
    if (!isPublicProvider(p)) continue;
    const borough = p.borough;
    const neighborhood = p.neighborhood;
    if (!borough || !neighborhood) continue;
    const key = `${borough}|${neighborhood}`;
    const row = counts.get(key);
    if (row) row.count += 1;
  }
  return [...counts.values()]
    .sort(
      (a, b) =>
        a.count - b.count ||
        a.borough.localeCompare(b.borough) ||
        a.neighborhood.localeCompare(b.neighborhood),
    )
    .slice(0, Math.max(0, topN))
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * Count public listings that carry each sport-family activity tag.
 * Tags with zero listings stay ranked (true gaps).
 */
function rankScarceSports(providers, { topN = 12 } = {}) {
  const counts = new Map(SPORT_ACTIVITY_TAGS.map((activity) => [activity, 0]));
  for (const p of providers) {
    if (!isPublicProvider(p)) continue;
    const seen = new Set();
    for (const raw of p.activityTypes || []) {
      const tag = String(raw || "").trim();
      if (!tag || !SPORT_SET.has(tag.toLowerCase())) continue;
      // Match canonical casing from our list when possible.
      const canonical =
        SPORT_ACTIVITY_TAGS.find((t) => t.toLowerCase() === tag.toLowerCase()) || tag;
      if (seen.has(canonical)) continue;
      seen.add(canonical);
      counts.set(canonical, (counts.get(canonical) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([activity, count]) => ({ activity, count }))
    .sort((a, b) => a.count - b.count || a.activity.localeCompare(b.activity))
    .slice(0, Math.max(0, topN))
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * Hourly research queries: scarce sport × thin neighborhood pairs, then
 * neighborhood-only and sport-only fallbacks.
 */
function buildSearchQueries(thinNeighborhoods, scarceSports, { maxQueries = 24 } = {}) {
  const queries = [];
  const seen = new Set();
  const push = (q) => {
    const key = q.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    queries.push(q);
  };

  const topN = thinNeighborhoods.slice(0, 8);
  const topS = scarceSports.slice(0, 8);
  for (let i = 0; i < Math.max(topN.length, topS.length); i++) {
    const n = topN[i % Math.max(topN.length, 1)];
    const s = topS[i % Math.max(topS.length, 1)];
    if (n && s) {
      push(`kids ${s.activity} classes ${n.neighborhood} ${n.borough} NYC`);
    }
  }
  for (const n of topN) {
    push(`kids classes ${n.neighborhood} ${n.borough} NYC`);
  }
  for (const s of topS) {
    push(`kids ${s.activity} classes NYC`);
  }
  return queries.slice(0, Math.max(0, maxQueries));
}

function buildResearchBrief(providers, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const thinNeighborhoods = rankThinNeighborhoods(providers, {
    topN: options.neighborhoodTopN ?? 12,
  });
  const scarceSports = rankScarceSports(providers, { topN: options.sportTopN ?? 12 });
  const searchQueries = buildSearchQueries(thinNeighborhoods, scarceSports, {
    maxQueries: options.maxQueries ?? 24,
  });
  return {
    generatedAt,
    hourUtc: generatedAt.slice(0, 13),
    thresholds: {
      neighborhoodTopN: options.neighborhoodTopN ?? 12,
      sportTopN: options.sportTopN ?? 12,
    },
    thinNeighborhoods,
    scarceSports,
    searchQueries,
    findHints: {
      preferNeighborhoods: thinNeighborhoods.map((n) => n.neighborhood),
      preferBoroughs: [...new Set(thinNeighborhoods.map((n) => n.borough))],
      preferActivities: scarceSports.map((s) => s.activity),
    },
  };
}

function seedScarcityScore(seed, brief) {
  if (!brief || !brief.findHints) return 0;
  let score = 0;
  const neigh = normLabel(seed.neighborhood);
  const borough = normLabel(seed.borough);
  const preferN = new Set((brief.findHints.preferNeighborhoods || []).map(normLabel));
  const preferB = new Set((brief.findHints.preferBoroughs || []).map(normLabel));
  const preferA = new Set((brief.findHints.preferActivities || []).map(normLabel));
  if (neigh && preferN.has(neigh)) score += 100;
  if (borough && preferB.has(borough)) score += 20;
  for (const a of seed.activityTypes || []) {
    if (preferA.has(normLabel(a))) {
      score += 80;
      break;
    }
  }
  // Prefer publicTarget seeds that fill gaps.
  if (seed.publicTarget !== false && !seed.inventoryOnly && score > 0) score += 10;
  return score;
}

const { findSeedQualityBonus } = require("./findSeedPriority.cjs");

/**
 * Readiness bonus so Find prefers street-ready / fair-use seeds over address-less
 * Drive harvest (rule 438). Evidence-only — never invents an address.
 */
function findReadinessBonus(seed, attempt) {
  return findSeedQualityBonus(seed, attempt);
}

/**
 * Rank pending Find seeds: scarcity brief first, then Drive/readiness bonus.
 * Works even when the brief file is missing (readiness still applies).
 */
function prioritizeSeedsByBrief(pending, brief) {
  if (!pending || !pending.length) return pending || [];
  const scored = pending.map((item, index) => {
    const seed = item.seed || item;
    const attempt = item.attempt || null;
    return {
      item,
      index,
      score: seedScarcityScore(seed, brief) + findReadinessBonus(seed, attempt),
    };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map((s) => s.item);
}

function discoveryUrlScore(url, brief) {
  if (!brief) return 0;
  const hay = normLabel(url).replace(/\//g, " ");
  let score = 0;
  for (const n of brief.thinNeighborhoods || []) {
    const tokens = slugTokens(n.neighborhood);
    if (tokens.length && tokens.every((t) => hay.includes(t))) {
      score += 50 + Math.max(0, 12 - (n.rank || 12));
    }
    if (hay.includes(normLabel(n.borough))) score += 5;
  }
  for (const s of brief.scarceSports || []) {
    const tokens = slugTokens(s.activity);
    if (tokens.length && tokens.every((t) => hay.includes(t))) {
      score += 40 + Math.max(0, 12 - (s.rank || 12));
    }
  }
  return score;
}

/** Reorder discovery pages so scarcity-matching URLs are tried first; preserve relative order within score ties. */
function orderDiscoveryPagesByBrief(pages, brief) {
  if (!pages || !pages.length || !brief) return pages || [];
  return pages
    .map((url, index) => ({ url, index, score: discoveryUrlScore(url, brief) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.url);
}

/**
 * Oldest-updated-first for improve / enrich candidates.
 * Missing updatedAt sorts first (never-touched), then ascending ISO time, then id.
 */
function sortOldestUpdatedFirst(rows) {
  return [...(rows || [])].sort((a, b) => {
    const ta = a && a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const tb = b && b.updatedAt ? Date.parse(b.updatedAt) : 0;
    const na = Number.isFinite(ta) ? ta : 0;
    const nb = Number.isFinite(tb) ? tb : 0;
    if (na !== nb) return na - nb;
    return String((a && a.id) || "").localeCompare(String((b && b.id) || ""));
  });
}

function loadBriefFromDisk(fs, path) {
  try {
    if (!fs.existsSync(path)) return null;
    const doc = JSON.parse(fs.readFileSync(path, "utf8"));
    if (!doc || !doc.generatedAt) return null;
    return doc;
  } catch {
    return null;
  }
}

module.exports = {
  PUBLIC_NEIGHBORHOODS,
  SPORT_ACTIVITY_TAGS,
  isPublicProvider,
  rankThinNeighborhoods,
  rankScarceSports,
  buildSearchQueries,
  buildResearchBrief,
  seedScarcityScore,
  findReadinessBonus,
  prioritizeSeedsByBrief,
  discoveryUrlScore,
  orderDiscoveryPagesByBrief,
  sortOldestUpdatedFirst,
  loadBriefFromDisk,
};
