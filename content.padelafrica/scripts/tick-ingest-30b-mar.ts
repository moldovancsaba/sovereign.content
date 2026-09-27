#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");

async function main() {
  const rows = JSON.parse(readFileSync(resolve(DATA, "morocco-padel-verified.json"), "utf8")) as Array<Record<string, string | number>>;
  const row = rows.find((r) => r.recordId === "MAR-VEN-048");
  if (!row) throw new Error("missing MAR-VEN-048");
  const url = String(row.primarySourceUrl || row.website || row.instagram || "").trim();
  const sourceText = [
    url ? `URL: ${url}` : null, "Qualified as: padel-club",
    `Name: ${String(row.name).trim()}`, `Venue: ${String(row.name).trim()}`,
    `Address: ${String(row.line1 || `Near ${row.city}`).trim()}`, `Locality: ${String(row.city).trim()}`,
    "Country: Morocco", "CountryCode: MA",
    `Latitude: ${Number(row.lat)}`, `Longitude: ${Number(row.lng)}`,
    row.phone ? `Phone: ${String(row.phone).trim()}` : null,
    row.instagram ? `Instagram: ${String(row.instagram).trim()}` : null,
    "",
    String(row.description || "").trim(),
    row.secondarySourceUrl ? `Secondary source: ${String(row.secondarySourceUrl).trim()}` : null,
  ].filter((x): x is string => typeof x === "string" && x.length > 0).join("\n");

  const cfg: IngestConfig = {
    baseUrl: process.env.INGEST_BASE_URL || "https://padel-africa.doneisbetter.com",
    apiKey: process.env.INGEST_API_KEY || "",
  };
  if (!cfg.apiKey) { console.error(JSON.stringify({ error: "INGEST_API_KEY required" })); process.exit(2); }
  const id = "research-mar-ven-048";
  let result: Record<string, unknown>;
  try {
    const res = await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: true });
    result = { recordId: "MAR-VEN-048", id, ok: true, mode: "reprocess", res };
  } catch {
    try {
      const res = await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: false });
      result = { recordId: "MAR-VEN-048", id, ok: true, mode: "create", res };
    } catch (err2) {
      result = { recordId: "MAR-VEN-048", id, ok: false, error: err2 instanceof Error ? err2.message : String(err2) };
    }
  }
  console.log(JSON.stringify(result));
  const priorPath = resolve(DATA, "tick-ingest-2026-09-27-30.json");
  const prior = JSON.parse(readFileSync(priorPath, "utf8")) as { results: unknown[]; appliedAt?: string };
  prior.results = prior.results.filter((r) => (r as { recordId?: string }).recordId !== "MAR-VEN-048");
  prior.results.push(result);
  prior.appliedAt = new Date().toISOString();
  writeFileSync(priorPath, JSON.stringify(prior, null, 2));
  if (result.ok === false) process.exitCode = 1;
}
main().catch((e) => { console.error(e); process.exit(1); });
