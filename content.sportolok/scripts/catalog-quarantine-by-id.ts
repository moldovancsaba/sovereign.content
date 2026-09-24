/**
 * Quarantine specific listings by id — for the cases none of the sweep scripts can find
 * programmatically (`catalog-quarantine-explicit.ts`/`catalog-quarantine-empty-images.ts` both detect
 * a CLASS of content; this is for the operator who already knows exactly which ids don't belong —
 * e.g. a listing routed to the wrong instance's catalog by an external feeder's own discovery scope,
 * which nothing here can detect structurally without inventing pack-specific geo bounds).
 *
 * Same shape as its sweep siblings deliberately: dry-run by default, `--apply` to write, the real
 * lifecycle transition (`QUARANTINED` is a real state, `assertTransition` enforced) rather than a
 * bespoke visibility flag — reversible (an operator can un-quarantine later) rather than a hard delete.
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> npx tsx scripts/catalog-quarantine-by-id.ts <id...> --reason "..." [--apply]
 */
import { MongoClient } from "mongodb";
import { assertTransition, type LifecycleState } from "@/lib/lifecycle/lifecycle";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dbName = process.env.MONGODB_DB ?? "management";
  const apply = process.argv.includes("--apply");

  const reasonIdx = process.argv.indexOf("--reason");
  const reason = reasonIdx !== -1 ? process.argv[reasonIdx + 1] : null;
  if (!reason) throw new Error('--reason "<why these ids are being quarantined>" is required');

  const ids = process.argv
    .slice(2)
    .filter((arg, i, all) => !arg.startsWith("--") && all[i - 1] !== "--reason");
  if (ids.length === 0) throw new Error("at least one listing id is required");

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);

  let quarantined = 0;
  let missing = 0;
  let skipped = 0;
  for (const id of ids) {
    const row = await db.collection("listings").findOne({ id }, { projection: { _id: 0, id: 1, name: 1, lifecycleState: 1 } });
    if (!row) {
      console.log(`${apply ? "MISSING" : "DRY (missing)"}  ${id}  — no such listing in this database`);
      missing += 1;
      continue;
    }
    const from = row.lifecycleState as LifecycleState;
    console.log(`${apply ? "QUARANTINE" : "DRY"}  ${id}  "${String(row.name).slice(0, 60)}"  [${from} -> QUARANTINED]  reason: ${reason}`);
    if (!apply) continue;
    if (from === "QUARANTINED") {
      skipped += 1;
      continue;
    }
    try {
      assertTransition(from, "QUARANTINED");
      await db.collection("listings").updateOne({ id }, { $set: { lifecycleState: "QUARANTINED", updatedAt: new Date().toISOString() } });
      quarantined += 1;
    } catch (error) {
      console.error(`  skip ${id}: ${error instanceof Error ? error.message : String(error)}`);
      skipped += 1;
    }
  }

  console.log(
    `\n${apply ? "Quarantined" : "Would quarantine"} ${apply ? quarantined : ids.length - missing} of ${ids.length} id(s) given` +
      (missing > 0 ? ` (${missing} not found)` : "") +
      (apply && skipped > 0 ? ` (${skipped} already quarantined or skipped)` : "") +
      (!apply ? ". Re-run with --apply to write." : "."),
  );
  await client.close();
}

main().catch((error) => {
  console.error("[catalog-quarantine-by-id] failed:", error);
  process.exitCode = 1;
});
