#!/usr/bin/env node
/**
 * Backward-compatible trial scan entry — delegates to improve-scan.mjs.
 * Prefer: node improve-scan.mjs trial <input> <offset> <limit> <out>
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mode = "trial";
const inputPath = process.argv[2];
const offset = process.argv[3] || "0";
const limit = process.argv[4] || "40";
const outPath = process.argv[5] || `/tmp/catalog-loop-${mode}-batch.json`;

// Legacy argv: trial-scan.mjs trial <input> <offset> <limit> <out>
// Also accept: trial-scan.mjs <input> <offset> <limit> <out>
let args;
if (process.argv[2] === "trial") {
  args = ["trial", process.argv[3], process.argv[4] || "0", process.argv[5] || "40", process.argv[6]];
} else {
  args = [mode, inputPath, offset, limit, outPath];
}

const r = spawnSync("node", [path.join(__dirname, "improve-scan.mjs"), ...args.filter(Boolean)], {
  stdio: "inherit",
  encoding: "utf8",
});
process.exit(r.status || 0);
