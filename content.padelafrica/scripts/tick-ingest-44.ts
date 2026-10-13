#!/usr/bin/env npx tsx
/**
 * Tick 2026-10-13 ~12:00 — TZA-VEN-011 create + GAB-VEN-002 social enrich.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";
import { buildStructuredSourceText } from "../ingest/buildStructuredSourceText.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");

const QUEUE = [
  { recordId: "TZA-VEN-011", file: "tanzania-padel-verified.json", create: true },
  { recordId: "GAB-VEN-002", file: "gabon-padel-verified.json", create: false },
] as const;

type Fixture = Parameters<typeof buildStructuredSourceText>[0] & { recordId: string };

function loadRow(file: string, recordId: string): Fixture {
  const rows = JSON.parse(readFileSync(resolve(DATA, file), "utf8")) as Fixture[];
  const row = rows.find((r) => r.recordId === recordId);
  if (!row) throw new Error(`missing ${recordId} in ${file}`);
  return row;
}

async function applyOne(
  cfg: IngestConfig,
  item: (typeof QUEUE)[number],
): Promise<Record<string, unknown>> {
  const row = loadRow(item.file, item.recordId);
  const id = `research-${item.recordId.toLowerCase()}`;
  const sourceText = buildStructuredSourceText(row);
  if (!item.create) {
    try {
      const res = await ingestSourceText(cfg, {
        id,
        sourceText,
        sourcePool: "source_seed",
        reprocess: true,
      });
      return { recordId: item.recordId, id, ok: true, mode: "reprocess", res };
    } catch {
      /* fall through to create */
    }
  }
  try {
    const res = await ingestSourceText(cfg, {
      id,
      sourceText,
      sourcePool: "source_seed",
      reprocess: false,
    });
    return { recordId: item.recordId, id, ok: true, mode: "create", res };
  } catch (err) {
    return {
      recordId: item.recordId,
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
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
    const r = await applyOne(cfg, item);
    results.push(r);
    console.log(JSON.stringify(r));
  }
  const outPath = resolve(DATA, "tick-ingest-2026-10-13-12.json");
  writeFileSync(
    outPath,
    JSON.stringify({ appliedAt: new Date().toISOString(), baseUrl: cfg.baseUrl, results }, null, 2),
  );
  console.log(JSON.stringify({ outPath, ok: results.filter((r) => r.ok).length, total: results.length }));
  if (results.some((r) => r.ok === false)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
