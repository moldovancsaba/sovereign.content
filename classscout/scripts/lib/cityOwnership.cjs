/**
 * Which city a listing belongs to, for every catalog-loop write path (brief:
 * docs/briefs/produce-all-client-show-hide-classscout-dev.md, hard stop 1).
 *
 * Find used to hardcode NYC as the city of every upsert. Ingest rejects an LA or Boston region filed
 * under NYC (`providerValidation.ts`), so opening Find to LA and Boston could never land a single
 * listing there. The city now comes from the region's OWNER in the city registry — read through
 * `cityRegions.ts`, never restated here — exactly as `cityOwningBorough` answers it on the server.
 *
 * This is geography, not visibility: whether a region is publicly SHOWN is the client's runtime config
 * and never decides whether a listing is written.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const REGIONS_TS = path.join(__dirname, "cityRegions.ts");

/** @type {{ slug: string, regions: string[] }[] | null} */
let cached = null;

/**
 * Every registered city's regions, from the registry (once per process).
 * @returns {{ slug: string, regions: string[] }[]}
 */
function loadCityRegions() {
  if (cached) return cached;
  const r = spawnSync("npx", ["tsx", REGIONS_TS], {
    cwd: path.join(__dirname, "..", "..", ".."),
    encoding: "utf8",
    timeout: 60000,
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error(`city regions unavailable: ${(r.stderr || r.stdout || "").slice(0, 300) || `exit ${r.status}`}`);
  }
  const parsed = JSON.parse(r.stdout);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("city regions: empty registry");
  cached = parsed;
  return cached;
}

/**
 * The city whose regions contain `borough` exactly, or null when no registered city owns it — the same
 * answer `cityOwningBorough` gives. Null is a data-quality stop (we do not know where to file it), never
 * a visibility decision.
 *
 * @param {string | null | undefined} borough
 * @param {{ slug: string, regions: string[] }[]} cityRegions
 * @returns {string | null}
 */
function cityForBorough(borough, cityRegions) {
  if (!borough) return null;
  for (const city of cityRegions) {
    if (city.regions.includes(borough)) return city.slug;
  }
  return null;
}

module.exports = { loadCityRegions, cityForBorough };
