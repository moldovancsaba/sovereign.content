#!/usr/bin/env npx tsx
/**
 * Write a citation HTML snapshot into the fair-use inbox (CF soft-skip path).
 *
 *   npx tsx scripts/fair-use/citation-to-inbox.ts \
 *     --source padellands --name lead --url "https://…" --file /tmp/page.md
 *
 * Then: FAIR_USE_ONLY=padellands npx tsx scripts/fair-use/one-pass.ts
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, ensureDataDir, loadRegistry } from "./lib/common.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main() {
  const sourceId = arg("source");
  const name = arg("name") || "lead";
  const url = arg("url");
  const file = arg("file");
  if (!sourceId || !url || !file) {
    console.error(
      JSON.stringify({
        error: "usage: --source <id> --url <citationUrl> --file <htmlOrMd> [--name lead]",
      }),
    );
    process.exit(2);
  }
  const registry = loadRegistry();
  if (!registry.sources.some((s) => s.id === sourceId)) {
    console.error(JSON.stringify({ error: "unknown_source", sourceId }));
    process.exit(2);
  }
  if (!existsSync(file)) {
    console.error(JSON.stringify({ error: "file_missing", file }));
    process.exit(2);
  }

  ensureDataDir();
  const dir = join(DATA_DIR, "inbox", sourceId);
  mkdirSync(dir, { recursive: true });
  const htmlPath = join(dir, `${name}.html`);
  const metaPath = join(dir, `${name}.json`);
  const body = readFileSync(file, "utf8");
  writeFileSync(htmlPath, body);
  writeFileSync(metaPath, JSON.stringify({ url }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, htmlPath, metaPath, sourceId, url }));
}

main();
