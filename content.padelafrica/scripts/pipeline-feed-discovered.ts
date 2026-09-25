#!/usr/bin/env npx tsx
/**
 * Feed DISCOVERED research-* cards through ingest reprocess so the management
 * pipeline can earn PUBLISHED. Agents never set lifecycleState.
 *
 * Reads recent verified fixtures (or --all), rebuilds structured sourceText,
 * POSTs with reprocess:true.
 *
 *   INGEST_API_KEY=… npx tsx scripts/pipeline-feed-discovered.ts [--dry-run] [--limit N] [--all]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");
const OUT = resolve(DATA, "pipeline-feed");

const COUNTRY_NAMES: Record<string, string> = {
  ZA: "South Africa",
  MA: "Morocco",
  TN: "Tunisia",
  KE: "Kenya",
  SN: "Senegal",
  NG: "Nigeria",
  MU: "Mauritius",
  BW: "Botswana",
  EG: "Egypt",
  ZW: "Zimbabwe",
  ZM: "Zambia",
  UG: "Uganda",
  CI: "Ivory Coast",
  MZ: "Mozambique",
  NA: "Namibia",
  RW: "Rwanda",
  GH: "Ghana",
  TZ: "Tanzania",
  AO: "Angola",
  DZ: "Algeria",
  LY: "Libya",
  CM: "Cameroon",
  ET: "Ethiopia",
  MG: "Madagascar",
  MW: "Malawi",
  SC: "Seychelles",
  SL: "Sierra Leone",
  TG: "Togo",
  BF: "Burkina Faso",
  GA: "Gabon",
  BI: "Burundi",
  DJ: "Djibouti",
  GM: "Gambia",
  GN: "Guinea",
  GQ: "Equatorial Guinea",
  MR: "Mauritania",
  SO: "Somalia",
  SZ: "Eswatini",
  CV: "Cabo Verde",
  CD: "DR Congo",
  CG: "Republic of the Congo",
};

type Fixture = {
  recordId: string;
  name: string;
  city: string;
  region?: string;
  countryCode: string;
  line1?: string;
  lat: number;
  lng: number;
  website?: string;
  phone?: string;
  email?: string;
  description?: string;
  primarySourceUrl?: string;
  secondarySourceUrl?: string;
  seasonNote?: string;
  lastVerifiedUtc?: string;
  researchNotes?: string;
};

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}
function argInt(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  const n = Number.parseInt(process.argv[i + 1], 10);
  return Number.isFinite(n) ? n : fallback;
}

function researchId(recordId: string): string {
  return `research-${recordId.toLowerCase()}`;
}

function buildSourceText(row: Fixture): string {
  const country = COUNTRY_NAMES[row.countryCode] || row.countryCode;
  const url = (row.primarySourceUrl || row.website || "").trim();
  return [
    url ? `URL: ${url}` : null,
    "Qualified as: padel-club",
    `Name: ${row.name.trim()}`,
    `Venue: ${row.name.trim()}`,
    `Address: ${(row.line1 || `Near ${row.city}`).trim()}`,
    `Locality: ${row.city.trim()}`,
    `Country: ${country}`,
    `CountryCode: ${String(row.countryCode).toUpperCase()}`,
    `Latitude: ${Number(row.lat)}`,
    `Longitude: ${Number(row.lng)}`,
    row.website ? `Website: ${row.website.trim()}` : null,
    row.phone ? `Phone: ${row.phone.trim()}` : null,
    "",
    String(row.description || "").trim(),
    row.region ? `Admin region: ${row.region.trim()}` : null,
    row.email ? `Email: ${row.email.trim()}` : null,
    row.secondarySourceUrl ? `Secondary source: ${row.secondarySourceUrl.trim()}` : null,
    row.seasonNote ? `Season note: ${String(row.seasonNote).trim()}` : null,
  ]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join("\n");
}

/** Prefer cards we already live-applied (tick ingest evidence + pending apply). */
function knownIngestedRecordIds(): Set<string> {
  const ids = new Set<string>();
  for (const f of readdirSync(DATA)) {
    if (!/^tick-ingest-.*\.json$/.test(f) && f !== "pending-ingest-apply-2026-09-25.json") continue;
    try {
      const raw = JSON.parse(readFileSync(resolve(DATA, f), "utf8")) as {
        results?: Array<{ recordId?: string; ok?: boolean }>;
      };
      for (const r of raw.results || []) {
        if (r.recordId && r.ok !== false) ids.add(r.recordId);
      }
    } catch {
      /* ignore */
    }
  }
  // Also honor explicit research notes from today's FIND ticks
  try {
    const attempts = JSON.parse(
      readFileSync(resolve(DATA, "padel-africa-find-attempts.json"), "utf8"),
    ) as { attempts?: Array<{ at?: string; outcome?: string; recordId?: string }> };
    for (const a of attempts.attempts || []) {
      if (
        a.recordId &&
        (a.outcome === "verified" || a.outcome === "seeded") &&
        String(a.at || "").startsWith("2026-09-25")
      ) {
        ids.add(a.recordId);
      }
    }
  } catch {
    /* ignore */
  }
  return ids;
}

