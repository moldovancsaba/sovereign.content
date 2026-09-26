#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText } from "../ingest/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");
const rows = JSON.parse(readFileSync(resolve(DATA, "south-africa-padel-verified.json"), "utf8")) as Array<
  Record<string, string | number>
>;
const row = rows.find((r) => r.recordId === "ZAF-VEN-019");
if (!row) throw new Error("missing ZAF-VEN-019");

async function main() {
  const cfg = {
    baseUrl: process.env.INGEST_BASE_URL || "https://padel-africa.doneisbetter.com",
    apiKey: process.env.INGEST_API_KEY || "",
  };
  const sourceText = [
    `URL: ${row!.primarySourceUrl}`,
    "Qualified as: padel-club",
    `Name: ${row!.name}`,
    `Venue: ${row!.name}`,
    `Address: ${row!.line1}`,
    `Locality: ${row!.city}`,
    "Country: South Africa",
    "CountryCode: ZA",
    `Latitude: ${row!.lat}`,
    `Longitude: ${row!.lng}`,
    `Website: ${row!.website}`,
    `Phone: ${row!.phone}`,
    "",
    String(row!.description || ""),
    `Admin region: ${row!.region}`,
    `Email: ${row!.email}`,
    `Secondary source: ${row!.secondarySourceUrl}`,
    `Season note: ${row!.seasonNote}`,
  ].join("\n");
  const res = await ingestSourceText(cfg, {
    id: "research-zaf-ven-019",
    sourceText,
    sourcePool: "source_seed",
    reprocess: false,
  });
  const evidencePath = resolve(DATA, "tick-ingest-2026-09-26T08.json");
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as {
    appliedAt: string;
    results: Array<Record<string, unknown>>;
  };
  evidence.results.push({
    recordId: "ZAF-VEN-019",
    id: "research-zaf-ven-019",
    ok: true,
    mode: "create",
    res,
  });
  evidence.appliedAt = new Date().toISOString();
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ok: true, res }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
