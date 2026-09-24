/**
 * Media fingerprint backfill (ports ClassScout's `catalog:image-backfill`). Fingerprints every image
 * media asset across all listings and upserts the result into `catalog_media_fingerprints`, keyed by
 * `listingId:mediaIndex`. Pass `--only-missing` to skip assets that already have a fingerprint —
 * unbounded otherwise, matching ClassScout's own default (image work runs off-peak, not on a request
 * path, so it is exempt from the read-path bound).
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> npx tsx scripts/catalog-image-backfill.ts [--only-missing]
 */
import { MongoClient } from "mongodb";
import { fingerprintImageUrl, type MediaFingerprint } from "../src/lib/catalogHygiene/imageFingerprint";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dbName = process.env.MONGODB_DB ?? "management";
  const onlyMissing = process.argv.includes("--only-missing");

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  const listings = await db.collection("listings").find({}, { projection: { _id: 0, id: 1, media: 1 } }).toArray();
  const existingKeys = onlyMissing
    ? new Set((await db.collection("catalog_media_fingerprints").find({}, { projection: { _id: 0, listingId: 1, mediaIndex: 1 } }).toArray()).map((r) => `${r.listingId}:${r.mediaIndex}`))
    : new Set<string>();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const listing of listings) {
    const media = (listing.media as Array<{ url?: string; kind?: string }> | undefined) ?? [];
    for (const [mediaIndex, asset] of media.entries()) {
      if (asset.kind !== "image" || !asset.url) continue;
      const key = `${listing.id}:${mediaIndex}`;
      if (onlyMissing && existingKeys.has(key)) {
        skipped += 1;
        continue;
      }
      scanned += 1;
      const result = await fingerprintImageUrl(asset.url);
      if (!result) {
        failures.push(`${key}: fetch/decode failed for ${asset.url}`);
        continue;
      }
      const record: MediaFingerprint = { listingId: listing.id as string, mediaIndex, url: asset.url, fingerprintedAt: new Date().toISOString(), ...result };
      await db.collection("catalog_media_fingerprints").updateOne({ listingId: record.listingId, mediaIndex: record.mediaIndex }, { $set: record }, { upsert: true });
      updated += 1;
    }
  }

  console.log(JSON.stringify({ scanned, updated, skipped, failures }, null, 2));
  await client.close();
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[catalog-image-backfill] failed:", error);
  process.exitCode = 1;
});
