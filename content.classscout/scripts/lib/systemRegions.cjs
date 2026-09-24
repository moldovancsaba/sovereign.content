/**
 * Regions known to the multi-city registry (NYC boroughs + LA areas + Boston boroughs).
 * Find uses this so publicTarget is not hardcoded to Manhattan/Brooklyn — client visibility
 * stays on runtime `disabledRegions` (rule 439).
 */
const NYC_BOROUGHS = Object.freeze([
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
]);

const LA_AREAS = Object.freeze([
  "Central LA",
  "Westside",
  "San Fernando Valley",
  "Orange County / South Bay",
  "East LA / San Gabriel Valley",
  "South LA / Gateway Cities",
]);

const BOSTON_AREAS = Object.freeze([
  "Downtown Core",
  "North Boston",
  "Northwest Boston",
  "Jamaica Plain / Roslindale",
  "Dorchester / South Boston",
  "South / Southwest Boston",
]);

const SYSTEM_REGIONS = Object.freeze([...NYC_BOROUGHS, ...LA_AREAS, ...BOSTON_AREAS]);
const SYSTEM_REGION_SET = new Set(SYSTEM_REGIONS);

const REGION_TO_CITY = Object.freeze(
  Object.fromEntries([
    ...NYC_BOROUGHS.map((r) => [r, "nyc"]),
    ...LA_AREAS.map((r) => [r, "la"]),
    ...BOSTON_AREAS.map((r) => [r, "bos"]),
  ])
);

function isSystemRegion(name) {
  return SYSTEM_REGION_SET.has(String(name || "").trim());
}

/**
 * City slug for a system region name (`nyc` | `la` | `bos`), or null when unknown.
 * Mirrors `cityOwningBorough` so Find never hardcodes the NYC city slug on LA/Boston areas.
 */
function cityForSystemRegion(borough) {
  const key = String(borough || "").trim();
  return REGION_TO_CITY[key] || null;
}

/** Closed Set for Find publicTarget borough checks (all cities in the registry). */
function systemRegionSet() {
  return new Set(SYSTEM_REGIONS);
}

/**
 * Approximate listing address when no street line exists.
 * Format: "Neighborhood, Borough" (or borough alone). Empty when nothing usable.
 */
function approximateAddressFromPlace(seed) {
  const borough = String((seed && seed.borough) || "").trim();
  const neighborhood = String((seed && seed.neighborhood) || "").trim();
  if (!borough && !neighborhood) return "";
  if (!isSystemRegion(borough) && !neighborhood) return "";
  if (neighborhood && neighborhood.toLowerCase() !== borough.toLowerCase()) {
    return borough ? `${neighborhood}, ${borough}` : neighborhood;
  }
  return borough || neighborhood;
}

module.exports = {
  NYC_BOROUGHS,
  LA_AREAS,
  BOSTON_AREAS,
  SYSTEM_REGIONS,
  isSystemRegion,
  cityForSystemRegion,
  systemRegionSet,
  approximateAddressFromPlace,
};
