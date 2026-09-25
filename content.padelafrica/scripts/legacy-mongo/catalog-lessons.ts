/**
 * `npm run catalog:lessons` — dump SovereignLesson rows derived from override waivers
 * (sportolok adoption P2). Effect tags: suggest-config | soften-required | none.
 * Never auto-mutates pack blockers.
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> npx tsx scripts/catalog-lessons.ts [--hours 168] [--json]
 */
import { MongoClient } from "mongodb";
import { overrideInsights } from "../src/lib/reports/overrideInsights";
import { renderSovereignLessons } from "../src/lib/reports/sovereignLessons";

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const hours = Math.max(1, Number(argValue("--hours")) || 168);
  const client = await MongoClient.connect(uri);
  try {
    const report = await overrideInsights(client.db(process.env.MONGODB_DB ?? "management"), hours);
    console.log(process.argv.includes("--json") ? JSON.stringify(report.lessons, null, 2) : renderSovereignLessons(report.lessons));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
