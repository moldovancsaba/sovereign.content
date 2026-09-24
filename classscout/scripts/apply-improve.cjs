#!/usr/bin/env node
/**
 * Apply evidenced Improve patches (trial / sessions / contacts / price / age / address).
 * Supports single-lane scans and deep multi-field enrich results (lane=deep).
 * Evidence-only; reuses trial false-positive filters.
 *
 * Env:
 *   CATALOG_LOOP_EXTRA_FILES — colon-separated scan result JSON paths
 *   CATALOG_LOOP_LANE — optional filter when reading mixed files (skip for deep)
 */
require("./_productRoot.cjs").loadProductEnv();
const fs = require("fs");
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const { APPLY_LOG, DATA_DIR, ensureDir } = require("./lib/paths.cjs");
const { appendEvent } = require("./lib/events.cjs");
const {
  isBadTrialPolicy,
  normalizePhone,
  pickStreetAddress,
  hasStreetAddress,
  cleanStreetAddress,
  isUsableStreetLine,
} = require("./lib/extractOfficialPage.cjs");
const { isWeakListingCopy, composeListingCopy } = require("./lib/composeListingCopy.cjs");

const KEY = process.env.INGEST_API_KEY;
const BASE = process.env.CATALOG_LOOP_BASE || "https://getyourfield.com";
const now = new Date().toISOString();
const { isDryRun } = require("./lib/cliFlags.cjs");
const DRY = isDryRun();

/** Reject scrape placeholders that are not real mailboxes. */
function isUsableEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) return false;
  if (/^(user|name|email|test|example|you)@/i.test(e)) return false;
  if (/@(domain\.com|example\.com|email\.com|test\.com)$/i.test(e)) return false;
  return true;
}

function normalizePolicy(p) {
  if (!p) return null;
  const out = { ...p };
  if (typeof out.siblingDiscount === "string") {
    const s = out.siblingDiscount;
    out.siblingDiscount = true;
    if (!out.sourceText || out.sourceText.length < s.length) out.sourceText = s;
  }
  if (out.sourceText) {
    const ampNum = ["&", "#", "038", ";"].join("");
    out.sourceText = String(out.sourceText)
      .split(ampNum)
      .join("&")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600);
  }
  return out;
}

function loadResults() {
  const files = (process.env.CATALOG_LOOP_EXTRA_FILES || "").split(":").filter(Boolean);
  const byKey = new Map();
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(f, "utf8"));
    } catch {
      continue;
    }
    for (const r of doc.results || []) {
      if (!r || !r.id) continue;
      const lane = r.lane || doc.mode || "trial";
      if (process.env.CATALOG_LOOP_LANE && process.env.CATALOG_LOOP_LANE !== lane && lane !== "deep") {
        continue;
      }
      byKey.set(`${lane}:${r.id}`, { ...r, lane });
    }
  }
  return [...byKey.values()];
}

function verification(field, sourceUrl) {
  return {
    field,
    verifiedAt: now,
    sourceUrl: sourceUrl || BASE,
    method: "official_page",
    verifiedBy: "catalog-loop",
  };
}

