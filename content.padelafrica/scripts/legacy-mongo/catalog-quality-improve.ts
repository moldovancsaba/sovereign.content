/**
 * Apply open listing-quality recommendations (IMPROVE half).
 *
 * Mongo-only. Does not load GDS / vertical pack. After description writes, refresh
 * public cards with `npm run serving:reconcile` if needed.
 *
 *   VERTICAL=padel-africa MONGODB_URI=... MONGODB_DB=padel-africa \
 *     npx tsx scripts/catalog-quality-improve.ts [--limit N] [--dry-run]
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";
import { MongoClient } from "mongodb";
import {
  runListingQualityImprove,
  mongoListingQualityStore,
  DEFAULT_QUALITY_IMPROVE_LIMIT,
  loadCuratedAbout,
} from "../src/lib/listingQuality";
import { intArg } from "./listing-quality-cli";

async function main() {
  refuseAgentMongo("catalog-quality-improve.ts");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dryRun = process.argv.includes("--dry-run");
  const limit = intArg(process.argv, "--limit", DEFAULT_QUALITY_IMPROVE_LIMIT);
  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "management");
  const curatedById = await loadCuratedAbout(db);

  const summary = await runListingQualityImprove(mongoListingQualityStore(db), {
    maxPerRun: limit,
    dryRun,
    curatedById,
  });

  console.log(
    JSON.stringify(
      { dryRun, limit, vertical: process.env.VERTICAL ?? null, ...summary },
      null,
      2,
    ),
  );
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
