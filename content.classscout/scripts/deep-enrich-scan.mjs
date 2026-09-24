#!/usr/bin/env node
/**
 * Deep enrich scan — all improve lanes in one bounded official-site pass.
 *
 * Usage:
 *   node deep-enrich-scan.mjs <input.json> <out.json>
 * input.json: array of { id, name, website, ... }
 */
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { deepEnrichOfficialSite } = require("./lib/deepEnrichOfficialSite.cjs");

async function main() {
  const inputPath = process.argv[2];
  const outPath = process.argv[3] || `/tmp/catalog-loop-deep-batch.json`;
  if (!inputPath) {
    console.error("usage: deep-enrich-scan.mjs <input.json> <out.json>");
    process.exit(2);
  }
  const items = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const results = [];
  for (const item of items) {
    process.stderr.write(`deep ${item.id}\n`);
    const enriched = await deepEnrichOfficialSite(item);
    results.push(enriched);
  }
  const withEvidence = results.filter((r) => r.withEvidence).length;
  const fields = {};
  for (const r of results) {
    for (const f of r.fieldsFound || []) fields[f] = (fields[f] || 0) + 1;
  }
  const doc = {
    at: new Date().toISOString(),
    mode: "deep",
    withEvidence,
    fields,
    results,
  };
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
  console.log(JSON.stringify({ wrote: outPath, n: results.length, withEvidence, fields }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
