/**
 * Score published listings and record quality recommendations (FIND half).
 *
 *   VERTICAL=padel-africa MONGODB_URI=... MONGODB_DB=padel-africa \
 *     npx tsx scripts/catalog-quality-score.ts [--limit N] [--dry-run]
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";
import { MongoClient } from "mongodb";
import { runListingQualityScore, mongoListingQualityStore, DEFAULT_QUALITY_SCORE_LIMIT } from "../src/lib/listingQuality";
import { intArg } from "./listing-quality-cli";

async function main() {
  refuseAgentMongo("catalog-quality-score.ts");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dryRun = process.argv.includes("--dry-run");
  const limit = intArg(process.argv, "--limit", DEFAULT_QUALITY_SCORE_LIMIT);
  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "management");
  const summary = await runListingQualityScore(mongoListingQualityStore(db), { maxPerRun: limit, dryRun });
  console.log(JSON.stringify({ dryRun, limit, ...summary, recommendations: summary.recommendations.map((r) => ({ id: r.id, listingId: r.listingId, kind: r.kind, scoreBefore: r.scoreBefore, severity: r.severity })) }, null, 2));
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
