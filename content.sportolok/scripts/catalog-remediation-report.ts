/**
 * Catalog title remediation (ports the portable half of ClassScout's `catalog:remediation-report`).
 * ClassScout's version bundled three things: title-chrome normalization, NYC borough/neighborhood
 * correction, and a `lastVerifiedAt` freshness-stamp refresh. Only the first ports here — the generic
 * `Listing` schema has no borough/neighborhood concept at all (geography is per-vertical, never
 * hardcoded in the engine) and no `lastVerifiedAt`/`verificationStatus` field either, so there is
 * nothing for those two halves to read or write. This scans every listing for a polluted title
 * (`isPollutedListingTitle`) and proposes/applies the cleaned name. Dry-run by default; pass `--apply`
 * to write. Writes `docs/reports/catalog-remediation-latest.{json,md}`.
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> npx tsx scripts/catalog-remediation-report.ts [--apply]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MongoClient } from "mongodb";
import { isPollutedListingTitle, normalizeListingTitle } from "../src/lib/catalogHygiene/titleNormalization";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dbName = process.env.MONGODB_DB ?? "management";
  const apply = process.argv.includes("--apply");
  const now = new Date().toISOString();

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  const rows = await db.collection("listings").find({}, { projection: { _id: 0, id: 1, name: 1 } }).toArray();

  const candidates = rows
    .filter((row) => isPollutedListingTitle(row.name as string))
    .map((row) => ({ id: row.id as string, from: row.name as string, to: normalizeListingTitle(row.name as string) }))
    .filter((c) => c.to !== c.from);

  if (apply) {
    for (const candidate of candidates) {
      await db.collection("listings").updateOne({ id: candidate.id }, { $set: { name: candidate.to, updatedAt: now } });
    }
  }

  const report = { generatedAt: now, mode: apply ? "apply" : "dry-run", scanned: rows.length, remediationCount: candidates.length, candidates };

  const dir = join(__dirname, "..", "docs", "reports");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "catalog-remediation-latest.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(dir, "catalog-remediation-latest.md"),
    ["# Catalog title remediation", "", `Generated: ${report.generatedAt}`, `Mode: ${report.mode}`, `Scanned: ${report.scanned}`, `Candidates: ${report.remediationCount}`, "", "## Candidates", candidates.length ? candidates.map((c) => `- ${c.id}: "${c.from}" -> "${c.to}"`).join("\n") : "- none", ""].join("\n"),
  );

  console.log(`${apply ? "Applied" : "Wrote"} ${candidates.length} title remediation candidate(s).`);
  await client.close();
}

main().catch((error) => {
  console.error("[catalog-remediation-report] failed:", error);
  process.exitCode = 1;
});
