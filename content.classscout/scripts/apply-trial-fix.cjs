#!/usr/bin/env node
/**
 * Backward-compatible entry: trial-only apply via apply-improve.cjs.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const env = { ...process.env, CATALOG_LOOP_LANE: process.env.CATALOG_LOOP_LANE || "trial" };
const r = spawnSync(process.execPath, [path.join(__dirname, "apply-improve.cjs")], {
  stdio: "inherit",
  env,
});
process.exit(r.status || 0);
