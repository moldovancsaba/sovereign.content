/**
 * Duplicate-image remediation (ports ClassScout's `catalog:image-remediate`). Uses the same duplicate
 * grouping `catalog:image-audit` reports; for each exact-duplicate group, keeps the earliest listing
 * (by `id`, insertion order is a reasonable proxy with no other timestamp on the fingerprint row) as
 * canonical and quarantines every other listing in the group so staff re-upload a genuinely unique
 * image — the engine has no automated re-acquisition pipeline to silently fetch a replacement, so a
 * reversible quarantine (not a guess at a new image) is the honest remediation here. Dry-run by
 * default; pass `--apply` to write.
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> npx tsx scripts/catalog-image-remediate.ts [--apply]
 */
import { MongoClient } from "mongodb";
import { findDuplicateGroups, type MediaFingerprint } from "../src/lib/catalogHygiene/imageFingerprint";
import { assertTransition, type LifecycleState } from "@/lib/lifecycle/lifecycle";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dbName = process.env.MONGODB_DB ?? "management";
  const apply = process.argv.includes("--apply");

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  const fingerprints = (await db.collection("catalog_media_fingerprints").find({}, { projection: { _id: 0 } }).toArray()) as unknown as MediaFingerprint[];
  const { exactGroups } = findDuplicateGroups(fingerprints);

  let quarantined = 0;
  const actions: Array<{ listingId: string; canonical: string; action: string }> = [];

  for (const group of exactGroups) {
    const [canonical, ...duplicates] = [...group.listingIds].sort();
    for (const listingId of duplicates) {
      const listing = await db.collection("listings").findOne({ id: listingId }, { projection: { _id: 0, id: 1, lifecycleState: 1 } });
      if (!listing) continue;
      const from = listing.lifecycleState as LifecycleState;
      if (from === "QUARANTINED") {
        actions.push({ listingId, canonical, action: "already_contained" });
        continue;
      }
      try {
        assertTransition(from, "QUARANTINED");
      } catch {
        actions.push({ listingId, canonical, action: "skip_illegal_transition" });
        continue;
      }
      actions.push({ listingId, canonical, action: apply ? "quarantined" : "would_quarantine" });
      if (apply) {
        await db.collection("listings").updateOne({ id: listingId }, { $set: { lifecycleState: "QUARANTINED", updatedAt: new Date().toISOString() } });
        quarantined += 1;
      }
    }
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", exactGroups: exactGroups.length, quarantined, actions }, null, 2));
  await client.close();
}

main().catch((error) => {
  console.error("[catalog-image-remediate] failed:", error);
  process.exitCode = 1;
});
