/**
 * Encode applied quality improvements into lessons (ENCODE half).
 *
 *   VERTICAL=padel-africa MONGODB_URI=... MONGODB_DB=padel-africa \
 *     npx tsx scripts/catalog-quality-encode.ts [--limit N] [--dry-run]
 */
import { MongoClient } from "mongodb";
import { runListingQualityEncode, mongoListingQualityStore } from "../src/lib/listingQuality";
import { intArg } from "./listing-quality-cli";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dryRun = process.argv.includes("--dry-run");
  const limit = intArg(process.argv, "--limit", 100);
  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "management");
  const summary = await runListingQualityEncode(mongoListingQualityStore(db), { maxPerRun: limit, dryRun });
  console.log(JSON.stringify({ dryRun, limit, ...summary }, null, 2));
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
