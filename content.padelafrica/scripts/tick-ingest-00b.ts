#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");

async function main() {
  const rows = JSON.parse(readFileSync(resolve(DATA, "south-africa-padel-verified.json"), "utf8")) as Array<{
    recordId: string; name: string; city: string; region?: string; line1?: string;
    lat: number; lng: number; website?: string; phone?: string; description?: string;
    primarySourceUrl?: string; secondarySourceUrl?: string;
  }>;
  const row = rows.find((r) => r.recordId === "ZAF-VEN-072");
  if (!row) throw new Error("missing ZAF-VEN-072");
  const cfg: IngestConfig = {
    baseUrl: process.env.INGEST_BASE_URL || "https://padel-africa.doneisbetter.com",
    apiKey: process.env.INGEST_API_KEY || "",
  };
  if (!cfg.apiKey) throw new Error("INGEST_API_KEY required");
  const sourceText = [
    `URL: ${row.primarySourceUrl}`, "Qualified as: padel-club",
    `Name: ${row.name}`, `Venue: ${row.name}`,
    `Address: ${row.line1}`, `Locality: ${row.city}`,
    "Country: South Africa", "CountryCode: ZA",
    `Latitude: ${row.lat}`, `Longitude: ${row.lng}`,
    row.website ? `Website: ${row.website}` : null,
    row.phone ? `Phone: ${row.phone}` : null, "",
    String(row.description || ""),
    row.region ? `Admin region: ${row.region}` : null,
    row.secondarySourceUrl ? `Secondary source: ${row.secondarySourceUrl}` : null,
  ].filter((x): x is string => typeof x === "string" && x.length > 0).join("\n");
  const id = "research-zaf-ven-072";
  let mode = "reprocess";
  let res;
  try {
    res = await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: true });
  } catch {
    mode = "create";
    res = await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: false });
  }
  const outPath = resolve(DATA, "tick-ingest-2026-09-27T00.json");
  const d = JSON.parse(readFileSync(outPath, "utf8")) as { results: Array<Record<string, unknown>> };
  d.results.push({ recordId: "ZAF-VEN-072", id, ok: true, mode, res });
  writeFileSync(outPath, JSON.stringify(d, null, 2));
  console.log(JSON.stringify({ recordId: "ZAF-VEN-072", ok: true, mode, res }));
}
main().catch((e) => { console.error(e); process.exit(1); });
