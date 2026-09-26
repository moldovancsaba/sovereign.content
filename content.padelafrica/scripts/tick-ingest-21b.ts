#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");

async function main() {
  const rows = JSON.parse(readFileSync(resolve(DATA, "south-africa-padel-verified.json"), "utf8")) as Array<{
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
    description?: string;
    primarySourceUrl?: string;
    secondarySourceUrl?: string;
    seasonNote?: string;
  }>;
  const row = rows.find((r) => r.recordId === "ZAF-VEN-064");
  if (!row) throw new Error("missing ZAF-VEN-064");
  const cfg: IngestConfig = {
    baseUrl: process.env.INGEST_BASE_URL || "https://padel-africa.doneisbetter.com",
    apiKey: process.env.INGEST_API_KEY || "",
  };
  if (!cfg.apiKey) process.exit(2);
  const id = "research-zaf-ven-064";
  const sourceText = [
    `URL: ${row.primarySourceUrl}`,
    "Qualified as: padel-club",
    `Name: ${row.name}`,
    `Venue: ${row.name}`,
    `Address: ${row.line1}`,
    `Locality: ${row.city}`,
    "Country: South Africa",
    "CountryCode: ZA",
    `Latitude: ${row.lat}`,
    `Longitude: ${row.lng}`,
    row.website ? `Website: ${row.website}` : null,
    row.phone ? `Phone: ${row.phone}` : null,
    "",
    row.description || "",
    row.region ? `Admin region: ${row.region}` : null,
    row.secondarySourceUrl ? `Secondary source: ${row.secondarySourceUrl}` : null,
    row.seasonNote ? `Season note: ${row.seasonNote}` : null,
  ]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join("\n");
  let result: Record<string, unknown>;
  try {
    const res = await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: true });
    result = { recordId: "ZAF-VEN-064", id, ok: true, mode: "reprocess", res };
  } catch {
    try {
      const res = await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: false });
      result = { recordId: "ZAF-VEN-064", id, ok: true, mode: "create", res };
    } catch (e) {
      result = { recordId: "ZAF-VEN-064", id, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  console.log(JSON.stringify(result));
  const prevPath = resolve(DATA, "tick-ingest-2026-09-26T21.json");
  const prev = JSON.parse(readFileSync(prevPath, "utf8"));
  prev.results = [...(prev.results || []), result];
  prev.appliedAt = new Date().toISOString();
  writeFileSync(prevPath, JSON.stringify(prev, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
