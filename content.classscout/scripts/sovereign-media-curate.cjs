#!/usr/bin/env node
/**
 * Sovereign Content job twin: catalog:media-curate
 *
 * ClassScout product policy: parents see generated listing art by default; venue photographs
 * are not the public card image (rules 424 / generated-artwork). Find already uploads a
 * generated 1200×800 placeholder via /api/ingest/upload (R2 preferred, ImgBB fallback).
 *
 * This CLI is the portable job name from Sovereign Content. It does NOT scrape venue photos.
 * It reports media coverage and exits. Future own-photo mode can extend this without renaming.
 *
 * Flags: --dry-run (always non-writing today) --limit N
 *         --policy generated_art_only|allow_og_scrape (ClassScout default: generated_art_only)
 */
require("./_productRoot.cjs").loadProductEnv();
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const { isDryRun, limitFromArgs, flagValue } = require("./lib/cliFlags.cjs");

const DRY = isDryRun();
const LIMIT = limitFromArgs(null, 50);
const POLICY = (flagValue("--policy") || process.env.MEDIA_CURATE_POLICY || "generated_art_only").trim();

function isPublic(row) {
  return (
    row.visibility !== "hidden" &&
    row.qualityStatus !== "quarantined" &&
    row.discoveryTier !== "browse_only"
  );
}

function hasHostedImage(row) {
  const img = String(row.image || row.imageUrl || "").trim();
  if (!img) return false;
  return /^https:\/\//i.test(img);
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const all = (await client.db("classscoutcluster").collection("providers").find({}).toArray()).filter(
    isPublic
  );
  await client.close();

  const missing = all.filter((r) => !hasHostedImage(r));
  const sample = missing.slice(0, LIMIT).map((r) => ({ id: r.id, name: r.name }));

  if (POLICY === "allow_og_scrape") {
    console.log(
      JSON.stringify(
        {
          job: "catalog:media-curate",
          dryRun: DRY || true,
          policy: POLICY,
          public: all.length,
          withHostedImage: all.length - missing.length,
          missingHostedImage: missing.length,
          sample,
          applied: 0,
          note:
            "ClassScout product default is generated_art_only. allow_og_scrape is accepted as a flag for SC parity but does not scrape venue photographs here — enable own-photo product mode before writing discovered imagery.",
        },
        null,
        2
      )
    );
    return;
  }

  console.log(
    JSON.stringify(
      {
        job: "catalog:media-curate",
        dryRun: DRY || true,
        policy: "generated_art_only",
        public: all.length,
        withHostedImage: all.length - missing.length,
        missingHostedImage: missing.length,
        sample,
        note:
          "No venue-photo scrape. Find/ingest upload already attaches generated art when publishing. Enable own-photo product mode before writing discovered imagery.",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
