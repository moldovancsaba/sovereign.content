#!/usr/bin/env node
/**
 * Strip meta chrome from public descriptions ("Address on record", "serves families in"),
 * sanitize JSON-scrap / CSS-junk addresses, peel venue-prefix streets, and recompose weak
 * about prose (including unresolved `{template_tokens}`).
 *
 * Flags:
 *   --dry-run — compute patches; do not POST ingest
 *   --limit N — max patches (default 80; env CATALOG_META_REPAIR_LIMIT)
 *   --ids id1,id2 — prioritize these provider ids (env CATALOG_META_REPAIR_IDS)
 */
require("./_productRoot.cjs").loadProductEnv();
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const {
  cleanStreetAddress,
  isUsableStreetLine,
  hasStreetAddress,
  extractFromHtml,
  pickStreetAddress,
} = require("./lib/extractOfficialPage.cjs");
const {
  isWeakListingCopy,
  composeListingCopy,
  sanitizeListingCopyText,
  stripMetaListingChrome,
  extractAboutEvidence,
} = require("./lib/composeListingCopy.cjs");
const { appendEvent } = require("./lib/events.cjs");
const { isDryRun, limitFromArgs, idsFromArgs } = require("./lib/cliFlags.cjs");

const KEY = process.env.INGEST_API_KEY;
const BASE = process.env.CATALOG_LOOP_BASE || "https://getyourfield.com";
const DRY = isDryRun();
const LIMIT = limitFromArgs("CATALOG_META_REPAIR_LIMIT", 80);
const PRIORITY_IDS = idsFromArgs("CATALOG_META_REPAIR_IDS");

function isPublic(row) {
  return (
    row.visibility !== "hidden" &&
    row.qualityStatus !== "quarantined" &&
    row.discoveryTier !== "browse_only"
  );
}

function boroughOfAddress(addr) {
  const a = String(addr || "").toLowerCase();
  if (/\bbrooklyn\b/.test(a)) return "brooklyn";
  if (/\bqueens\b/.test(a)) return "queens";
  if (/\bbronx\b/.test(a)) return "bronx";
  if (/\bstaten island\b/.test(a)) return "staten island";
  if (/\bmanhattan\b|\bnew york\b/.test(a)) return "manhattan";
  return "";
}

function resolvedAddress(row, pageStreet) {
  const raw = String(row.address || "").trim();
  const cleaned = cleanStreetAddress(raw);
  if (isUsableStreetLine(cleaned)) return cleaned;
  if (pageStreet && isUsableStreetLine(pageStreet)) {
    const want = String(row.borough || "").toLowerCase();
    const got = boroughOfAddress(pageStreet);
    // Reject cross-borough page hits (e.g. Parks HQ on Fifth Ave for a Queens center).
    if (!want || !got || got === want) return pageStreet;
  }
  if (hasStreetAddress(raw)) return raw;
  return "";
}

