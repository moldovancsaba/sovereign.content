#!/usr/bin/env node
/**
 * Client-feedback P1 continue — weak About chrome, strong-identity dupes,
 * host_sites→own_premises when a facility clearly has its own street address,
 * residual activity sanitize.
 *
 * Usage:
 *   node scripts/catalog-loop/repair-client-feedback-p1.cjs
 *   node scripts/catalog-loop/repair-client-feedback-p1.cjs --apply
 */
require("../load-env.cjs");
const { MongoClient } = require("mongodb");
const { sanitizeActivityTypes, decodeHtmlEntities, digitsPhone } = require("./lib/geoConsistency.cjs");

const APPLY = process.argv.includes("--apply");

/** Store-policy / careers / donate-nav / April Fool / template chrome — not parent-facing program About. */
const WEAK_ABOUT_RE =
  /Used to get facts about the stores? policies|return policy|shipping policy|This is a page with some basic contact information|Discover career opportunities|We're hiring|job openings|Join the TADA|DONATE\s*enroll|Mysterious Yaks|April Fool|flipbook software|We love feedback, email us your thoughts|High Holidays Schedule|Membership For 20\d\d Is Now Open/i;

const STREET_RE =
  /\b\d{1,5}\s+[a-z0-9.'\- ]{2,40}\b(street|st\.?|avenue|ave\.?|boulevard|blvd\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|place|pl\.?|court|ct\.?|way|parkway|pkwy\.?|plaza|terrace|broadway)\b/i;
const OWN_PREMISES_RE =
  /\b(our studio|our facility|our gym|our (?:location|center) at|visit us at|come visit our|our (?:dojo|academy building))\b/i;
const HOST_SITE_RE =
  /\b(host sites?|partners? with schools?|in schools?|at your school|after-?school program|we come to (?:you|your school)|nyc-?wide|city-?wide|at nypl|c\/o\b)\b/i;
const FACILITY_NAME_RE = /\b(studio|academy|gym(?:nastics)?|dojo|center|rink|foundation)\b/i;

/** Hand-curated keep/hide pairs from the client audit. */
const STRONG_DUPES = [
  {
    hide: "prov-tinyout-cumbe-center-for-african-and-diaspora-dance",
    keep: "prov-drive-sheets-cumbe-center-for-african-and-diaspora-dance",
    reason: "duplicate_identity_cumbe",
  },
  {
    hide: "prov-drive-sheets-physique-swimming",
    keep: "prov-drive-sheets-physique-swimming-upper-east-side",
    reason: "duplicate_identity_physique",
  },
  {
    hide: "prov-drive-sheets-trail-blazers-brooklyn-summer-camp",
    keep: "prov-drive-sheets-trail-blazers",
    reason: "duplicate_identity_trail_blazers_camp",
  },
  {
    hide: "prov-tinyout-johnny-karate-nyc-jma-brazilian-jiu-jitsu",
    keep: "prov-johnny-karate-nyc",
    reason: "duplicate_identity_johnny_karate",
  },
  {
    hide: "prov-drive-sheets-brooklyn-aikikai-kids",
    keep: "prov-brooklyn-aikikai",
    reason: "duplicate_identity_brooklyn_aikikai",
  },
];

function isWeakAbout(doc) {
  const blob = `${doc.shortDescription || ""}\n${doc.longDescription || ""}\n${doc.description || ""}`;
  return WEAK_ABOUT_RE.test(blob);
}

function normName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function streetKey(address) {
  const s = String(address || "").toLowerCase();
  const m = s.match(/\b(\d{1,5})\s+([a-z0-9.'\-]+)/);
  if (!m) return "";
  return `${m[1]}|${m[2].replace(/\./g, "")}`;
}

function scoreKeep(doc) {
  let score = 0;
  if (!/^prov-drive-sheets-/.test(doc.id) && !/^prov-tinyout-/.test(doc.id)) score += 40;
  if (/^prov-drive-sheets-/.test(doc.id)) score -= 10;
  if (/^prov-tinyout-/.test(doc.id)) score -= 5;
  if (Array.isArray(doc.ageRanges) && doc.ageRanges.length) score += 20;
  if (doc.address && STREET_RE.test(doc.address)) score += 10;
  if (doc.phone) score += 5;
  if (doc.email) score += 5;
  if (doc.website) score += 5;
  return score;
}

function shouldReclassToOwnPremises(doc) {
  if (doc.venueModel !== "host_sites") return false;
  const name = doc.name || "";
  const body = `${doc.shortDescription || ""} ${doc.longDescription || ""}`;
  if (HOST_SITE_RE.test(`${name} ${body}`)) return false;
  if (!STREET_RE.test(doc.address || "")) return false;
  if (OWN_PREMISES_RE.test(`${name} ${body}`)) return true;
  // Facility-named providers with a street and no host phrasing — treat as own premises.
  if (FACILITY_NAME_RE.test(name) && !/\bat\b.+\b(school|nypl|ymca|park)\b/i.test(name)) return true;
  return false;
}

async function hideIfNeeded(col, hideId, keepId, reason, report) {
  const hideDoc = await col.findOne(
    { id: hideId },
    { projection: { id: 1, name: 1, visibility: 1 } }
  );
  const keepDoc = await col.findOne({ id: keepId }, { projection: { id: 1, name: 1 } });
  if (!hideDoc || !keepDoc) {
    report.dupes.push({ hide: hideId, keep: keepId, reason, status: "missing_row" });
    return;
  }
  if (hideDoc.visibility === "hidden") {
    report.dupes.push({ hide: hideId, keep: keepId, reason, status: "already_hidden", name: hideDoc.name });
    return;
  }
  report.dupes.push({
    hide: hideId,
    keep: keepId,
    reason,
    status: APPLY ? "hidden" : "would_hide",
    name: hideDoc.name,
  });
  if (APPLY) {
    await col.updateOne(
      { id: hideId },
      {
        $set: {
          visibility: "hidden",
          qualityStatus: "quarantined",
          quarantineReason: `Duplicate of ${keepId} (${reason})`,
          quarantinedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );
    report.patched += 1;
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || "classscoutcluster").collection("providers");

  const report = {
    apply: APPLY,
    weakAbout: [],
    dupes: [],
    venueReclass: [],
    tagFixes: [],
    patched: 0,
  };

  try {
    // 1) Hand-curated strong dupes
    for (const d of STRONG_DUPES) {
      await hideIfNeeded(col, d.hide, d.keep, d.reason, report);
    }

    // 2) Auto exact-name + same phone + same street-number pairs (prefer curated over drive-sheets/tinyout)
    const publicRows = await col
      .find({ visibility: { $ne: "hidden" } })
      .project({
        id: 1,
        name: 1,
        phone: 1,
        address: 1,
        ageRanges: 1,
        email: 1,
        website: 1,
        visibility: 1,
      })
      .toArray();
    const byKey = new Map();
    for (const r of publicRows) {
      const phone = digitsPhone(r.phone);
      const street = streetKey(r.address);
      const name = normName(r.name);
      if (!name || phone.length < 10 || !street) continue;
      const key = `${name}||${phone}||${street}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(r);
    }
    const seenHide = new Set(report.dupes.map((d) => d.hide));
    for (const [, list] of byKey) {
      if (list.length < 2) continue;
      list.sort((a, b) => scoreKeep(b) - scoreKeep(a));
      const keep = list[0];
      for (const loser of list.slice(1)) {
        if (seenHide.has(loser.id) || loser.id === keep.id) continue;
        // Never hide when addresses clearly differ beyond street key (already same key).
        seenHide.add(loser.id);
        await hideIfNeeded(col, loser.id, keep.id, "auto_exact_name_phone_street", report);
      }
    }

    // 3) Walk public rows for weak About / tags / venue reclass
    const cursor = col.find({ visibility: { $ne: "hidden" } }).project({
      id: 1,
      name: 1,
      shortDescription: 1,
      longDescription: 1,
      description: 1,
      activityTypes: 1,
      website: 1,
      address: 1,
      venueModel: 1,
    });
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const set = {};
      const notes = [];

      if (isWeakAbout(doc)) {
        set.shortDescription = "";
        set.longDescription = "";
        if (doc.description) set.description = "";
        set.visibility = "hidden";
        set.qualityStatus = "quarantined";
        set.quarantineReason =
          "Weak/non-program About chrome (client feedback) — Improve from official page before re-publish";
        set.quarantinedAt = new Date().toISOString();
        notes.push("quarantine_weak_about");
        report.weakAbout.push({ id: doc.id, name: doc.name });
      }

      if (shouldReclassToOwnPremises(doc)) {
        set.venueModel = "own_premises";
        notes.push("venue_host_to_own_premises");
        report.venueReclass.push({ id: doc.id, name: doc.name, address: doc.address });
      }

      const acts = sanitizeActivityTypes(doc);
      if (acts) {
        set.activityTypes = acts;
        notes.push("sanitize_activity_types");
        report.tagFixes.push({ id: doc.id, name: doc.name, activityTypes: acts });
      }

      const decoded = decodeHtmlEntities(doc.name);
      if (decoded !== doc.name) {
        set.name = decoded;
        notes.push("decode_name");
      }

      if (!notes.length) continue;
      set.updatedAt = new Date().toISOString();
      // Do not stamp lastContentRepair* — outside curatedProviderSchema; blocks ingest (rule 437).
      if (APPLY) {
        await col.updateOne({ id: doc.id }, { $set: set });
        report.patched += 1;
      }
    }
  } finally {
    await client.close();
  }

  console.log(
    JSON.stringify(
      {
        apply: APPLY,
        patched: report.patched,
        weakAboutCount: report.weakAbout.length,
        weakAbout: report.weakAbout.slice(0, 20),
        dupeCount: report.dupes.filter((d) => d.status === "hidden" || d.status === "would_hide").length,
        dupes: report.dupes.filter((d) => d.status !== "already_hidden"),
        venueReclassCount: report.venueReclass.length,
        venueReclass: report.venueReclass,
        tagFixCount: report.tagFixes.length,
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
