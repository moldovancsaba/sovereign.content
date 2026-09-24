/**
 * Cloud Agent / CLI catalogue hygiene tick — same passes as `/api/cron/catalog-backfill`
 * (geo / price / venue-model / age / territory / contact) using cached Nominatim. No Google key, no
 * AI Gateway, no CRON_SECRET.
 *
 *   VERTICAL=padel-africa MONGODB_URI=... MONGODB_DB=padel-africa \
 *     npx tsx scripts/catalog-hygiene.ts [--passes geo,price,contact] [--dry-run]
 */
import { MongoClient } from "mongodb";
import {
  describeCatalogBackfill,
  geocoderForBackfill,
  mongoCatalogBackfillStores,
  runCatalogBackfill,
  selectedPasses,
} from "../src/lib/catalogHygiene/catalogBackfill";
import { createCachedGeocoder, mongoGeocodeCache } from "../src/lib/geo/geocodeCache";
import { resolveAgeBands } from "../src/lib/vertical/ageBandsResolve";
import { readStructuredBlock, AGE_BANDS_BLOCK, TERRITORY_BLOCK } from "../src/lib/runtimeConfig/structuredBlocks";
import { resolveTerritory } from "../src/lib/geo/territoryResolve";
import type { TerritoryConfig } from "../src/lib/geo/territory";

async function resolvePack() {
  try {
    const { resolveVertical } = await import("../src/lib/vertical/resolve");
    return resolveVertical(process.env.VERTICAL?.trim() || "management-console");
  } catch (err) {
    throw new Error(
      `vertical pack unavailable (${err instanceof Error ? err.message : String(err)}). ` +
        `Install GDS packages or run from a complete node_modules.`,
    );
  }
}

async function main() {
  if (!process.env.GEOCODER_USER_AGENT) {
    process.env.GEOCODER_USER_AGENT =
      "PadelAfricaCloudAgent/1.0 (catalog hygiene; +https://github.com/moldovancsaba/management)";
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dryRun = process.argv.includes("--dry-run");
  const passesIdx = process.argv.indexOf("--passes");
  const passesRaw = passesIdx === -1 ? undefined : process.argv[passesIdx + 1];

  const { pack } = await resolvePack();
  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "management");
  const territory = resolveTerritory(
    (pack.territory as TerritoryConfig | undefined) ?? {},
    await readStructuredBlock(db, TERRITORY_BLOCK),
  );
  const ageBands = resolveAgeBands(pack, await readStructuredBlock(db, AGE_BANDS_BLOCK));
  const cached = createCachedGeocoder({ store: mongoGeocodeCache(db) });
  try {
    const report = await runCatalogBackfill(
      mongoCatalogBackfillStores(db, territory),
      {
        territory,
        ageBands,
        venueModelVocabulary: pack.venueModelVocabulary,
      },
      geocoderForBackfill(cached),
      { passes: selectedPasses(passesRaw), dryRun },
    );
    console.log(
      JSON.stringify(
        {
          dryRun,
          detail: describeCatalogBackfill(report),
          ...report,
        },
        null,
        2,
      ),
    );
  } finally {
    // SC #13 — every hygiene tick must exit; never leave the Mongo client open after a green summary.
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