function collectPatch(r, existing, rejects) {
  const sourceUrl = (r.pages && r.pages[0]) || r.sourceUrl || r.website;
  const patch = {};
  const vers = [];
  const lanesApplied = [];
  const want = r.lane === "deep" ? ["trial", "sessions", "contacts", "price", "age"] : [r.lane];

  if (want.includes("trial") && r.trialPolicy) {
    if (isBadTrialPolicy(r.trialPolicy)) {
      rejects.push({ id: r.id, lane: "trial", reason: "bad_trial" });
      appendEvent("improve_reject", { providerId: r.id, lane: "trial", reason: "bad_trial" });
    } else {
      const policy = normalizePolicy(r.trialPolicy);
      const keys = Object.keys(policy).filter((k) => k !== "sourceText");
      if (keys.length) {
        const ex = existing.trialPolicy || {};
        const skipFreeDowngrade =
          ex.trialIsFree === true && policy.trialIsFree !== true && !policy.siblingDiscount;
        const same =
          JSON.stringify({
            a: ex.trialAvailable,
            b: ex.trialIsFree,
            c: ex.dropInAllowed,
            d: ex.siblingDiscount,
          }) ===
          JSON.stringify({
            a: policy.trialAvailable,
            b: policy.trialIsFree,
            c: policy.dropInAllowed,
            d: policy.siblingDiscount,
          });
        if (!skipFreeDowngrade && !(same && ex.sourceText)) {
          patch.trialPolicy = policy;
          vers.push(verification("trialPolicy", sourceUrl));
          lanesApplied.push("trial");
        }
      }
    }
  }

  if (want.includes("sessions") && Array.isArray(r.sessions) && r.sessions.length) {
    if (!(Array.isArray(existing.sessions) && existing.sessions.length)) {
      const sessions = r.sessions.filter((s) => s && s.title && s.startDate && s.sourceText);
      if (sessions.length) {
        patch.sessions = sessions;
        vers.push(verification("sessions", sourceUrl));
        lanesApplied.push("sessions");
      }
    }
  }

  if (want.includes("contacts") && (r.phone || r.email)) {
    const phone = normalizePhone(r.phone || "");
    const email = isUsableEmail(r.email) ? String(r.email || "").trim() : "";
    const hasPhone =
      (existing.phone && String(existing.phone).trim()) ||
      (existing.contactLinks || []).some((l) => l && (l.type === "phone" || /^tel:/i.test(l.url || "")));
    const hasEmail =
      (existing.email && String(existing.email).trim()) ||
      (existing.contactLinks || []).some((l) => l && l.type === "email");
    const links = Array.isArray(existing.contactLinks) ? [...existing.contactLinks] : [];
    let contactsChanged = false;
    if (phone && !hasPhone) {
      patch.phone = phone;
      links.push({ type: "phone", label: "Phone", value: phone, url: `tel:${phone}` });
      vers.push(verification("phone", sourceUrl));
      contactsChanged = true;
    }
    if (email && !hasEmail) {
      patch.email = email;
      links.push({ type: "email", label: "Email", value: email, url: `mailto:${email}` });
      vers.push(verification("email", sourceUrl));
      contactsChanged = true;
    }
    if (contactsChanged) {
      patch.contactLinks = links;
      lanesApplied.push("contacts");
    }
  }

  if (want.includes("price") && r.price && r.price.evidence && r.price.evidence !== "unknown") {
    const ex = existing.price || {};
    if (!(ex.evidence && ex.evidence !== "unknown")) {
      patch.price = r.price;
      if (typeof r.pricePerClass === "number") patch.pricePerClass = r.pricePerClass;
      vers.push(verification("price", sourceUrl));
      lanesApplied.push("price");
    }
  }

  if (want.includes("age") && Array.isArray(r.ageRanges) && r.ageRanges.length) {
    const ex = existing.ageRanges || [];
    if (!(Array.isArray(ex) && ex.length)) {
      patch.ageRanges = r.ageRanges;
      vers.push(verification("ageRanges", sourceUrl));
      lanesApplied.push("age");
    }
  }

  // Repair empty / unusable addresses from deep enrich page streets (evidence-only).
  // Also sanitize entity/JSON-tainted streets already stored ("Avenue&lt;/p&gt;…", `","email`).
  {
    const cleanedExisting = cleanStreetAddress(existing.address || "");
    if (
      cleanedExisting &&
      isUsableStreetLine(cleanedExisting) &&
      cleanedExisting !== String(existing.address || "").trim()
    ) {
      patch.address = cleanedExisting;
      vers.push(verification("address", sourceUrl));
      lanesApplied.push("address");
    } else if (Array.isArray(r.streetAddresses) && r.streetAddresses.length) {
      const picked = pickStreetAddress(r.streetAddresses, existing);
      if (hasStreetAddress(picked) && !hasStreetAddress(existing.address || "")) {
        patch.address = picked;
        vers.push(verification("address", sourceUrl));
        lanesApplied.push("address");
      }
    }
  }

  // Replace inventory boilerplate descriptions with official-page about copy when available.
  // When about evidence is missing, place_fallback still clears Drive/RQK boilerplate so
  // weak_description recommendations can resolve instead of burning empty Improve cycles.
  {
    const currentWeak = isWeakListingCopy(existing.shortDescription || "", existing.longDescription || "");
    if (currentWeak) {
      const composed = composeListingCopy({
        name: existing.name || r.name || r.id,
        borough: existing.borough,
        neighborhood: existing.neighborhood,
        address: patch.address || existing.address,
        activityTypes: existing.activityTypes,
        aboutText: r.aboutText || "",
        aboutSource: r.aboutSource || "official_page",
        services: existing.activityTypes,
      });
      if (
        composed &&
        (composed.quality === "page_evidence" ||
          (composed.quality === "place_fallback" &&
            !isWeakListingCopy(composed.shortDescription, composed.longDescription)))
      ) {
        patch.shortDescription = composed.shortDescription;
        patch.longDescription = composed.longDescription;
        vers.push(verification("shortDescription", sourceUrl));
        vers.push(verification("longDescription", sourceUrl));
        lanesApplied.push("description");
      }
    }
  }

  if (!Object.keys(patch).length) return null;
  patch.fieldVerifications = vers;
  return { patch, lanesApplied };
}

