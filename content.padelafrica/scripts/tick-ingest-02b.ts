#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");

async function main() {
  const rows = JSON.parse(readFileSync(resolve(DATA, "south-africa-padel-verified.json"), "utf8")) as Array<Record<string, unknown>>;
  const row = rows.find((r) => r.recordId === "ZAF-VEN-076")!;
  const cfg: IngestConfig = {
    baseUrl: process.env.INGEST_BASE_URL || "https://padel-africa.doneisbetter.com",
    apiKey: process.env.INGEST_API_KEY || "",
  };
  const sourceText = [
    `URL: ${row.primarySourceUrl}`, "Qualified as: padel-club",
    `Name: ${row.name}`, `Venue: ${row.name}`,
    `Address: ${row.line1}`, `Locality: ${row.city}`,
    "Country: South Africa", "CountryCode: ZA",
    `Latitude: ${row.lat}`, `Longitude: ${row.lng}`,
    `Website: ${row.website}`, `Phone: ${row.phone}`, "",
    String(row.description || ""),
    `Admin region: ${row.region}`,
    `Email: ${row.email}`,
    `Secondary source: ${row.secondarySourceUrl}`,
  ].join("\n");
  const id = "research-zaf-ven-076";
  let mode = "reprocess";
  let res;
  try { res = await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: true }); }
  catch { mode = "create"; res = await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: false }); }
  const outPath = resolve(DATA, "tick-ingest-2026-09-27T02.json");
  const d = JSON.parse(readFileSync(outPath, "utf8"));
  d.results.push({ recordId: "ZAF-VEN-076", id, ok: true, mode, res });
  writeFileSync(outPath, JSON.stringify(d, null, 2));
  console.log(JSON.stringify({ recordId: "ZAF-VEN-076", ok: true, mode, res }));
}
main().catch((e) => { console.error(e); process.exit(1); });
