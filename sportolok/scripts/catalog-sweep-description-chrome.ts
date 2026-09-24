/**
 * Description-chrome sweep (ports ClassScout's `catalog:sweep-description-chrome`). Re-audits every
 * listing's description for scraped page chrome / stray URLs / un-decoded HTML entities that should
 * never have reached a family-facing description. Data-quality defect, not a safety incident: `--apply`
 * only ever quarantines (reversible), never deletes. Writes
 * `docs/reports/description-chrome-sweep-latest.{json,md}`; exits non-zero on any unhandled finding.
 *
 * Run: MONGODB_URI=... MONGODB_DB=<instance> npx tsx scripts/catalog-sweep-description-chrome.ts [--apply]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MongoClient } from "mongodb";
import { validatePublicDescription } from "../src/lib/catalogHygiene/descriptionQuality";
import { assertTransition, type LifecycleState } from "@/lib/lifecycle/lifecycle";

interface Finding {
  id: string;
  title: string;
  reason: string;
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
    .find({}, { projection: { _id: 0, id: 1, name: 1, description: 1, lifecycleState: 1 } })
    .toArray();

  const findings: Finding[] = [];
  for (const row of rows) {
    const reason = validatePublicDescription(String(row.description ?? ""), "description");
    if (!reason) continue;
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
    findings.push({ id: String(row.id), title: String(row.name ?? "").slice(0, 80), reason, contained: contained || action === "quarantined", action });
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
  writeFileSync(join(dir, "description-chrome-sweep-latest.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(dir, "description-chrome-sweep-latest.md"),
    [
      "# Description-chrome sweep",
      "",
      `- Scanned at: ${report.scannedAt}`,
      `- Mode: ${report.mode}`,
      `- Findings: ${report.totals.findings} (contained ${report.totals.contained}, unhandled ${report.totals.unhandled}, auto-quarantined ${report.totals.autoQuarantined})`,
      "",
      "## Unhandled (need action)",
      unhandled.length === 0 ? "_None — catalog is clean._" : "",
      ...unhandled.map((f) => `- \`${f.id}\` — "${f.title}" — ${f.reason}`),
      "",
    ].join("\n"),
  );

  console.log(`[description-chrome-sweep] mode=${report.mode} findings=${findings.length} contained=${report.totals.contained} unhandled=${unhandled.length}`);
  if (unhandled.length > 0) {
    console.error(`[description-chrome-sweep] ALERT: ${unhandled.length} unhandled finding(s) — see docs/reports/description-chrome-sweep-latest.md`);
    process.exitCode = 2;
  } else {
    console.log(`[description-chrome-sweep] OK — no unhandled description chrome.`);
  }
  await client.close();
}

main().catch((error) => {
  console.error("[catalog-sweep-description-chrome] failed:", error);
  process.exitCode = 1;
});
