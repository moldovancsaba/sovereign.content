#!/usr/bin/env node
/**
 * Sovereign Content job twin: catalog:quality-loop
 * Score (recommend) → improve → encode lessons.
 * Passes through --dry-run / CATALOG_LOOP_DRY_RUN to apply-improve.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const DIR = __dirname;
const root = path.resolve(DIR, "../..");
const dry = process.argv.includes("--dry-run");

function run(script, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  if (dry) env.CATALOG_LOOP_DRY_RUN = "1";
  console.log("→", script, dry ? "(dry-run)" : "");
  const r = spawnSync(process.execPath, [path.join(DIR, script)], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  return r.status === 0 || r.status === null;
}

let ok = true;
ok = run("recommend-improve.cjs") && ok;
ok = run("improve-cycle.cjs") && ok;
ok = run("encode-lessons.cjs") && ok;
console.log(JSON.stringify({ job: "catalog:quality-loop", dryRun: dry, ok }));
process.exit(ok ? 0 : 1);