async function ingestCreateOrReprocess(
  cfg: IngestConfig,
  id: string,
  sourceText: string,
): Promise<{ mode: "reprocess" | "create"; res: unknown }> {
  try {
    const res = await ingestSourceText(cfg, {
      id,
      sourceText,
      sourcePool: "source_seed",
      reprocess: true,
    });
    return { mode: "reprocess", res };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("nothing to reprocess") && !msg.includes("404")) throw err;
    const res = await ingestSourceText(cfg, {
      id,
      sourceText,
      sourcePool: "source_seed",
      reprocess: false,
    });
    return { mode: "create", res };
  }
}

async function main() {
  const dryRun = argFlag("--dry-run");
  const all = argFlag("--all");
  const limit = argInt("--limit", 30);
  const baseUrl =
    process.env.INGEST_BASE_URL ||
    process.env.PADEL_INGEST_BASE_URL ||
    "https://padel-africa.doneisbetter.com";
  const apiKey = process.env.INGEST_API_KEY || process.env.PADEL_INGEST_API_KEY || "";

  if (!apiKey && !dryRun) {
    console.error(JSON.stringify({ error: "INGEST_API_KEY required" }));
    process.exit(2);
  }

  const known = knownIngestedRecordIds();
  const rows: Fixture[] = [];
  for (const f of readdirSync(DATA).filter((x) => x.endsWith("-padel-verified.json"))) {
    const list = JSON.parse(readFileSync(resolve(DATA, f), "utf8")) as Fixture[];
    for (const row of list) {
      if (!row.recordId || !row.name) continue;
      if (!all && !known.has(row.recordId)) continue;
      rows.push(row);
    }
  }

  // Dedupe by recordId, keep last; prefer known recent first
  const byId = new Map<string, Fixture>();
  for (const r of rows) byId.set(r.recordId, r);
  const queue = [...byId.values()]
    .sort((a, b) => String(b.lastVerifiedUtc || "").localeCompare(String(a.lastVerifiedUtc || "")))
    .slice(0, limit);

  const cfg: IngestConfig = { baseUrl, apiKey };
  const results: Array<Record<string, unknown>> = [];

  for (const row of queue) {
    const id = researchId(row.recordId);
    const sourceText = buildSourceText(row);
    if (dryRun) {
      results.push({
        recordId: row.recordId,
        id,
        dryRun: true,
        known: known.has(row.recordId),
        sourceTextChars: sourceText.length,
      });
      continue;
    }
    try {
      const { mode, res } = await ingestCreateOrReprocess(cfg, id, sourceText);
      results.push({ recordId: row.recordId, id, ok: true, mode, res });
    } catch (err) {
      results.push({
        recordId: row.recordId,
        id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = resolve(OUT, `feed-${stamp}.json`);
  const summary = {
    job: "pipeline-feed-discovered",
    at: new Date().toISOString(),
    dryRun,
    queued: queue.length,
    ok: results.filter((r) => r.ok === true).length,
    failed: results.filter((r) => r.ok === false).length,
    note: "Reprocess feeds DISCOVERED cards; management pipeline owns PUBLISHED. Agents never set lifecycleState.",
    results,
  };
  writeFileSync(outFile, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify({ ...summary, evidence: outFile }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
