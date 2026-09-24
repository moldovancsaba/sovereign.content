/**
 * Image duplicate audit (ports ClassScout's `catalog:image-audit`). Reads the fingerprints
 * `catalog:image-backfill` wrote and reports exact-duplicate groups (same content hash reused across
 * listings) and near-duplicate pairs (perceptual-hash Hamming distance <= threshold). Read-only.
 * Writes `docs/reports/image-duplicate-audit-latest.{json,md}`.
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> npx tsx scripts/catalog-image-audit.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MongoClient } from "mongodb";
import { findDuplicateGroups, type MediaFingerprint } from "../src/lib/catalogHygiene/imageFingerprint";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dbName = process.env.MONGODB_DB ?? "management";

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  const fingerprints = (await db.collection("catalog_media_fingerprints").find({}, { projection: { _id: 0 } }).toArray()) as unknown as MediaFingerprint[];

  const { exactGroups: rawExactGroups, nearGroups: rawNearGroups } = findDuplicateGroups(fingerprints);
  const exactGroups = rawExactGroups.map((g) => ({ contentHash: g.contentHash, count: g.listingIds.length, listingIds: g.listingIds }));
  const nearGroups = rawNearGroups.map((p) => ({ a: `${p.a.listingId}:${p.a.mediaIndex}`, b: `${p.b.listingId}:${p.b.mediaIndex}`, distance: p.distance }));

  const report = {
    generatedAt: new Date().toISOString(),
    counts: { fingerprints: fingerprints.length, exactDuplicateGroups: exactGroups.length, nearDuplicatePairs: nearGroups.length },
    exactGroups,
    nearGroups,
  };

  const dir = join(__dirname, "..", "docs", "reports");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "image-duplicate-audit-latest.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(dir, "image-duplicate-audit-latest.md"),
    [
      "# Catalog image duplicate audit",
      "",
      `Generated: ${report.generatedAt}`,
      `Fingerprints: ${fingerprints.length} · Exact groups: ${exactGroups.length} · Near-duplicate pairs: ${nearGroups.length}`,
      "",
      "## Exact duplicate groups",
      "",
      ...(exactGroups.length ? exactGroups.flatMap((g) => [`### ${g.contentHash.slice(0, 12)}`, ...g.listingIds.map((id) => `- ${id}`), ""]) : ["No exact duplicates found.", ""]),
      "## Near duplicate pairs",
      "",
      ...(nearGroups.length ? nearGroups.map((p) => `- ${p.a} vs ${p.b} (distance ${p.distance})`) : ["No near duplicates found."]),
      "",
    ].join("\n"),
  );

  console.log(`[image-audit] fingerprints=${fingerprints.length} exactGroups=${exactGroups.length} nearPairs=${nearGroups.length}`);
  await client.close();
}

main().catch((error) => {
  console.error("[catalog-image-audit] failed:", error);
  process.exitCode = 1;
});
