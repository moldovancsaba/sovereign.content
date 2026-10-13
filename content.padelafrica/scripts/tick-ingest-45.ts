#!/usr/bin/env npx tsx
/** Tick 2026-10-13 ~13:00 — KEN-VEN-024 + AGO-VEN-018 create. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";
import { buildStructuredSourceText } from "../ingest/buildStructuredSourceText.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");

const QUEUE = [
  { recordId: "KEN-VEN-024", file: "kenya-padel-verified.json" },
  { recordId: "AGO-VEN-018", file: "angola-padel-verified.json" },
] as const;

type Fixture = Parameters<typeof buildStructuredSourceText>[0] & { recordId: string };

function loadRow(file: string, recordId: string): Fixture {
  const rows = JSON.parse(readFileSync(resolve(DATA, file), "utf8")) as Fixture[];
  const row = rows.find((r) => r.recordId === recordId);
  if (!row) throw new Error(`missing ${recordId} in ${file}`);
  return row;
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
    const sourceText = buildStructuredSourceText(row);
    try {
      const res = await ingestSourceText(cfg, {
        id,
        sourceText,
        sourcePool: "source_seed",
        reprocess: false,
      });
      results.push({ recordId: item.recordId, id, ok: true, mode: "create", res });
    } catch (err) {
      try {
        const res = await ingestSourceText(cfg, {
          id,
          sourceText,
          sourcePool: "source_seed",
          reprocess: true,
        });
        results.push({ recordId: item.recordId, id, ok: true, mode: "reprocess", res });
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
  const outPath = resolve(DATA, "tick-ingest-2026-10-13-13.json");
  writeFileSync(
    outPath,
    JSON.stringify({ appliedAt: new Date().toISOString(), baseUrl: cfg.baseUrl, results }, null, 2),
  );
  console.log(JSON.stringify({ outPath, ok: results.filter((r) => r.ok).length }));
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
