#!/usr/bin/env node
/**
 * Sovereign Content job twin: catalog:hygiene
 * Wraps ClassScout geo / price / venue-model drains (Nominatim-first geo when paid tier off).
 *
 * Flags:
 *   --dry-run (default for venue-model unless --apply)
 *   --passes geo,price,venueModel,clientFeedback,contact  (default: geo,price,venueModel,clientFeedback)
 *   --limit N
 *   --apply  (venue-model / clientFeedback write; contact uses ingest when not --dry-run)
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");

function hasFlag(name) {
  return process.argv.includes(name);
}
function flagValue(name) {
  const i = process.argv.indexOf(name);
  if (i < 0 || i + 1 >= process.argv.length) return "";
  const v = process.argv[i + 1];
  return v && !v.startsWith("-") ? v : "";
}

const dry = hasFlag("--dry-run") || process.env.CATALOG_LOOP_DRY_RUN === "1";
const applyVenue = hasFlag("--apply");
const limit = flagValue("--limit") || "25";
const passesRaw = flagValue("--passes") || "geo,price,venueModel,clientFeedback";
const passes = passesRaw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PASS_CMDS = {
  geo: {
    cmd: "npx",
    args: ["tsx", "scripts/backfill-provider-geo.ts", "--limit", limit, ...(dry ? ["--dry-run"] : [])],
  },
  price: {
    cmd: "npx",
    args: ["tsx", "scripts/backfill-provider-price.ts", "--limit", limit, ...(dry ? ["--dry-run"] : [])],
  },
  venueModel: {
    cmd: "npx",
    args: [
      "tsx",
      "scripts/backfill-provider-venue-model.ts",
      "--limit",
      limit,
      ...(applyVenue && !dry ? ["--apply"] : []),
    ],
  },
  /** Client-feedback P0: borough/nbhd, outside NYC, junk address, bad contacts/tags */
  clientFeedback: {
    cmd: "node",
    args: [
      "scripts/catalog-loop/repair-client-feedback-p0.cjs",
      ...(dry || !applyVenue ? [] : ["--apply"]),
      ...(limit ? ["--limit", limit] : []),
    ],
  },
  /** Evidence-only phone/website/email from headers or official homepage */
  contact: {
    cmd: "node",
    args: [
      "scripts/catalog-loop/contact-enrich.cjs",
      "--limit",
      limit,
      ...(dry ? ["--dry-run"] : []),
    ],
  },
};

const results = [];
for (const pass of passes) {
  const key = pass === "venue-model" ? "venueModel" : pass;
  const resolved = PASS_CMDS[key];
  if (!resolved) {
    results.push({ pass, ok: false, error: `unknown_pass:${pass}` });
    continue;
  }
  console.log("→ hygiene", key, resolved.args.join(" "));
  const r = spawnSync(resolved.cmd, resolved.args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: false,
  });
  results.push({ pass: key, ok: r.status === 0 });
}

const ok = results.every((r) => r.ok);
console.log(JSON.stringify({ job: "catalog:hygiene", dryRun: dry, passes, results, ok }));
process.exit(ok ? 0 : 1);
