#!/usr/bin/env node
/**
 * Push catalog-loop + fair-use KPI snapshots to production admin stats.
 * POSTs to /api/ingest/catalog-loop-stats (INGEST_API_KEY).
 *
 * Usage:
 *   node scripts/catalog-loop/push-stats.cjs
 *   node scripts/catalog-loop/push-stats.cjs --quality-only
 *   node scripts/catalog-loop/push-stats.cjs --fair-use-only
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname);
const QUALITY_PATH = path.join(ROOT, "data", "quality-hourly.json");
const FAIR_USE_PATH = path.join(ROOT, "data", "rqk-fair-use", "state.json");
const BASE =
  process.env.CLASSSCOUT_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://getyourfield.com";
const KEY = process.env.INGEST_API_KEY;

function load(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  if (!KEY) {
    console.log(JSON.stringify({ ok: false, skipped: true, reason: "INGEST_API_KEY missing" }));
    return;
  }
  const qualityOnly = process.argv.includes("--quality-only");
  const fairUseOnly = process.argv.includes("--fair-use-only");
  const body = {};
  if (!fairUseOnly) {
    const q = load(QUALITY_PATH);
    if (q) body.quality = q;
  }
  if (!qualityOnly) {
    const f = load(FAIR_USE_PATH);
    if (f) body.fairUse = f;
  }
  if (!body.quality && !body.fairUse) {
    console.log(JSON.stringify({ ok: false, skipped: true, reason: "no_local_snapshots" }));
    return;
  }

  const url = `${String(BASE).replace(/\/$/, "")}/api/ingest/catalog-loop-stats`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (text.trimStart().startsWith("<!")) {
    console.log(
      JSON.stringify({
        ok: false,
        status: res.status,
        url,
        reason: "html_response_route_not_deployed",
      }),
    );
    process.exitCode = 1;
    return;
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  console.log(JSON.stringify({ ok: res.ok, status: res.status, url, ...json }));
  if (!res.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
