/**
 * CLI twin of /api/cron/media-curate — fill empty listing media from website OG images.
 *
 * Run:
 *   MONGODB_URI=... MONGODB_DB=sportolok VERTICAL=sportolok \
 *   npx tsx scripts/catalog-media-curate.ts [--limit 25] [--dry-run] [--listing-id=l-xxx]
 */
import { MongoClient } from "mongodb";
import { describeMediaCurate, runMediaCurate } from "../src/lib/catalogHygiene/mediaCurate";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dbName = process.env.MONGODB_DB ?? "management";
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 25;
  const dryRun = process.argv.includes("--dry-run");
  const listingArg = process.argv.find((a) => a.startsWith("--listing-id="));
  const listingId = listingArg ? listingArg.split("=")[1] : undefined;

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);
  const report = await runMediaCurate(db, { limit, dryRun, listingId });
  console.log(describeMediaCurate(report));
  console.log(JSON.stringify(report, null, 2));
  await client.close();
  if (report.failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[catalog-media-curate] failed:", error);
  process.exitCode = 1;
});
