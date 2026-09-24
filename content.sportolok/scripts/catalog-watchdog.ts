/**
 * `npm run catalog:watchdog` — ClassScout's `catalog:watchdog` (`scripts/report-catalog-watchdog.ts`),
 * ported for board issue #108: the publish-freshness digest, written to `docs/reports/` as JSON and
 * Markdown, the same way `demand:report` writes its own. Read-only. Exit code 0 always — an incident
 * is a finding for a person, not a failure of this script; `--fail` makes an incident exit 1 for a
 * scheduled check that wants to be told.
 *
 * Flags: `--listing-silence-hours N`, `--group-silence-hours N`, `--stale-listing-hours N`, `--fail`.
 * Env: `MONGODB_URI`, `MONGODB_DB`, `VERTICAL` (the pack's time zone reads the schedules).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MongoClient } from "mongodb";
import { buildWatchdogReportFromDb, renderWatchdogMarkdown } from "../src/lib/catalogOps/watchdog";
import { resolveVertical } from "../src/lib/vertical/resolve";

function numberArg(name: string): number | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = Number(process.argv[idx + 1] ?? "");
  return Number.isFinite(value) ? value : undefined;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dbName = process.env.MONGODB_DB ?? "management";
  const { pack } = resolveVertical(process.env.VERTICAL?.trim() || "management-console");

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);
  const report = await buildWatchdogReportFromDb(db, {
    timeZone: pack.timeZone,
    config: {
      listingSilenceHours: numberArg("--listing-silence-hours"),
      groupSilenceHours: numberArg("--group-silence-hours"),
      staleListingHours: numberArg("--stale-listing-hours"),
    },
  });
  await client.close();

  const reportsDir = join(__dirname, "..", "docs", "reports");
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(join(reportsDir, "catalog-watchdog-latest.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(reportsDir, "catalog-watchdog-latest.md"), renderWatchdogMarkdown(report));

  console.log(`[catalog-watchdog] listings=${report.summary.listingCount} groups=${report.summary.groupCount} stale=${report.summary.staleListingCount} incidents=${report.incidents.length}. Wrote docs/reports/catalog-watchdog-latest.{json,md}`);
  for (const incident of report.incidents) console.log(`  [${incident.severity}] ${incident.code}: ${incident.message}`);
  if (process.argv.includes("--fail") && report.incidents.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[catalog-watchdog] failed:", error);
  process.exitCode = 1;
});
