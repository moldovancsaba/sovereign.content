/**
 * Full listing quality loop: score → improve → encode in one tick.
 *
 * Mongo-only. Does not load GDS / vertical pack. After About writes, refresh public
 * cards with `npm run serving:reconcile` if needed.
 *
 *   VERTICAL=padel-africa MONGODB_URI=... MONGODB_DB=padel-africa \
 *     npx tsx scripts/catalog-quality-loop.ts [--score-limit N] [--improve-limit N] [--dry-run]
 */
import { MongoClient } from "mongodb";
import {
  describeListingQualityLoop,
  runListingQualityLoop,
  mongoListingQualityStore,
  DEFAULT_QUALITY_IMPROVE_LIMIT,
  DEFAULT_QUALITY_SCORE_LIMIT,
  loadCuratedAbout,
} from "../src/lib/listingQuality";
import { intArg } from "./listing-quality-cli";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dryRun = process.argv.includes("--dry-run");
  const scoreLimit = intArg(process.argv, "--score-limit", DEFAULT_QUALITY_SCORE_LIMIT);
  const improveLimit = intArg(process.argv, "--improve-limit", DEFAULT_QUALITY_IMPROVE_LIMIT);
  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "management");
  const curatedById = await loadCuratedAbout(db);

  const summary = await runListingQualityLoop(mongoListingQualityStore(db), {
    dryRun,
    scoreLimit,
    improveLimit,
    curatedById,
  });

  console.log(describeListingQualityLoop(summary));
  console.log(
    JSON.stringify(
      {
        dryRun,
        scoreLimit,
        improveLimit,
        vertical: process.env.VERTICAL ?? null,
        score: { scanned: summary.score.scanned, openWritten: summary.score.openWritten, alreadyGood: summary.score.alreadyGood },
        improve: {
          considered: summary.improve.considered,
          applied: summary.improve.applied,
          skipped: summary.improve.skipped,
          failed: summary.improve.failed,
          results: summary.improve.results,
        },
        encode: {
          encoded: summary.encode.encoded,
          skipped: summary.encode.skipped,
          deltas: summary.encode.lessons.map((l) => ({ listingId: l.listingId, delta: l.delta, tactic: l.tactic })),
        },
        statuses: summary.statuses,
      },
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
