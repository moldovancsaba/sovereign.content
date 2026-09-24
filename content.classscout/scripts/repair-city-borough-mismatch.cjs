#!/usr/bin/env node
/**
 * Hide or correct providers whose `city` disagrees with `cityOwningBorough(borough)`.
 *
 * Live 2026-09-24: `city: "bos"` + `borough: "Central LA"` rows on the Boston browse list
 * (SIJCC misfiled; Soccer City Wilbraham MA with an LA region). Ingest now rejects these
 * (rule 447); this script cleans existing rows.
 *
 *   node scripts/catalog-loop/repair-city-borough-mismatch.cjs           # dry-run
 *   node scripts/catalog-loop/repair-city-borough-mismatch.cjs --apply
 */
require("./_productRoot.cjs").loadProductEnv();
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const {
  NYC_BOROUGHS,
  LA_AREAS,
  BOSTON_AREAS,
  cityForSystemRegion,
} = require("./lib/systemRegions.cjs");

const APPLY = process.argv.includes("--apply");
const REGION_CITY = Object.fromEntries([
  ...NYC_BOROUGHS.map((r) => [r, "nyc"]),
  ...LA_AREAS.map((r) => [r, "la"]),
  ...BOSTON_AREAS.map((r) => [r, "bos"]),
]);

function owningCity(borough) {
  return REGION_CITY[String(borough || "").trim()] || cityForSystemRegion(borough) || null;
}

/** Address clearly outside the owning city's geography → hide, do not just retag city. */
function addressContradictsOwningCity(address, owning) {
  const a = String(address || "");
  if (owning === "la") {
    // Western MA / NJ / NYC-shaped when claiming LA
    if (/,\s*MA\s+\d{5}/i.test(a) && !/\b(Boston|Cambridge|Brookline)\b/i.test(a)) return true;
    if (/Wilbraham|Springfield|Worcester/i.test(a)) return true;
  }
  if (owning === "bos") {
    if (/,\s*CA\s+\d{5}/i.test(a) || /\bLos Angeles\b/i.test(a)) return true;
  }
  if (owning === "nyc") {
    if (/,\s*CA\s+\d{5}/i.test(a) || /,\s*MA\s+\d{5}/i.test(a)) return true;
  }
  return false;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || "classscoutcluster").collection("providers");
  const now = new Date().toISOString();

  const rows = await col
    .find(
      { visibility: { $ne: "hidden" } },
      { projection: { id: 1, name: 1, city: 1, borough: 1, address: 1, neighborhood: 1, website: 1 } }
    )
    .toArray();

  const report = { apply: APPLY, fixed: [], hidden: [], skipped: [] };

  for (const row of rows) {
    const owning = owningCity(row.borough);
    const city = row.city || "nyc";
    if (!owning || owning === city) continue;

    if (addressContradictsOwningCity(row.address, owning)) {
      report.hidden.push({
        id: row.id,
        name: row.name,
        city,
        borough: row.borough,
        address: row.address,
        reason: "address_contradicts_owning_city",
      });
      if (APPLY) {
        await col.updateOne(
          { id: row.id },
          {
            $set: {
              visibility: "hidden",
              qualityStatus: "quarantined",
              quarantineReason: `city/borough mismatch: city="${city}" borough="${row.borough}" but address contradicts owning city "${owning}"`,
              quarantinedAt: now,
              updatedAt: now,
            },
          }
        );
      }
      continue;
    }

    // Safe retag: borough is a real system region and address does not contradict it.
    report.fixed.push({
      id: row.id,
      name: row.name,
      oldCity: city,
      newCity: owning,
      borough: row.borough,
      address: row.address,
    });
    if (APPLY) {
      await col.updateOne(
        { id: row.id },
        {
          $set: { city: owning, updatedAt: now },
          $unset: { geo: "" }, // rule 37 — drop pin until geocode re-runs for the correct city
        }
      );
    }
  }

  console.log(JSON.stringify(report, null, 2));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
