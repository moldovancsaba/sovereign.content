#!/usr/bin/env node
/**
 * Sovereign Content job twin: catalog:autopilot
 * Bounded Find ticks (seed → deep enrich → upsert → smoke).
 * Flags: --dry-run (sets CATALOG_LOOP_DRY_RUN; Find still needs write path to prove smoke —
 *   dry-run currently skips ingest via env if find-cycle honors it later; today reports intent),
 *   --ticks N → CATALOG_FIND_BATCH
 */
const { spawnSync } = require("child_process");
const path = require("path");

const DIR = __dirname;
const root = path.resolve(DIR, "../..");

function flagValue(name) {
  const i = process.argv.indexOf(name);
  if (i < 0 || i + 1 >= process.argv.length) return "";
  const v = process.argv[i + 1];
  return v && !v.startsWith("-") ? v : "";
}

const dry = process.argv.includes("--dry-run");
const ticks = flagValue("--ticks") || process.env.CATALOG_FIND_BATCH || "4";
const env = {
  ...process.env,
  CATALOG_FIND_BATCH: String(ticks),
};
if (dry) env.CATALOG_LOOP_DRY_RUN = "1";

console.log("→ find-cycle.cjs batch=", ticks, dry ? "(dry-run env set)" : "");
const r = spawnSync(process.execPath, [path.join(DIR, "find-cycle.cjs")], {
  cwd: root,
  env,
  stdio: "inherit",
});
const ok = r.status === 0 || r.status === null;
console.log(JSON.stringify({ job: "catalog:autopilot", dryRun: dry, ticks: Number(ticks), ok }));
process.exit(ok ? 0 : 1);
