#!/usr/bin/env node
/**
 * Sovereign Content job twin: catalog:about-curate
 * Weak-description repair + meta-chrome / address sanitize.
 * Flags: --dry-run --limit N --ids id1,id2
 */
const { spawnSync } = require("child_process");
const path = require("path");

const DIR = __dirname;
const root = path.resolve(DIR, "../..");
const passthrough = process.argv.slice(2);

function run(script) {
  console.log("→", script, passthrough.join(" "));
  const r = spawnSync(process.execPath, [path.join(DIR, script), ...passthrough], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  return r.status === 0 || r.status === null;
}

let ok = true;
ok = run("repair-weak-descriptions.cjs") && ok;
ok = run("repair-meta-description-chrome.cjs") && ok;
console.log(
  JSON.stringify({
    job: "catalog:about-curate",
    dryRun: passthrough.includes("--dry-run"),
    ok,
  })
);
process.exit(ok ? 0 : 1);