async function main() {
  if (!DRY && !KEY) throw new Error("INGEST_API_KEY missing");
  ensureDir(DATA_DIR);
  const rows = loadResults();
  const client = new MongoClient(process.env.getyourfield_MONGODB_URI);
  await client.connect();
  const col = client.db("classscoutcluster").collection("providers");
  const operations = [];
  const rejects = [];

  for (const r of rows) {
    const existing = await col.findOne(
      { id: r.id },
      {
        projection: {
          trialPolicy: 1,
          sessions: 1,
          phone: 1,
          email: 1,
          contactLinks: 1,
          price: 1,
          ageRanges: 1,
          address: 1,
          borough: 1,
          neighborhood: 1,
          name: 1,
          activityTypes: 1,
          shortDescription: 1,
          longDescription: 1,
        },
      }
    );
    if (!existing) continue;
    const collected = collectPatch(r, existing, rejects);
    if (!collected) continue;
    operations.push({
      resource: "provider",
      action: "patch",
      id: r.id,
      patch: collected.patch,
      _lane: r.lane === "deep" ? `deep:${collected.lanesApplied.join("+")}` : r.lane,
      _lanes: collected.lanesApplied,
    });
  }

  console.log(
    "to apply",
    operations.length,
    operations.map((o) => `${o._lane}:${o.id}`).join(", ")
  );

  if (!operations.length) {
    fs.writeFileSync(
      APPLY_LOG,
      JSON.stringify({ at: now, dryRun: DRY, operations: [], rejects }, null, 2)
    );
    await client.close();
    return;
  }

  if (DRY) {
    console.log(
      JSON.stringify({
        dryRun: true,
        wouldApply: operations.length,
        sample: operations.slice(0, 15).map((o) => ({
          id: o.id,
          lane: o._lane,
          keys: Object.keys(o.patch || {}),
        })),
        rejects: rejects.slice(0, 20),
      })
    );
    fs.writeFileSync(
      APPLY_LOG,
      JSON.stringify({ at: now, dryRun: true, operations, rejects }, null, 2)
    );
    await client.close();
    return;
  }

  const payload = {
    operations: operations.map(({ _lane, _lanes, ...op }) => {
      void _lane;
      void _lanes;
      return op;
    }),
  };
  const res = await fetch(`${BASE}/api/ingest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  console.log(res.status, JSON.stringify(body).slice(0, 500));

  for (const op of operations) {
    appendEvent("improve_apply", {
      providerId: op.id,
      lane: op._lane,
      lanes: op._lanes,
      ingestStatus: res.status,
      ok: res.status === 200,
    });
  }
  if (res.status !== 200) {
    appendEvent("ingest_reject", { context: "improve_apply", status: res.status });
  }

  fs.writeFileSync(
    APPLY_LOG,
    JSON.stringify({ at: now, dryRun: false, operations, rejects, body, status: res.status }, null, 2)
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
