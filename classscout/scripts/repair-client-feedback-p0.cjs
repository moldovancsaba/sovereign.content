#!/usr/bin/env node
/**
 * Client-feedback P0 repair — geo borough mismatches, outside-NYC hide,
 * placeholder/contaminated contacts, junk addresses, HTML entity names,
 * high-precision sport-tag corrections.
 *
 * Usage:
 *   node scripts/catalog-loop/repair-client-feedback-p0.cjs --dry-run
 *   node scripts/catalog-loop/repair-client-feedback-p0.cjs --apply
 */
require("../load-env.cjs");
const { MongoClient } = require("mongodb");
const {
  geoRepairPlan,
  isPlaceholderEmail,
  isContaminatedPhone,
  decodeHtmlEntities,
  sanitizeActivityTypes,
} = require("./lib/geoConsistency.cjs");

/** Street-line gate aligned with extractOfficialPage junk patterns (CJS; no TS import). */
function hasStreetAddress(a) {
  const s = String(a || "").trim();
  if (s.length < 8) return false;
  if (/grid-md-col|target="_blank"|United States","email|businesLocationsSt/i.test(s)) return false;
  if (/Wall Street Journal survey|for the first time\. Finally/i.test(s)) return false;
  if (/takes place after regular school|dismissal\)/i.test(s)) return false;
  if (/^\d+\s+(broadway bound|broadway dance camp)/i.test(s)) return false;
  if (/Murrieta|Technology Dr Unit/i.test(s)) return false;
  if (/exceptional way that I haven/i.test(s)) return false;
  return /\d/.test(s) && /[a-z]/i.test(s);
}

const APPLY = process.argv.includes("--apply");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? Number(process.argv[i + 1]) || 0 : 0;
})();

function junkAddress(addr) {
  const s = String(addr || "").trim();
  if (!s) return false;
  if (!hasStreetAddress(s)) return true;
  if (/Murrieta|Technology Dr Unit\s*22/i.test(s)) return true;
  if (/grid-md-col|target="_blank"|","email|businesLocationsSt/i.test(s)) return true;
  if (/Wall Street Journal survey|exceptional way that I haven/i.test(s)) return true;
  if (/takes place after regular school|play soccer on the handball/i.test(s)) return true;
  if (/Broadway Dance Camp|Broadway Bound$/i.test(s)) return true;
  if (/Hours:\s*We\.?$/i.test(s)) return true;
  return false;
}

function buildPatch(doc) {
  const set = {};
  const unset = {};
  const notes = [];

  const geo = geoRepairPlan(doc);
  if (geo?.hide) {
    if (doc.visibility === "hidden" && /Outside public NYC/i.test(String(doc.quarantineReason || ""))) {
      // already quarantined for this reason — skip re-stamp
    } else {
      set.visibility = "hidden";
      set.qualityStatus = "quarantined";
      set.quarantineReason = "Outside public NYC coverage (client feedback geo)";
      set.quarantinedAt = new Date().toISOString();
      notes.push(geo.reason || "outside_nyc");
    }
  } else if (geo?.borough) {
    set.borough = geo.borough;
    notes.push(geo.reason);
  }

  if (junkAddress(doc.address)) {
    set.address = "";
    unset.coordinates = "";
    unset.lat = "";
    unset.lng = "";
    notes.push("clear_junk_address");
  }

  if (isPlaceholderEmail(doc.email)) {
    set.email = "";
    notes.push("clear_placeholder_email");
  }
  if (isContaminatedPhone(doc.phone)) {
    set.phone = "";
    notes.push("clear_contaminated_phone");
  }

  const decodedName = decodeHtmlEntities(doc.name);
  if (decodedName && decodedName !== doc.name) {
    set.name = decodedName;
    notes.push("decode_name_entities");
  }
  for (const field of ["shortDescription", "longDescription", "description"]) {
    if (!doc[field]) continue;
    const d = decodeHtmlEntities(doc[field]);
    if (d !== doc[field]) {
      set[field] = d;
      notes.push(`decode_${field}`);
    }
  }

  // Strip internal "prospect" wording from public names
  if (/\bprospect\b/i.test(String(set.name || doc.name || "")) && /prov-drive-sheets-/i.test(doc.id || "")) {
    const cleaned = String(set.name || doc.name).replace(/\s*prospect\s*/gi, " ").replace(/\s+/g, " ").trim();
    if (cleaned && cleaned !== (set.name || doc.name)) {
      set.name = cleaned;
      notes.push("strip_prospect_name");
    }
  }

  // Invented search-bucket ages (exact default triple from old mapAgeRanges) → clear so UI shows
  // "Age not confirmed" until Improve finds exact eligibility (client feedback).
  const ages = Array.isArray(doc.ageRanges) ? doc.ageRanges : [];
  if (
    ages.length === 3 &&
    ages.includes("3–5") &&
    ages.includes("6–8") &&
    ages.includes("9–12") &&
    !ages.some((a) => a === "0–2" || a === "Teens")
  ) {
    set.ageRanges = [];
    notes.push("clear_invented_age_buckets");
  }

  const acts = sanitizeActivityTypes({ ...doc, name: set.name || doc.name });
  if (acts) {
    set.activityTypes = acts;
    notes.push("sanitize_activity_types");
  }

  if (!notes.length) return null;
  set.updatedAt = new Date().toISOString();
  // Do not stamp lastContentRepair* — those keys are outside curatedProviderSchema
  // and make later ingest patches fail strict validation (rule 437).
  return { set, unset, notes };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || "classscoutcluster").collection("providers");

  const cursor = col.find({}).project({
    id: 1,
    name: 1,
    borough: 1,
    neighborhood: 1,
    address: 1,
    phone: 1,
    email: 1,
    visibility: 1,
    quarantineReason: 1,
    activityTypes: 1,
    ageRanges: 1,
    shortDescription: 1,
    longDescription: 1,
    description: 1,
  });

  const report = {
    scanned: 0,
    wouldPatch: 0,
    patched: 0,
    byNote: {},
    samples: [],
  };

  try {
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      report.scanned += 1;
      const patch = buildPatch(doc);
      if (!patch) continue;
      report.wouldPatch += 1;
      for (const n of patch.notes) report.byNote[n] = (report.byNote[n] || 0) + 1;
      if (report.samples.length < 40) {
        report.samples.push({ id: doc.id, name: doc.name, notes: patch.notes, set: patch.set });
      }
      if (APPLY) {
        const update = { $set: patch.set };
        if (Object.keys(patch.unset).length) update.$unset = patch.unset;
        await col.updateOne({ id: doc.id }, update);
        report.patched += 1;
      }
      if (LIMIT && report.wouldPatch >= LIMIT) break;
    }
  } finally {
    await client.close();
  }

  console.log(JSON.stringify({ apply: APPLY, ...report }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
