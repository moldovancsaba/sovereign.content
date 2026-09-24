#!/usr/bin/env node
/**
 * Sovereign Content job twin: catalog:archive-snapshot
 *
 * Dated JSON backup of public listing facts (URLs + About + contacts) on the
 * vertical tree. Mongo remains live SSOT. No image binaries.
 *
 * Writes: archive/classscout/content/<timestamp>/
 *   manifest.json · listings.json · curated-summary.json
 *
 * Flags: --dry-run · --limit N
 */
require("./_productRoot.cjs").loadProductEnv();
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const { isDryRun } = require("./lib/cliFlags.cjs");
const { loadRecommendations, openRecommendations } = require("./lib/recommendationStore.cjs");
const { aboutQualityScore } = require("./lib/aboutQualityScore.cjs");
const { isWeakListingCopy } = require("./lib/composeListingCopy.cjs");

const DRY = isDryRun();
const { flagValue } = require("./lib/cliFlags.cjs");
const limitRaw = flagValue("--limit");
const LIMIT = limitRaw && Number(limitRaw) > 0 ? Math.max(1, Number(limitRaw)) : 0; // 0 = all
const ROOT = path.resolve(__dirname, "../..");
const ARCHIVE_ROOT = path.join(ROOT, "archive", "classscout", "content");

function isPublic(row) {
  return (
    row.visibility !== "hidden" &&
    row.qualityStatus !== "quarantined" &&
    row.discoveryTier !== "browse_only"
  );
}

function factRow(row) {
  const short = row.shortDescription || "";
  const long = row.longDescription || "";
  const chromeWeak = isWeakListingCopy(short, long);
  const quality = aboutQualityScore(short, long, {
    name: row.name,
    place: row.borough || row.city,
    chrome: chromeWeak,
  });
  return {
    id: row.id,
    name: row.name || "",
    city: row.city || "",
    borough: row.borough || "",
    neighborhood: row.neighborhood || "",
    address: row.address || "",
    website: row.website || "",
    phone: row.phone || "",
    email: row.email || "",
    shortDescription: short,
    longDescription: long,
    image: row.image || row.imageUrl || "",
    activityTypes: row.activityTypes || [],
    ageRanges: row.ageRanges || [],
    venueModel: row.venueModel || null,
    updatedAt: row.updatedAt || null,
    aboutScore: quality.score,
    aboutPasses: quality.passes,
  };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(ARCHIVE_ROOT, stamp);

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  let rows;
  try {
    rows = (await client.db("classscoutcluster").collection("providers").find({}).toArray()).filter(
      isPublic
    );
  } finally {
    await client.close();
  }

  if (LIMIT > 0) rows = rows.slice(0, LIMIT);
  const listings = rows.map(factRow);
  const openRecs = openRecommendations(loadRecommendations());

  const manifest = {
    job: "catalog:archive-snapshot",
    vertical: "classscout",
    at: new Date().toISOString(),
    dryRun: DRY,
    listingCount: listings.length,
    openRecommendations: openRecs.length,
    note: "Recovery/audit copy of facts + media URLs. Live SSOT is Mongo. No binaries.",
  };

  const curatedSummary = {
    aboutPassing: listings.filter((l) => l.aboutPasses).length,
    aboutFailing: listings.filter((l) => !l.aboutPasses).length,
    withPhone: listings.filter((l) => l.phone).length,
    withWebsite: listings.filter((l) => l.website).length,
    withImage: listings.filter((l) => l.image).length,
  };

  if (DRY) {
    console.log(
      JSON.stringify(
        {
          ...manifest,
          outDir,
          curatedSummary,
          sampleIds: listings.slice(0, 5).map((l) => l.id),
        },
        null,
        2
      )
    );
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "listings.json"), `${JSON.stringify(listings, null, 2)}\n`);
  fs.writeFileSync(
    path.join(outDir, "curated-summary.json"),
    `${JSON.stringify(curatedSummary, null, 2)}\n`
  );

  // Keep a stable "latest" pointer (overwrite).
  const latest = path.join(ARCHIVE_ROOT, "latest");
  fs.mkdirSync(latest, { recursive: true });
  fs.writeFileSync(path.join(latest, "manifest.json"), `${JSON.stringify({ ...manifest, stamp }, null, 2)}\n`);
  fs.writeFileSync(path.join(latest, "curated-summary.json"), `${JSON.stringify(curatedSummary, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        ...manifest,
        outDir,
        curatedSummary,
        ok: true,
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
