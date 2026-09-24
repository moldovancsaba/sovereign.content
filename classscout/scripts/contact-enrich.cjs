#!/usr/bin/env node
/**
 * Contact enrich — evidence-only phone / website / email fill (SC catalog:contact-enrich).
 *
 * Sources (never invent, never OSM/Maps search):
 *   1. Existing contactLinks / sourceText headers on the provider doc
 *   2. Official website homepage HTML via extractHardContacts
 *
 * `no_evidence` opens a soft research note on the recommendation store — does not invent.
 *
 * Flags: --dry-run --limit N --ids id1,id2
 */
require("./_productRoot.cjs").loadProductEnv();
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const { isDryRun, limitFromArgs, idsFromArgs } = require("./lib/cliFlags.cjs");
const { extractHardContacts } = require("./lib/extractOfficialPage.cjs");
const { isPlaceholderEmail, isContaminatedPhone } = require("./lib/geoConsistency.cjs");
const {
  loadRecommendations,
  saveRecommendations,
  upsertOpenRecommendation,
} = require("./lib/recommendationStore.cjs");
const { appendEvent } = require("./lib/events.cjs");
const { migrateTmpStateIfNeeded, ensureDir, DATA_DIR } = require("./lib/paths.cjs");

const DRY = isDryRun();
const LIMIT = limitFromArgs("CATALOG_CONTACT_ENRICH_LIMIT", 15);
const ONLY_IDS = new Set(idsFromArgs("CATALOG_CONTACT_ENRICH_IDS"));
const BASE = process.env.CATALOG_LOOP_BASE || "https://getyourfield.com";
const KEY = process.env.INGEST_API_KEY;

function isEligible(row) {
  return row.visibility !== "hidden" && row.qualityStatus !== "quarantined";
}

function hasPhone(r) {
  return Boolean(
    (r.phone && String(r.phone).trim()) ||
      (r.contactLinks || []).some((l) => l && (l.type === "phone" || /^tel:/i.test(l.url || "")))
  );
}

function hasEmail(r) {
  return Boolean(
    (r.email && String(r.email).trim()) ||
      (r.contactLinks || []).some((l) => l && l.type === "email")
  );
}

function hasWebsite(r) {
  return Boolean(r.website && String(r.website).trim());
}

function needsContact(row) {
  return !hasPhone(row) || !hasEmail(row) || !hasWebsite(row);
}

function contactsFromDoc(row) {
  const out = { phone: "", email: "", website: "" };
  if (row.phone) out.phone = String(row.phone).trim();
  if (row.email) out.email = String(row.email).trim();
  if (row.website) out.website = String(row.website).trim();
  for (const link of row.contactLinks || []) {
    if (!link) continue;
    if (!out.phone && (link.type === "phone" || /^tel:/i.test(link.url || ""))) {
      out.phone = String(link.url || "").replace(/^tel:/i, "").trim();
    }
    if (!out.email && link.type === "email") {
      out.email = String(link.url || "")
        .replace(/^mailto:/i, "")
        .trim();
    }
    if (!out.website && link.type === "website" && link.url) {
      out.website = String(link.url).trim();
    }
  }
  // Promotable sourceUrl (official page) when website blank.
  if (!out.website && Array.isArray(row.sourceUrls)) {
    const first = row.sourceUrls.map((u) => String(u || "").trim()).find((u) => /^https?:\/\//i.test(u));
    if (first && !/facebook|instagram|maps\.google|goo\.gl|yelp|tripadvisor/i.test(first)) {
      out.website = first;
    }
  }
  return out;
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "ClassScoutContactEnrich/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

async function ingestPatch(id, patch) {
  if (DRY) return { ok: true, dryRun: true };
  if (!KEY) throw new Error("INGEST_API_KEY missing");
  const res = await fetch(`${BASE}/api/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ action: "patch", id, patch }),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 200) };
}

async function main() {
  migrateTmpStateIfNeeded();
  ensureDir(DATA_DIR);
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  let rows;
  try {
    rows = (await client.db("classscoutcluster").collection("providers").find({}).toArray()).filter(
      isEligible
    );
  } finally {
    await client.close();
  }

  if (ONLY_IDS.size) rows = rows.filter((r) => ONLY_IDS.has(r.id));
  const candidates = rows.filter(needsContact).slice(0, LIMIT);

  const report = {
    job: "catalog:contact-enrich",
    dryRun: DRY,
    scanned: rows.length,
    needingContact: rows.filter(needsContact).length,
    attempted: 0,
    applied: 0,
    noEvidence: 0,
    skipped: 0,
    results: [],
  };

  const recDoc = loadRecommendations();

  for (const row of candidates) {
    report.attempted += 1;
    const fromDoc = contactsFromDoc(row);
    let phone = fromDoc.phone;
    let email = fromDoc.email;
    let website = fromDoc.website || (row.website ? String(row.website).trim() : "");

    if (website && (!phone || !email)) {
      const html = await fetchHtml(website);
      if (html) {
        const hard = extractHardContacts(html);
        if (!phone && hard.phone) phone = hard.phone;
        if (!email && hard.email) email = hard.email;
      }
    }

    if (email && isPlaceholderEmail(email)) email = "";
    if (phone && isContaminatedPhone(phone)) phone = "";

    const patch = {};
    if (!hasPhone(row) && phone) patch.phone = phone;
    if (!hasEmail(row) && email) patch.email = email;
    if (!hasWebsite(row) && website) patch.website = website;

    if (!Object.keys(patch).length) {
      report.noEvidence += 1;
      upsertOpenRecommendation(
        recDoc,
        {
          providerId: row.id,
          name: row.name || null,
          gaps: [
            !hasPhone(row) ? "blank_contacts" : null,
            !hasEmail(row) && hasPhone(row) ? "blank_email" : null,
            !hasWebsite(row) ? "missing_website" : null,
          ].filter(Boolean),
          lanes: ["contacts"],
          priority: !hasPhone(row) ? 20 : 55,
        },
        { forceReopen: false }
      );
      const last = (recDoc.recommendations || []).find((r) => r.providerId === row.id);
      if (last) {
        last.researchDebt = "no_evidence";
        last.source = last.source || "contact_enrich";
      }
      report.results.push({ id: row.id, outcome: "no_evidence" });
      appendEvent("contact_enrich_no_evidence", { providerId: row.id });
      continue;
    }

    const res = await ingestPatch(row.id, patch);
    if (res.ok) {
      report.applied += 1;
      report.results.push({ id: row.id, outcome: "applied", patch: Object.keys(patch) });
      appendEvent("contact_enrich_applied", { providerId: row.id, fields: Object.keys(patch), dryRun: DRY });
    } else {
      report.skipped += 1;
      report.results.push({ id: row.id, outcome: "ingest_reject", status: res.status });
    }
  }

  saveRecommendations(recDoc);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
