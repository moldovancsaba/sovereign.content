#!/usr/bin/env node
/**
 * One-shot: import EVERY provider tab from Drive research workbooks into find-seeds.json.
 *
 * Reads all .xlsx / .xlsm under DRIVE_SHEETS_DIR (default /tmp/provider-research).
 * A sheet is a provider tab when its header row includes a provider-name column and a
 * website/URL column (e.g. "Provider / Company" + "Website / Research URL").
 * Source-directory, query-seed, summary, and notes tabs are skipped.
 *
 * Dedupes against existing find-seeds by seed id and normalized website URL.
 * Activity tags come from Primary Category + Offerings / Keywords (and sports-tab variants).
 *
 * Env:
 *   DRIVE_SHEETS_DIR   workbook directory (default /tmp/provider-research)
 *   DRIVE_SHEETS_DRY   if "1", report only — do not write find-seeds.json
 */
require("../_productRoot.cjs").loadProductEnv();
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { SEEDS_PATH } = require("./lib/common.cjs");
const { buildCitationSeed, ensureGate } = require("./lib/seedBuilder.cjs");
const { isAcceptableLead, hostOf } = require("./lib/leadQuality.cjs");
const { mapActivityTypes } = require("./lib/rqkExtract.cjs");

const DIR = process.env.DRIVE_SHEETS_DIR || "/tmp/provider-research";
const DRY = process.env.DRIVE_SHEETS_DRY === "1";

const SOURCE = {
  id: "drive-sheets",
  name: "ClassScout Provider Research (Drive)",
  base: "https://drive.google.com",
  boroughDefault: "Manhattan",
};

const PROVIDER_NAME_HEADERS = [
  "provider / company",
  "provider company",
  "provider",
  "company",
  "name",
  "business name",
  "studio name",
];
const WEBSITE_HEADERS = [
  "website / research url",
  "website / source url",
  "website",
  "research url",
  "source url",
  "url",
  "official website",
  "homepage",
  "link",
];
const ACTIVITY_HEADERS = [
  "primary category",
  "offerings / keywords",
  "sport program category",
  "programs / sports offered",
  "sport tags (multi-tag)",
  "primary sport bucket",
  "category",
];

function normHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pickField(row, candidates) {
  const map = {};
  for (const [k, v] of Object.entries(row)) {
    map[normHeader(k)] = v;
  }
  for (const c of candidates) {
    const v = map[normHeader(c)];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function findHeaderRow(matrix) {
  for (let i = 0; i < Math.min(12, matrix.length); i += 1) {
    const headers = matrix[i].map((c) => normHeader(c));
    const hasName = headers.some((h) => PROVIDER_NAME_HEADERS.includes(h) || /provider/.test(h));
    const hasWeb = headers.some(
      (h) => WEBSITE_HEADERS.includes(h) || (/website|url|homepage|link/.test(h) && !/query/.test(h))
    );
    if (hasName && hasWeb && headers.filter(Boolean).length >= 4) {
      return { index: i, headers: matrix[i].map((c) => String(c || "").trim()) };
    }
  }
  return null;
}

function isProviderTab(sheetName, headerInfo) {
  if (!headerInfo) return false;
  const n = String(sheetName || "").toLowerCase();
  if (
    /summary|dashboard|roadmap|notes$|source pages|sources$|category map|query seed|watchlist|competitor|provider fields|scraping|priority notes/.test(
      n
    )
  ) {
    return false;
  }
  const headers = headerInfo.headers.map(normHeader);
  // Directory / query-seed tabs (not provider leads).
  if (headers.includes("source / directory") || headers.includes("source competitor")) return false;
  if (headers.includes("market") && headers.some((h) => /query/.test(h))) return false;
  // Provider tabs always name the org in a provider/company column.
  if (!headers.some((h) => PROVIDER_NAME_HEADERS.includes(h) || /^provider/.test(h))) return false;
  return true;
}

function normalizeWebsite(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  // Notes sometimes pack multiple URLs — take the first http(s) token.
  const m = t.match(/https?:\/\/[^\s,;|]+/i) || t.match(/\bwww\.[^\s,;|]+/i);
  let u = m ? m[0] : t.split(/[\s,;|]+/)[0];
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const url = new URL(u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    // Drive deep links often point at /event/ birthday or schedule pages on the
    // provider's own host. Keep the origin as the Find target so leadQuality does
    // not treat a curated provider row as a one-off event listing.
    if (/\/events?\//i.test(url.pathname) || /birthday|party/i.test(url.pathname)) {
      return url.origin;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function normalizeBorough(raw) {
  const t = String(raw || "").toLowerCase();
  if (/manhattan/.test(t) && /brooklyn/.test(t)) return "Manhattan";
  if (/manhattan/.test(t)) return "Manhattan";
  if (/brooklyn/.test(t)) return "Brooklyn";
  if (/queens/.test(t)) return "Queens";
  if (/bronx/.test(t)) return "Bronx";
  if (/staten/.test(t)) return "Staten Island";
  if (/long island|westchester|nassau|suffolk/.test(t)) return "";
  if (/\bnyc\b|new york/.test(t)) return "Manhattan";
  return "";
}

function inventoryWorkbook(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const out = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    const headerInfo = findHeaderRow(matrix);
    if (!isProviderTab(sheetName, headerInfo)) {
      out.push({ sheetName, providerTab: false, rows: 0 });
      continue;
    }
    const headers = headerInfo.headers;
    const rows = [];
    for (let r = headerInfo.index + 1; r < matrix.length; r += 1) {
      const obj = {};
      let any = false;
      headers.forEach((h, i) => {
        if (!h) return;
        const v = matrix[r][i];
        if (v != null && String(v).trim()) {
          obj[h] = String(v).trim();
          any = true;
        }
      });
      if (any) rows.push({ rowNumber: r + 1, values: obj });
    }
    out.push({ sheetName, providerTab: true, rows, headerRow: headerInfo.index + 1 });
  }
  return out;
}

function rowToFacts(row, workbookName, sheetName) {
  const name = pickField(row.values, [
    "Provider / Company",
    "Provider",
    "Company",
    "Name",
    "Business Name",
  ]);
  const website = normalizeWebsite(
    pickField(row.values, [
      "Website / Research URL",
      "Website / Source URL",
      "Website",
      "Research URL",
      "Source URL",
      "URL",
      "Official Website",
      "Homepage",
      "Link",
    ])
  );
  const activityBits = ACTIVITY_HEADERS.map((h) => {
    for (const [k, v] of Object.entries(row.values)) {
      if (normHeader(k) === h && v) return String(v);
    }
    return "";
  }).filter(Boolean);
  const borough = normalizeBorough(pickField(row.values, ["Borough"]));
  const neighborhood =
    pickField(row.values, ["Neighborhood"]) || pickField(row.values, ["Area Bucket"]) || "";
  const notes = [pickField(row.values, ["Notes"]), pickField(row.values, ["Verification Status"])]
    .filter(Boolean)
    .join(" · ");

  return {
    name,
    website,
    citationUrl: website,
    borough: borough || undefined,
    neighborhood: neighborhood || undefined,
    address: "",
    services: activityBits,
    activityHints: activityBits,
    inventoryOnly: !borough,
    driveMeta: {
      workbook: workbookName,
      sheet: sheetName,
      rowNumber: row.rowNumber,
      notes: notes.slice(0, 240),
    },
  };
}

function existingKeys(seeds) {
  const ids = new Set();
  const websites = new Set();
  const hostsNames = new Set();
  for (const s of seeds || []) {
    if (s.id) ids.add(s.id);
    if (s.website) {
      websites.add(String(s.website).replace(/\/$/, "").toLowerCase());
      const h = hostOf(s.website);
      if (h && s.name) hostsNames.add(`${h}::${String(s.name).toLowerCase().trim()}`);
    }
  }
  return { ids, websites, hostsNames };
}

async function main() {
  if (!fs.existsSync(DIR)) {
    console.error(JSON.stringify({ ok: false, error: `missing_dir:${DIR}` }));
    process.exit(1);
  }
  const files = fs
    .readdirSync(DIR)
    .filter((f) => /\.xlsx?m?$/i.test(f))
    .sort();
  if (!files.length) {
    console.error(JSON.stringify({ ok: false, error: "no_workbooks" }));
    process.exit(1);
  }

  const gate = await ensureGate(process.env.CATALOG_LOOP_BASE || "https://getyourfield.com");
  const doc = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
  const keys = existingKeys(doc.seeds);

  const summary = {
    ok: true,
    dry: DRY,
    workbooks: files.length,
    providerTabs: 0,
    rowsRead: 0,
    added: 0,
    duplicates: 0,
    rejects: {},
    bySheet: [],
    addedIds: [],
  };

  const pending = [];

  for (const file of files) {
    const filePath = path.join(DIR, file);
    const sheets = inventoryWorkbook(filePath);
    for (const sheet of sheets) {
      if (!sheet.providerTab) continue;
      summary.providerTabs += 1;
      const sheetStats = {
        workbook: file,
        sheet: sheet.sheetName,
        rows: sheet.rows.length,
        added: 0,
        duplicates: 0,
        rejects: {},
      };
      for (const row of sheet.rows) {
        summary.rowsRead += 1;
        const facts = rowToFacts(row, file, sheet.sheetName);
        if (!facts.name || facts.name.length < 3) {
          summary.rejects.bad_name = (summary.rejects.bad_name || 0) + 1;
          sheetStats.rejects.bad_name = (sheetStats.rejects.bad_name || 0) + 1;
          continue;
        }
        if (!facts.website) {
          summary.rejects.no_website = (summary.rejects.no_website || 0) + 1;
          sheetStats.rejects.no_website = (sheetStats.rejects.no_website || 0) + 1;
          continue;
        }
        if (!normalizeBorough(pickField(row.values, ["Borough"])) && /long island|westchester/i.test(pickField(row.values, ["Borough"]))) {
          summary.rejects.out_of_market = (summary.rejects.out_of_market || 0) + 1;
          sheetStats.rejects.out_of_market = (sheetStats.rejects.out_of_market || 0) + 1;
          continue;
        }

        // Pre-check activity map so we can count no_activity before seed build.
        const mapped = mapActivityTypes(facts.services || [], facts.name);
        if (!mapped.length) {
          summary.rejects.no_activity_mapped = (summary.rejects.no_activity_mapped || 0) + 1;
          sheetStats.rejects.no_activity_mapped = (sheetStats.rejects.no_activity_mapped || 0) + 1;
          continue;
        }

        const quality = isAcceptableLead(facts, SOURCE);
        if (!quality.ok) {
          summary.rejects[quality.reason] = (summary.rejects[quality.reason] || 0) + 1;
          sheetStats.rejects[quality.reason] = (sheetStats.rejects[quality.reason] || 0) + 1;
          continue;
        }

        const webNorm = facts.website.toLowerCase();
        const hostName = `${hostOf(facts.website)}::${facts.name.toLowerCase()}`;
        if (keys.websites.has(webNorm) || keys.hostsNames.has(hostName)) {
          summary.duplicates += 1;
          sheetStats.duplicates += 1;
          continue;
        }

        const built = buildCitationSeed(facts, SOURCE, gate);
        if (!built.seed) {
          const reason = built.rejectReason || "seed_build_failed";
          summary.rejects[reason] = (summary.rejects[reason] || 0) + 1;
          sheetStats.rejects[reason] = (sheetStats.rejects[reason] || 0) + 1;
          continue;
        }

        // Enrich research note with Drive provenance (no URLs beyond hygiene strip).
        const meta = facts.driveMeta;
        built.seed.researchNote = `${built.seed.researchNote} Drive workbook ${meta.workbook} / ${meta.sheet} row ${meta.rowNumber}.`;
        if (meta.notes) {
          built.seed.researchNote = `${built.seed.researchNote} Sheet note: ${meta.notes.slice(0, 160)}.`;
        }
        // Inventory-only when borough is missing or runtime-hidden (seedBuilder already demotes).
        if (!facts.borough || built.seed.inventoryOnly) {
          built.seed.inventoryOnly = true;
          built.seed.publicTarget = false;
        }

        if (keys.ids.has(built.seed.id)) {
          summary.duplicates += 1;
          sheetStats.duplicates += 1;
          continue;
        }

        keys.ids.add(built.seed.id);
        keys.websites.add(webNorm);
        keys.hostsNames.add(hostName);
        pending.push(built.seed);
        summary.added += 1;
        sheetStats.added += 1;
        summary.addedIds.push(built.seed.id);
      }
      summary.bySheet.push(sheetStats);
    }
  }

  if (!DRY && pending.length) {
    // Single atomic merge write so concurrent fair-use forever cannot interleave mid-batch.
    const latest = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
    latest.seeds = latest.seeds || [];
    const live = existingKeys(latest.seeds);
    let wrote = 0;
    for (const seed of pending) {
      const webNorm = String(seed.website || "")
        .replace(/\/$/, "")
        .toLowerCase();
      if (live.ids.has(seed.id) || (webNorm && live.websites.has(webNorm))) continue;
      latest.seeds.push(seed);
      live.ids.add(seed.id);
      if (webNorm) live.websites.add(webNorm);
      wrote += 1;
    }
    latest.updatedAt = new Date().toISOString();
    const noteBit =
      `Drive multi-sheet import ${new Date().toISOString().slice(0, 10)}: +${wrote} from ${summary.providerTabs} provider tabs across ${files.length} workbooks.`;
    latest.notes = `${latest.notes || ""}  ${noteBit}`.trim();
    fs.writeFileSync(SEEDS_PATH, JSON.stringify(latest, null, 2) + "\n");
    summary.wrote = wrote;
  } else {
    summary.wrote = 0;
  }

  // Avoid dumping thousands of ids to stdout in dry runs with huge adds.
  if (summary.addedIds.length > 40) {
    summary.addedIdsSample = summary.addedIds.slice(0, 40);
    delete summary.addedIds;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err && err.stack ? err.stack : err) }));
  process.exit(1);
});
