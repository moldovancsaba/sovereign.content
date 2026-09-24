/**
 * Safety sweep (ports ClassScout's `catalog:quarantine-explicit`): find any PUBLISHED listing whose
 * name/description/website is adult/explicit and quarantine it — every listing this script finds is
 * CRITICAL by definition, since `checkExplicitContent` only flags unambiguous adult content. Uses the
 * engine's real lifecycle transition (`QUARANTINED` is a real state, `assertTransition` enforced) rather
 * than a bespoke visibility flag. Dry-run by default; pass `--apply` to write.
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> npx tsx scripts/catalog-quarantine-explicit.ts [--apply]
 */
import { MongoClient } from "mongodb";
import { checkExplicitContent } from "../src/lib/catalogHygiene/explicitContent";
import { assertTransition, type LifecycleState } from "@/lib/lifecycle/lifecycle";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dbName = process.env.MONGODB_DB ?? "management";
  const apply = process.argv.includes("--apply");

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  const rows = await db
    .collection("listings")
    .find({}, { projection: { _id: 0, id: 1, name: 1, description: 1, website: 1, lifecycleState: 1 } })
    .toArray();

  let flagged = 0;
  let quarantined = 0;
  for (const row of rows) {
    const result = checkExplicitContent({ name: row.name as string, description: row.description as string, website: row.website as string });
    if (!result) continue;
    flagged += 1;
    const from = row.lifecycleState as LifecycleState;
    console.log(`${apply ? "QUARANTINE" : "DRY"}  ${row.id}  "${String(row.name).slice(0, 50)}"  [${result.reasons.join(", ")}]`);
    if (apply && from !== "QUARANTINED") {
      try {
        assertTransition(from, "QUARANTINED");
        await db.collection("listings").updateOne({ id: row.id }, { $set: { lifecycleState: "QUARANTINED", updatedAt: new Date().toISOString() } });
        quarantined += 1;
      } catch (error) {
        console.error(`  skip ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  console.log(`\n${apply ? "Quarantined" : "Would quarantine"} ${apply ? quarantined : flagged} of ${flagged} flagged listing(s). ${apply ? "" : "Re-run with --apply to write."}`);
  await client.close();
  if (!apply && flagged > 0) process.exitCode = 0; // dry-run reporting a finding is not itself a failure
}

main().catch((error) => {
  console.error("[catalog-quarantine-explicit] failed:", error);
  process.exitCode = 1;
});
