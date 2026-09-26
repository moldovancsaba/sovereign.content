#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");
const QUEUE = [{ recordId: "ZAF-VEN-063", file: "south-africa-padel-verified.json", country: "South Africa" }] as const;

type Fixture = {
  recordId: string; name: string; city: string; region?: string; countryCode: string;
  line1?: string; lat: number; lng: number; website?: string; phone?: string; email?: string;
  description?: string; primarySourceUrl?: string; secondarySourceUrl?: string; seasonNote?: string;
};

function loadRow(file: string, recordId: string): Fixture {
  const rows = JSON.parse(readFileSync(resolve(DATA, file), "utf8")) as Fixture[];
  const row = rows.find((r) => r.recordId === recordId);
  if (!row) throw new Error(`missing ${recordId}`);
  return row;
}

function buildSourceText(row: Fixture, countryName: string): string {
  const url = (row.primarySourceUrl || row.website || "").trim();
  return [
    url ? `URL: ${url}` : null, "Qualified as: padel-club",
    `Name: ${row.name.trim()}`, `Venue: ${row.name.trim()}`,
    `Address: ${(row.line1 || `Near ${row.city}`).trim()}`, `Locality: ${row.city.trim()}`,
    `Country: ${countryName}`, `CountryCode: ${String(row.countryCode).toUpperCase()}`,
    `Latitude: ${Number(row.lat)}`, `Longitude: ${Number(row.lng)}`,
    row.website ? `Website: ${row.website.trim()}` : null,
    row.phone ? `Phone: ${row.phone.trim()}` : null, "",
    String(row.description || "").trim(),
    row.region ? `Admin region: ${row.region.trim()}` : null,
    row.email ? `Email: ${row.email.trim()}` : null,
    row.secondarySourceUrl ? `Secondary source: ${row.secondarySourceUrl.trim()}` : null,
    row.seasonNote ? `Season note: ${String(row.seasonNote).trim()}` : null,
  ].filter((x): x is string => typeof x === "string" && x.length > 0).join("\n");
}

async function main() {
  const cfg: IngestConfig = {
    baseUrl: process.env.INGEST_BASE_URL || "https://padel-africa.doneisbetter.com",
    apiKey: process.env.INGEST_API_KEY || "",
  };
  if (!cfg.apiKey) process.exit(2);
  const item = QUEUE[0];
  const row = loadRow(item.file, item.recordId);
  const id = `research-${item.recordId.toLowerCase()}`;
  const sourceText = buildSourceText(row, item.country);
  let result: Record<string, unknown>;
  try {
    const res = await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: true });
    result = { recordId: item.recordId, id, ok: true, mode: "reprocess", res };
  } catch {
    try {
      const res = await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: false });
      result = { recordId: item.recordId, id, ok: true, mode: "create", res };
    } catch (e) {
      result = { recordId: item.recordId, id, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  console.log(JSON.stringify(result));
  const prevPath = resolve(DATA, "tick-ingest-2026-09-26T20.json");
  const prev = JSON.parse(readFileSync(prevPath, "utf8"));
  prev.results = [...(prev.results || []), result];
  prev.appliedAt = new Date().toISOString();
  writeFileSync(prevPath, JSON.stringify(prev, null, 2));
  if (!result.ok) process.exitCode = 1;
}
main().catch((e) => { console.error(e); process.exit(1); });
