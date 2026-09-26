#!/usr/bin/env npx tsx
/**
 * 2026-09-26T08 FIND tick — ingest seeded + phone-backfill fixtures as DISCOVERED.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");

const QUEUE = [
  { recordId: "MWI-VEN-005", file: "malawi-padel-verified.json", country: "Malawi" },
  { recordId: "NAM-VEN-007", file: "namibia-padel-verified.json", country: "Namibia" },
  { recordId: "ZMB-VEN-009", file: "zambia-padel-verified.json", country: "Zambia" },
  { recordId: "ZMB-VEN-010", file: "zambia-padel-verified.json", country: "Zambia" },
  { recordId: "TUN-VEN-015", file: "tunisia-padel-verified.json", country: "Tunisia" },
  { recordId: "TUN-VEN-016", file: "tunisia-padel-verified.json", country: "Tunisia" },
  { recordId: "TUN-VEN-017", file: "tunisia-padel-verified.json", country: "Tunisia" },
  { recordId: "MWI-VEN-001", file: "malawi-padel-verified.json", country: "Malawi" },
  { recordId: "KEN-VEN-001", file: "kenya-padel-verified.json", country: "Kenya" },
  { recordId: "KEN-VEN-002", file: "kenya-padel-verified.json", country: "Kenya" },
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
  const baseUrl =
    process.env.INGEST_BASE_URL ||
    process.env.PADEL_INGEST_BASE_URL ||
    "https://padel-africa.doneisbetter.com";
  const apiKey = process.env.INGEST_API_KEY || process.env.PADEL_INGEST_API_KEY || "";
  if (!apiKey) {
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
      reprocess: true,
    };
    try {
      const res = await ingestSourceText(cfg, body);
      results.push({ recordId: item.recordId, id, ok: true, mode: "create_or_reprocess", res });
      console.log(JSON.stringify({ recordId: item.recordId, ok: true, res }));
    } catch (err) {
      // retry once as create (reprocess:false) if reprocess failed
      try {
        const res = await ingestSourceText(cfg, {
          id,
          sourceText,
          sourcePool: "source_seed",
          reprocess: false,
        });
        results.push({ recordId: item.recordId, id, ok: true, mode: "create", res });
        console.log(JSON.stringify({ recordId: item.recordId, ok: true, mode: "create", res }));
      } catch (err2) {
        results.push({
          recordId: item.recordId,
          id,
          ok: false,
          error: err2 instanceof Error ? err2.message : String(err2),
          firstError: err instanceof Error ? err.message : String(err),
        });
        console.log(JSON.stringify({ recordId: item.recordId, ok: false }));
      }
    }
  }

  const outPath = resolve(DATA, "tick-ingest-2026-09-26T08.json");
  writeFileSync(
    outPath,
    JSON.stringify({ appliedAt: new Date().toISOString(), baseUrl, results }, null, 2),
  );
  console.log(JSON.stringify({ outPath, ok: results.filter((r) => r.ok).length, total: results.length }));
  if (results.some((r) => r.ok === false)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
