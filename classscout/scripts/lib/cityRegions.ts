/**
 * Every registered city's top-level regions, straight from the city registry — for the catalog loop's
 * plain-CJS write paths, which cannot import `src/lib/city/*` themselves (`cityOwnership.cjs` runs this
 * once per cycle).
 *
 * Single source of truth: `allCities()` in `src/lib/city/registry.ts`, the same lists
 * `cityOwningBorough` searches and the ingest guard in `providerValidation.ts` enforces. Nothing here is
 * a copy — a region added to a city there is owned here on the next cycle.
 *
 * CLI (prints JSON): npx tsx scripts/catalog-loop/lib/cityRegions.ts
 */
import { allCities } from "@/lib/city/registry";

export interface CityRegions {
  slug: string;
  regions: string[];
}

export function cityRegionsFromRegistry(): CityRegions[] {
  return allCities().map((city) => ({ slug: city.slug, regions: [...city.regions] }));
}

if (process.argv[1] && process.argv[1].endsWith("cityRegions.ts")) {
  process.stdout.write(JSON.stringify(cityRegionsFromRegistry()));
}
