#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");

const QUEUE = [
  { recordId: "ZAF-VEN-029", file: "south-africa-padel-verified.json", country: "South Africa" },
  { recordId: "ZAF-VEN-030", file: "south-africa-padel-verified.json", country: "South Africa" },
  { recordId: "ZAF-VEN-031", file: "south-africa-padel-verified.json", country: "South Africa" },
  { recordId: "EGY-VEN-014", file: "egypt-padel-verified.json", country: "Egypt" },
  { recordId: "EGY-VEN-015", file: "egypt-padel-verified.json", country: "Egypt" },
  { recordId: "EGY-VEN-016", file: "egypt-padel-verified.json", country: "Egypt" },
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

function buildSourceText(row: Fixture, countryName: string): string {
  const url = (row.primarySourceUrl || row.website || "").trim();
  return [
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
  ]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join("\n");
}

async function main() {
  const cfg: IngestConfig = {
    baseUrl: process.env.INGEST_BASE_URL || "https://padel-africa.doneisbetter.com",
    apiKey: process.env.INGEST_API_KEY || "",
  };
  if (!cfg.apiKey) {
    console.error(JSON.stringify({ error: "INGEST_API_KEY required" }));
    process.exit(2);
  }
  const results: Array<Record<string, unknown>> = [];
  for (const item of QUEUE) {
    const row = loadRow(item.file, item.recordId);
    const id = `research-${item.recordId.toLowerCase()}`;
    const sourceText = buildSourceText(row, item.country);
    try {
      const res = await ingestSourceText(cfg, {
        id,
        sourceText,
        sourcePool: "source_seed",
        reprocess: true,
      });
      results.push({ recordId: item.recordId, id, ok: true, mode: "reprocess", res });
    } catch {
      try {
        const res = await ingestSourceText(cfg, {
          id,
          sourceText,
          sourcePool: "source_seed",
          reprocess: false,
        });
        results.push({ recordId: item.recordId, id, ok: true, mode: "create", res });
      } catch (err2) {
        results.push({
          recordId: item.recordId,
          id,
          ok: false,
          error: err2 instanceof Error ? err2.message : String(err2),
        });
      }
    }
    console.log(JSON.stringify(results[results.length - 1]));
  }
  const outPath = resolve(DATA, "tick-ingest-2026-09-26T13.json");
  writeFileSync(outPath, JSON.stringify({ appliedAt: new Date().toISOString(), baseUrl: cfg.baseUrl, results }, null, 2));
  console.log(JSON.stringify({ outPath, ok: results.filter((r) => r.ok).length, total: results.length }));
  if (results.some((r) => r.ok === false)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
