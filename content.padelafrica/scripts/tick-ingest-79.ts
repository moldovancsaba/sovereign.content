#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";
import { buildStructuredSourceText } from "../ingest/buildStructuredSourceText.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");
const QUEUE = [
  { recordId: "MUS-VEN-009", file: "mauritius-padel-verified.json", create: true },
  { recordId: "MUS-VEN-010", file: "mauritius-padel-verified.json", create: true },
  { recordId: "TGO-VEN-003", file: "togo-padel-verified.json", create: false },
  { recordId: "COD-VEN-005", file: "democratic-republic-of-the-congo-padel-verified.json", create: false },
  { recordId: "GNQ-VEN-001", file: "equatorial-guinea-padel-verified.json", create: false },
  { recordId: "GIN-VEN-001", file: "guinea-padel-verified.json", create: false },
  { recordId: "MWI-VEN-001", file: "malawi-padel-verified.json", create: false },
  { recordId: "ZWE-VEN-005", file: "zimbabwe-padel-verified.json", create: false },
  { recordId: "BEN-VEN-001", file: "benin-padel-verified.json", create: false },
  { recordId: "RWA-VEN-002", file: "rwanda-padel-verified.json", create: false },
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
          res: await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: true }),
        };
      } else {
        const res = (await ingestSourceText(cfg, {
          id,
          sourceText,
          sourcePool: "source_seed",
          reprocess: false,
        })) as { created?: boolean };
        if (res && res.created === false) {
          out = {
            recordId: item.recordId,
            id,
            ok: true,
            mode: "create_then_reprocess",
            createRes: res,
            res: await ingestSourceText(cfg, { id, sourceText, sourcePool: "source_seed", reprocess: true }),
          };
        } else {
          out = { recordId: item.recordId, id, ok: true, mode: "create", res };
        }
      }
    } catch (e) {
      try {
        out = {
          recordId: item.recordId,
          id,
          ok: true,
          mode: "fallback",
          res: await ingestSourceText(cfg, {
            id,
            sourceText,
            sourcePool: "source_seed",
            reprocess: !item.create,
          }),
        };
      } catch (e2) {
        try {
          out = {
            recordId: item.recordId,
            id,
            ok: true,
            mode: "create_fallback",
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
    resolve(DATA, "tick-ingest-2026-10-18-23.json"),
    JSON.stringify({ appliedAt: new Date().toISOString(), results }, null, 2),
  );
}
main();
