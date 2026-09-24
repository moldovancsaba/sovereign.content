/**
 * Empty-image quarantine (ports ClassScout's `catalog:quarantine-empty-images`). A listing without at
 * least one verified media asset must not stay public — quarantines every PUBLISHED listing whose
 * `media` array is empty, via a real lifecycle transition. Dry-run by default; pass `--apply` to write.
 * Writes `docs/reports/empty-image-quarantine-latest.{json,md}`.
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> npx tsx scripts/catalog-quarantine-empty-images.ts [--apply]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MongoClient } from "mongodb";
import { assertTransition } from "@/lib/lifecycle/lifecycle";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dbName = process.env.MONGODB_DB ?? "management";
  const apply = process.argv.includes("--apply");
  const now = new Date().toISOString();

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  const rows = await db
    .collection("listings")
    .find({ lifecycleState: "PUBLISHED", $or: [{ media: { $exists: false } }, { media: { $size: 0 } }] }, { projection: { _id: 0, id: 1, name: 1 } })
    .toArray();

  if (apply) {
    for (const row of rows) {
      assertTransition("PUBLISHED", "QUARANTINED");
      await db.collection("listings").updateOne({ id: row.id }, { $set: { lifecycleState: "QUARANTINED", updatedAt: now } });
    }
  }

  const report = {
    generatedAt: now,
    applied: apply,
    quarantinedCount: rows.length,
    reason: "A published listing with no verified media must not stay public.",
    listings: rows,
  };

  const dir = join(__dirname, "..", "docs", "reports");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "empty-image-quarantine-latest.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(dir, "empty-image-quarantine-latest.md"),
    ["# Empty-image quarantine", "", `Generated: ${report.generatedAt}`, `Applied: ${report.applied}`, `Quarantined: ${report.quarantinedCount}`, "", "## Listings", "", ...rows.map((r) => `- ${r.id}: ${r.name}`), ""].join("\n"),
  );

  console.log(JSON.stringify(report, null, 2));
  await client.close();
}

main().catch((error) => {
  console.error("[catalog-quarantine-empty-images] failed:", error);
  process.exitCode = 1;
});
