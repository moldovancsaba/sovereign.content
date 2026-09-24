#!/usr/bin/env node
/**
 * Repair weak public descriptions on live listings using official-page about evidence.
 *
 * Flags:
 *   --dry-run — compose candidates; do not POST ingest
 *   --limit N — max patches (default 40; env CATALOG_DESC_REPAIR_LIMIT)
 *   --ids id1,id2 — prioritize these provider ids (env CATALOG_DESC_REPAIR_IDS)
 */
require("./_productRoot.cjs").loadProductEnv();
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const { deepEnrichOfficialSite } = require("./lib/deepEnrichOfficialSite.cjs");
const { isWeakListingCopy, composeListingCopy } = require("./lib/composeListingCopy.cjs");
const { appendEvent } = require("./lib/events.cjs");
const { isDryRun, limitFromArgs, idsFromArgs } = require("./lib/cliFlags.cjs");

const KEY = process.env.INGEST_API_KEY;
const BASE = process.env.CATALOG_LOOP_BASE || "https://getyourfield.com";
const DRY = isDryRun();
const LIMIT = limitFromArgs("CATALOG_DESC_REPAIR_LIMIT", 40);
const PRIORITY_IDS = idsFromArgs("CATALOG_DESC_REPAIR_IDS");

function isPublic(row) {
  return (
    row.visibility !== "hidden" &&
    row.qualityStatus !== "quarantined" &&
    row.discoveryTier !== "browse_only"
  );
}

async function main() {
  if (!DRY && !KEY) throw new Error("INGEST_API_KEY missing");
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const col = client.db("classscoutcluster").collection("providers");
  const all = (await col.find({}).toArray()).filter(isPublic);
  await client.close();

  const weak = all.filter((r) => {
    if (!r.website || !/^https?:/i.test(r.website)) return false;
    if (PRIORITY_IDS.includes(r.id)) return true;
    return isWeakListingCopy(r.shortDescription || "", r.longDescription || "");
  });
  weak.sort((a, b) => {
    const ap = PRIORITY_IDS.includes(a.id) ? 0 : 1;
    const bp = PRIORITY_IDS.includes(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const adrive = /^prov-drive-sheets-/.test(a.id) ? 0 : 1;
    const bdrive = /^prov-drive-sheets-/.test(b.id) ? 0 : 1;
    if (adrive !== bdrive) return adrive - bdrive;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  const batch = weak.slice(0, LIMIT);
  console.log(
    JSON.stringify({
      dryRun: DRY,
      public: all.length,
      weak: weak.length,
      batch: batch.length,
      priorityHit: batch.filter((r) => PRIORITY_IDS.includes(r.id)).map((r) => r.id),
    })
  );

  const operations = [];
  const skipped = [];
  for (const row of batch) {
    let deep;
    try {
      deep = await deepEnrichOfficialSite(
        { id: row.id, name: row.name, website: row.website },
        { maxPages: Number(process.env.CATALOG_DESC_REPAIR_PAGES || 4) }
      );
    } catch (e) {
      skipped.push({ id: row.id, reason: `enrich:${e.message || e}` });
      continue;
    }
    if (!deep) deep = {};
    const composed = composeListingCopy({
      name: row.name,
      borough: row.borough,
      neighborhood: row.neighborhood,
      address: row.address,
      activityTypes: row.activityTypes,
      aboutText: deep.aboutText || "",
      aboutSource: deep.aboutSource,
      services: row.activityTypes,
    });
    // Prefer page evidence; accept place fallback only when the live copy is still weak/broken
    // and the fallback itself is not weak (cleaner than HTML/chrome residue / Drive boilerplate).
    if (!composed) {
      skipped.push({ id: row.id, reason: "compose_failed" });
      continue;
    }
    if (composed.quality !== "page_evidence") {
      const fallbackOk =
        composed.quality === "place_fallback" &&
        !isWeakListingCopy(composed.shortDescription, composed.longDescription);
      if (!fallbackOk) {
        skipped.push({
          id: row.id,
          reason:
            deep.aboutText && String(deep.aboutText).length >= 40
              ? "compose_failed"
              : "no_about_evidence",
        });
        continue;
      }
    }
    if (
      composed.shortDescription === row.shortDescription &&
      composed.longDescription === row.longDescription
    ) {
      skipped.push({ id: row.id, reason: "unchanged" });
      continue;
    }
    const now = new Date().toISOString();
    const sourceUrl = (deep.pages && deep.pages[0]) || row.website;
    operations.push({
      resource: "provider",
      action: "patch",
      id: row.id,
      patch: {
        shortDescription: composed.shortDescription,
        longDescription: composed.longDescription,
        fieldVerifications: [
          {
            field: "shortDescription",
            verifiedAt: now,
            sourceUrl,
            method: "official_page",
            verifiedBy: "catalog-loop",
          },
          {
            field: "longDescription",
            verifiedAt: now,
            sourceUrl,
            method: "official_page",
            verifiedBy: "catalog-loop",
          },
        ],
      },
      _name: row.name,
    });
  }

  console.log(
    "to patch",
    operations.length,
    operations.map((o) => o.id).join(", ")
  );
  if (!operations.length) {
    console.log(JSON.stringify({ dryRun: DRY, patched: 0, skipped }));
    return;
  }

  if (DRY) {
    console.log(
      JSON.stringify({
        dryRun: true,
        wouldPatch: operations.length,
        sample: operations.slice(0, 5).map((o) => ({
          id: o.id,
          name: o._name,
          short: o.patch.shortDescription.slice(0, 120),
        })),
        skipped: skipped.slice(0, 20),
        skippedTotal: skipped.length,
      })
    );
    return;
  }

  // Patch one-by-one so one chrome reject does not block the rest.
  let patched = 0;
  const failed = [];
  for (const op of operations) {
    const { _name, ...clean } = op;
    const res = await fetch(`${BASE}/api/ingest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ operations: [clean] }),
    });
    const body = await res.json().catch(() => ({}));
    const ok = res.status === 200;
    appendEvent("improve_apply", {
      providerId: op.id,
      lane: "description_repair",
      ok,
      ingestStatus: res.status,
    });
    if (ok) {
      patched += 1;
      console.log("patched", op.id, _name);
    } else {
      failed.push({ id: op.id, status: res.status, error: JSON.stringify(body).slice(0, 200) });
      console.log("fail", op.id, res.status, JSON.stringify(body).slice(0, 200));
    }
  }

  console.log(
    JSON.stringify({
      dryRun: false,
      patched,
      failed: failed.length,
      failedSample: failed.slice(0, 5),
      sample: operations.slice(0, 5).map((o) => ({
        id: o.id,
        name: o._name,
        short: o.patch.shortDescription.slice(0, 120),
      })),
      skipped: skipped.slice(0, 20),
      skippedTotal: skipped.length,
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
