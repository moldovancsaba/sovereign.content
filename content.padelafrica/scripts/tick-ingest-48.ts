#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";
import { buildStructuredSourceText } from "../ingest/buildStructuredSourceText.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");
const QUEUE = [
  { recordId: "KEN-VEN-027", file: "kenya-padel-verified.json", create: true },
  { recordId: "TUN-VEN-020", file: "tunisia-padel-verified.json", create: true },
  { recordId: "GNQ-VEN-002", file: "equatorial-guinea-padel-verified.json", create: false },
] as const;

type Fixture = Parameters<typeof buildStructuredSourceText>[0] & { recordId: string };
function load(file: string, id: string): Fixture {
  const row = (JSON.parse(readFileSync(resolve(DATA, file), "utf8")) as Fixture[]).find((r) => r.recordId === id);
  if (!row) throw new Error(id);
  return row;
}

async function main() {
  const cfg: IngestConfig = {
    baseUrl: process.env.INGEST_BASE_URL || "https://padel-africa.doneisbetter.com",
    apiKey: process.env.INGEST_API_KEY || "",
  };
  if (!cfg.apiKey) throw new Error("INGEST_API_KEY required");
  const results: Array<Record<string, unknown>> = [];
  for (const item of QUEUE) {
    const row = load(item.file, item.recordId);
    const id = `research-${item.recordId.toLowerCase()}`;
    const sourceText = buildStructuredSourceText(row);
    let out: Record<string, unknown>;
    try {
      if (!item.create) {
        out = {
          recordId: item.recordId,
          id,
          ok: true,
          mode: "reprocess",
          res: await ingestSourceText(cfg, {
            id,
            sourceText,
            sourcePool: "source_seed",
            reprocess: true,
          }),
        };
      } else throw new Error("create");
    } catch {
      try {
        out = {
          recordId: item.recordId,
          id,
          ok: true,
          mode: "create",
          res: await ingestSourceText(cfg, {
            id,
            sourceText,
            sourcePool: "source_seed",
            reprocess: false,
          }),
        };
      } catch (e) {
        out = {
          recordId: item.recordId,
          id,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }
    results.push(out);
    console.log(JSON.stringify(out));
  }
  writeFileSync(
    resolve(DATA, "tick-ingest-2026-10-13-16.json"),
    JSON.stringify({ appliedAt: new Date().toISOString(), results }, null, 2),
  );
}
main();
