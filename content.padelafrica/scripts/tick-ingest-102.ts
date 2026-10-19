#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";
import { buildStructuredSourceText } from "../ingest/buildStructuredSourceText.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");
const QUEUE = [
  { recordId: "EGY-VEN-060", file: "egypt-padel-verified.json", create: true },
  { recordId: "EGY-VEN-061", file: "egypt-padel-verified.json", create: true },
  { recordId: "EGY-VEN-062", file: "egypt-padel-verified.json", create: true },
  { recordId: "TZA-VEN-013", file: "tanzania-padel-verified.json", create: true },
  { recordId: "MAR-VEN-052", file: "morocco-padel-verified.json", create: true },
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
      const res = (await ingestSourceText(cfg, {
        id, sourceText, sourcePool: "source_seed", reprocess: false,
      })) as { created?: boolean };
      if (res && res.created === false) {
        out = {
          recordId: item.recordId, id, ok: true, mode: "create_then_reprocess", createRes: res,
          res: await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: true }),
        };
      } else {
        out = { recordId: item.recordId, id, ok: true, mode: "create", res };
      }
    } catch (e) {
      try {
        out = {
          recordId: item.recordId, id, ok: true, mode: "fallback",
          res: await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: true }),
        };
      } catch (e2) {
        try {
          out = {
            recordId: item.recordId, id, ok: true, mode: "create_fallback",
            res: await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: false }),
          };
        } catch (e3) {
          out = { recordId: item.recordId, id, ok: false, error: e3 instanceof Error ? e3.message : String(e3) };
        }
      }
    }
    results.push(out);
    console.log(JSON.stringify(out));
  }
  writeFileSync(
    resolve(DATA, "tick-ingest-2026-10-19-22.json"),
    JSON.stringify({ appliedAt: new Date().toISOString(), results }, null, 2),
  );
}
main();
