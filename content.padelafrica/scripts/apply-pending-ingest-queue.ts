#!/usr/bin/env npx tsx
/**
 * Live-apply rows from docs/pending-ingest-queue.md via POST /api/ingest.
 * Never opens Mongo. Evidence-only structured sourceText from verified fixtures.
 *
 *   INGEST_API_KEY=… npx tsx scripts/apply-pending-ingest-queue.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");

const QUEUE = [
  { recordId: "ZAF-VEN-005", file: "south-africa-padel-verified.json", country: "South Africa" },
  { recordId: "ZAF-VEN-006", file: "south-africa-padel-verified.json", country: "South Africa" },
  { recordId: "SEN-VEN-004", file: "senegal-padel-verified.json", country: "Senegal" },
  { recordId: "SEN-VEN-005", file: "senegal-padel-verified.json", country: "Senegal" },
  { recordId: "SEN-VEN-006", file: "senegal-padel-verified.json", country: "Senegal" },
  { recordId: "MAR-VEN-003", file: "morocco-padel-verified.json", country: "Morocco" },
] as const;

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
};

function loadRow(file: string, recordId: string): Fixture {
  const rows = JSON.parse(readFileSync(resolve(DATA, file), "utf8")) as Fixture[];
  const row = rows.find((r) => r.recordId === recordId);
  if (!row) throw new Error(`missing ${recordId} in ${file}`);
  return row;
}

function researchId(recordId: string): string {
  return `research-${recordId.toLowerCase()}`;
}

function buildSourceText(row: Fixture, countryName: string): string {
  const url = (row.primarySourceUrl || row.website || "").trim();
  const lines = [
    url ? `URL: ${url}` : null,
    "Qualified as: padel-club",
    `Name: ${row.name.trim()}`,
    `Venue: ${row.name.trim()}`,
    `Address: ${(row.line1 || `Near ${row.city}`).trim()}`,
    `Locality: ${row.city.trim()}`,
    `Country: ${countryName}`,
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
  ].filter((x): x is string => typeof x === "string" && x.length > 0);
  return lines.join("\n");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const baseUrl =
    process.env.INGEST_BASE_URL ||
    process.env.PADEL_INGEST_BASE_URL ||
    "https://padel-africa.doneisbetter.com";
  const apiKey = process.env.INGEST_API_KEY || process.env.PADEL_INGEST_API_KEY || "";
  if (!apiKey && !dryRun) {
    console.error(JSON.stringify({ error: "INGEST_API_KEY required" }));
    process.exit(2);
  }

  const cfg: IngestConfig = { baseUrl, apiKey };
  const results: Array<Record<string, unknown>> = [];

  for (const item of QUEUE) {
    const row = loadRow(item.file, item.recordId);
    const id = researchId(item.recordId);
    const sourceText = buildSourceText(row, item.country);
    const body = {
      id,
      sourceText,
      sourcePool: "source_seed" as const,
      reprocess: false,
    };
    if (dryRun) {
      results.push({ recordId: item.recordId, id, dryRun: true, sourceTextChars: sourceText.length });
      continue;
    }
    try {
      const res = await ingestSourceText(cfg, body);
      results.push({ recordId: item.recordId, id, ok: true, res });
    } catch (err) {
      results.push({
        recordId: item.recordId,
        id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const outPath = resolve(DATA, "pending-ingest-apply-2026-09-25.json");
  writeFileSync(outPath, JSON.stringify({ appliedAt: new Date().toISOString(), baseUrl, dryRun, results }, null, 2));
  console.log(JSON.stringify({ outPath, dryRun, results }, null, 2));
  if (results.some((r) => r.ok === false)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