function needsMetaRepair(row) {
  const blob = `${row.shortDescription || ""}\n${row.longDescription || ""}`;
  if (isWeakListingCopy(row.shortDescription || "", row.longDescription || "")) return true;
  if (/\baddress on record:/i.test(blob)) return true;
  if (/\bserves families in\b/i.test(blob)) return true;
  if (/\bis listed for families in\b/i.test(blob)) return true;
  if (/[\\]*["'].*email/i.test(blob)) return true;
  if (/\{[a-z][a-z0-9_]{2,}\}/i.test(blob)) return true;
  const addr = String(row.address || "");
  if (!addr) return false;
  if (!hasStreetAddress(addr)) {
    const cleaned = cleanStreetAddress(addr);
    // Sanitizable dirty form, or junk that should be cleared / page-replaced.
    if (isUsableStreetLine(cleaned) && cleaned !== addr.trim()) return true;
    if (!isUsableStreetLine(cleaned)) return true;
  } else {
    const cleaned = cleanStreetAddress(addr);
    if (isUsableStreetLine(cleaned) && cleaned !== addr.trim()) return true;
  }
  return false;
}

async function fetchPageStreet(row) {
  const website = String(row.website || "").trim();
  if (!website || !/^https?:/i.test(website)) return "";
  try {
    const res = await fetch(website, {
      headers: { "User-Agent": "Mozilla/5.0 ClassScoutCatalogBot/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const ex = extractFromHtml(html, res.url || website);
    return pickStreetAddress(ex.streetAddresses || [], {
      borough: row.borough,
      neighborhood: row.neighborhood,
    });
  } catch {
    return "";
  }
}

async function main() {
  if (!DRY && !KEY) throw new Error("INGEST_API_KEY missing");
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const col = client.db("classscoutcluster").collection("providers");
  const all = (await col.find({}).toArray()).filter(isPublic);
  await client.close();

  const dirty = all.filter((r) => PRIORITY_IDS.includes(r.id) || needsMetaRepair(r));
  dirty.sort((a, b) => {
    const ap = PRIORITY_IDS.includes(a.id) ? 0 : 1;
    const bp = PRIORITY_IDS.includes(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  const batch = dirty.slice(0, LIMIT);
  console.log(
    JSON.stringify({
      dryRun: DRY,
      public: all.length,
      dirty: dirty.length,
      batch: batch.length,
      priorityHit: batch.filter((r) => PRIORITY_IDS.includes(r.id)).map((r) => r.id),
    })
  );

  let patched = 0;
  const failed = [];
  const skipped = [];
  const wouldPatch = [];

  async function commitPatch(row, patch, label) {
    if (!Object.keys(patch).length) {
      skipped.push({ id: row.id, reason: "unchanged" });
      return;
    }
    if (DRY) {
      wouldPatch.push({ id: row.id, name: row.name, keys: Object.keys(patch), label });
      patched += 1;
      console.log("dry-run", label, row.id, row.name, Object.keys(patch).join(","));
      return;
    }
    const res = await fetch(`${BASE}/api/ingest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        operations: [{ resource: "provider", action: "patch", id: row.id, patch }],
      }),
    });
    const body = await res.json().catch(() => ({}));
    const ok = res.status === 200;
    appendEvent("improve_apply", {
      providerId: row.id,
      lane: "meta_chrome_repair",
      ok,
      ingestStatus: res.status,
    });
    if (ok) {
      patched += 1;
      console.log("patched", label, row.id, row.name, patch.address ? `addr=${patch.address}` : "desc");
    } else {
      failed.push({ id: row.id, status: res.status, error: JSON.stringify(body).slice(0, 200) });
      console.log("fail", row.id, res.status, JSON.stringify(body).slice(0, 200));
    }
  }

  for (const row of batch) {
    const rawAddr = String(row.address || "").trim();
    let pageStreet = "";
    if (rawAddr && !hasStreetAddress(rawAddr) && !isUsableStreetLine(cleanStreetAddress(rawAddr))) {
      pageStreet = await fetchPageStreet(row);
    }
    const address = resolvedAddress(row, pageStreet);

    const strippedLong = stripMetaListingChrome(
      sanitizeListingCopyText(String(row.longDescription || ""))
    );
    const strippedShort = stripMetaListingChrome(
      sanitizeListingCopyText(String(row.shortDescription || ""))
    );
    let aboutText =
      strippedLong.length >= 40
        ? strippedLong
        : strippedShort.length >= 40
          ? strippedShort
          : "";
    if (
      !aboutText ||
      isWeakListingCopy(strippedShort || aboutText.slice(0, 120), aboutText || strippedShort)
    ) {
      if (row.website && /^https?:/i.test(row.website)) {
        try {
          const res = await fetch(row.website, {
            headers: { "User-Agent": "Mozilla/5.0 ClassScoutCatalogBot/1.0" },
            redirect: "follow",
            signal: AbortSignal.timeout(12000),
          });
          if (res.ok) {
            const about = extractAboutEvidence(await res.text());
            if (about.aboutText && about.aboutText.length >= 40) {
              aboutText = about.aboutText;
            }
          }
        } catch {
          /* keep stripped local about */
        }
      }
    }

    const composed = composeListingCopy({
      name: row.name,
      borough: row.borough,
      neighborhood: row.neighborhood,
      address,
      activityTypes: row.activityTypes,
      aboutText,
      aboutSource: aboutText ? "sanitize_existing" : null,
      services: row.activityTypes,
    });

    if (!composed || isWeakListingCopy(composed.shortDescription, composed.longDescription)) {
      if (address !== rawAddr && (address || rawAddr)) {
        const addrOnly = { address };
        const now = new Date().toISOString();
        addrOnly.fieldVerifications = [
          {
            field: "address",
            verifiedAt: now,
            sourceUrl: row.website || BASE,
            method: "official_page",
            verifiedBy: "catalog-loop",
          },
        ];
        await commitPatch(row, addrOnly, "address-only");
        continue;
      }
      skipped.push({ id: row.id, reason: "compose_failed" });
      continue;
    }

    const patch = {};
    if (
      composed.shortDescription !== row.shortDescription ||
      composed.longDescription !== row.longDescription
    ) {
      patch.shortDescription = composed.shortDescription;
      patch.longDescription = composed.longDescription;
    }
    if (address !== rawAddr) {
      patch.address = address;
    }
    if (!Object.keys(patch).length) {
      skipped.push({ id: row.id, reason: "unchanged" });
      continue;
    }

    const now = new Date().toISOString();
    const vers = [];
    if (patch.shortDescription) {
      vers.push({
        field: "shortDescription",
        verifiedAt: now,
        sourceUrl: row.website || BASE,
        method: "official_page",
        verifiedBy: "catalog-loop",
      });
      vers.push({
        field: "longDescription",
        verifiedAt: now,
        sourceUrl: row.website || BASE,
        method: "official_page",
        verifiedBy: "catalog-loop",
      });
    }
    if (Object.prototype.hasOwnProperty.call(patch, "address")) {
      vers.push({
        field: "address",
        verifiedAt: now,
        sourceUrl: row.website || BASE,
        method: "official_page",
        verifiedBy: "catalog-loop",
      });
    }
    patch.fieldVerifications = vers;
    await commitPatch(row, patch, "meta");
  }

  console.log(
    JSON.stringify({
      dryRun: DRY,
      patched,
      failed: failed.length,
      failedSample: failed.slice(0, 5),
      wouldPatchSample: wouldPatch.slice(0, 10),
      skipped: skipped.slice(0, 15),
      skippedTotal: skipped.length,
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
