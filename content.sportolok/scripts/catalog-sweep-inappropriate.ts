/**
 * Recurring safety sweep (ports ClassScout's `catalog:sweep-inappropriate`). Scans every listing,
 * regardless of lifecycle state, for explicit content AND unapproved placeholder names — findings
 * already contained (state === `QUARANTINED`) are reported but not re-alerted. `--apply` quarantines
 * every uncontained finding via a real lifecycle transition; nothing auto-restores. Writes
 * `docs/reports/inappropriate-content-sweep-latest.{json,md}` and exits non-zero when an unhandled
 * finding remains, so a scheduled run's failure is visible without a human reading the report first.
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> npx tsx scripts/catalog-sweep-inappropriate.ts [--apply]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MongoClient } from "mongodb";
import { checkExplicitContent } from "../src/lib/catalogHygiene/explicitContent";
import { isGenericPlaceholderName } from "../src/lib/catalogHygiene/placeholderNames";
import { assertTransition, type LifecycleState } from "@/lib/lifecycle/lifecycle";

interface Finding {
  id: string;
  title: string;
  categories: string[];
  reasons: string[];
  contained: boolean;
  action: "none" | "quarantined";
}

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

  const findings: Finding[] = [];
  for (const row of rows) {
    const explicit = checkExplicitContent({ name: row.name as string, description: row.description as string, website: row.website as string });
    const placeholder = isGenericPlaceholderName(row.name as string);
    if (!explicit && !placeholder) continue;

    const categories = [...(explicit ? ["explicit"] : []), ...(placeholder ? ["placeholder"] : [])];
    const reasons = [...(explicit?.reasons ?? []), ...(placeholder ? ["generic_placeholder_name"] : [])];
    const from = row.lifecycleState as LifecycleState;
    const contained = from === "QUARANTINED";
    let action: Finding["action"] = "none";

    if (apply && !contained) {
      try {
        assertTransition(from, "QUARANTINED");
        await db.collection("listings").updateOne({ id: row.id }, { $set: { lifecycleState: "QUARANTINED", updatedAt: new Date().toISOString() } });
        action = "quarantined";
      } catch (error) {
        console.error(`  skip ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    findings.push({ id: String(row.id), title: String(row.name ?? "").slice(0, 80), categories, reasons, contained: contained || action === "quarantined", action });
  }

  const unhandled = findings.filter((f) => !f.contained);
  const report = {
    scannedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    scanned: rows.length,
    totals: { findings: findings.length, contained: findings.filter((f) => f.contained).length, unhandled: unhandled.length, autoQuarantined: findings.filter((f) => f.action === "quarantined").length },
    unhandled,
    findings,
  };

  const dir = join(__dirname, "..", "docs", "reports");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "inappropriate-content-sweep-latest.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(dir, "inappropriate-content-sweep-latest.md"),
    [
      "# Inappropriate-content sweep",
      "",
      `- Scanned at: ${report.scannedAt}`,
      `- Mode: ${report.mode}`,
      `- Findings: ${report.totals.findings} (contained ${report.totals.contained}, unhandled ${report.totals.unhandled}, auto-quarantined ${report.totals.autoQuarantined})`,
      "",
      "## Unhandled (need action)",
      unhandled.length === 0 ? "_None — catalog is clean._" : "",
      ...unhandled.map((f) => `- \`${f.id}\` — "${f.title}" — ${f.reasons.join(", ")}`),
      "",
    ].join("\n"),
  );

  console.log(`[safety-sweep] mode=${report.mode} findings=${findings.length} contained=${report.totals.contained} unhandled=${unhandled.length}`);
  if (unhandled.length > 0) {
    console.error(`[safety-sweep] ALERT: ${unhandled.length} unhandled finding(s) — see docs/reports/inappropriate-content-sweep-latest.md`);
    process.exitCode = 2;
  } else {
    console.log(`[safety-sweep] OK — no unhandled inappropriate content.`);
  }
  await client.close();
}

main().catch((error) => {
  console.error("[catalog-sweep-inappropriate] failed:", error);
  process.exitCode = 1;
});
