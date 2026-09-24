/**
 * Quarantine every listing outside the vertical's declared `territoryScope` — the sweep sibling of
 * `catalog-quarantine-by-id.ts`, for the class of listing that one exists to handle by hand.
 *
 * That script's own note says wrong-instance listings are something "nothing here can detect
 * structurally without inventing pack-specific geo bounds". That is no longer true: the pack now
 * DECLARES its territory (`verticals/<slug>/index.ts`, `territoryScope`) and the publish gate's
 * `territory-scope` family refuses anything outside it, so the class is detectable and this sweep
 * finds it. The by-id script stays for ids that don't belong for reasons geography cannot express.
 *
 * WHY A SWEEP IS STILL NEEDED once the gate enforces the rule: the gate decides what may BECOME
 * published. It says nothing about what already IS. padel-africa held 20 non-African listings when
 * the rule was written — five of them PUBLISHED and live — and every one of those predates the gate.
 *
 * QUARANTINED, NEVER DELETED. It is a real, reversible lifecycle state (`assertTransition` enforced),
 * so a listing wrongly caught here can be restored by an operator. Nothing is removed from the
 * database by this script or by any other.
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> VERTICAL=<slug> npx tsx \
 *        scripts/catalog-quarantine-outside-territory.ts [--apply]
 */
import { MongoClient } from "mongodb";

import { describeScope, isCountryInScope } from "@/lib/geo/territoryScope";
import { assertTransition, type LifecycleState } from "@/lib/lifecycle/lifecycle";
import { packTerritoryScope } from "@/lib/vertical/pack";
import { resolveVertical } from "@/lib/vertical/resolve";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dbName = process.env.MONGODB_DB ?? "management";
  const apply = process.argv.includes("--apply");

  const { pack } = resolveVertical(process.env.VERTICAL?.trim() || "management-console");
  const scope = packTerritoryScope(pack);
  if (scope.kind === "unrestricted") {
    console.log(`[territory-sweep] vertical "${pack.slug}" declares an unrestricted territory — nothing is out of scope, nothing to do.`);
    return;
  }

  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);
  const rows = await db
    .collection("listings")
    .find({}, { projection: { _id: 0, id: 1, name: 1, lifecycleState: 1, venue: 1 } })
    .toArray();

  const offenders = rows.filter((r) => !isCountryInScope(r?.venue?.address?.countryCode, scope));
  console.log(`[territory-sweep] ${pack.slug} · ${dbName} · scope ${describeScope(scope)}`);
  console.log(`[territory-sweep] ${rows.length} listing(s), ${offenders.length} outside the declared territory\n`);

  let quarantined = 0;
  let already = 0;
  let skipped = 0;
  for (const row of offenders) {
    const from = row.lifecycleState as LifecycleState;
    const cc = row?.venue?.address?.countryCode ?? "(no country code)";
    const where = row?.venue?.address?.locality ?? "";
    const label = `${String(cc).padEnd(3)} ${String(row.name ?? "").slice(0, 46).padEnd(48)} ${where}`;
    if (from === "QUARANTINED") {
      console.log(`ALREADY     ${label}`);
      already += 1;
      continue;
    }
    console.log(`${apply ? "QUARANTINE" : "DRY       "}  ${label}  [${from} -> QUARANTINED]`);
    if (!apply) continue;
    try {
      assertTransition(from, "QUARANTINED");
      await db.collection("listings").updateOne(
        { id: row.id },
        {
          $set: {
            lifecycleState: "QUARANTINED",
            quarantineReason: `outside_declared_territory:${cc}`,
            updatedAt: new Date().toISOString(),
          },
        },
      );
      quarantined += 1;
    } catch (error) {
      // A state the lifecycle refuses to leave is a real answer, not a failure to paper over:
      // report it and move on, so one awkward row cannot stop the rest of the sweep.
      console.error(`  skip ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      skipped += 1;
    }
  }

  const actionable = offenders.length - already;
  console.log(
    `\n${apply ? "Quarantined" : "Would quarantine"} ${apply ? quarantined : actionable} listing(s)` +
      (already > 0 ? `; ${already} already quarantined` : "") +
      (apply && skipped > 0 ? `; ${skipped} refused by the lifecycle` : "") +
      (apply ? "." : ". Re-run with --apply to write."),
  );
  await client.close();
}

main().catch((error) => {
  console.error("[catalog-quarantine-outside-territory] failed:", error);
  process.exitCode = 1;
});
