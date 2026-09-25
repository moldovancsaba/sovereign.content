#!/usr/bin/env npx tsx
/**
 * catalog-quality-loop (ingest path) — agent-home stub.
 *
 * Does NOT open Mongo. Listing description / field writes must go through
 * content.sportolok/ingest/client.ts → POST /api/ingest.
 *
 * Cloud Agent (YOU) acts as the LLM for all cognitive tasks:
 * - Scoring quality
 * - Writing About descriptions
 * - Extracting structured facts
 *
 * NO OLLAMA. NO AI GATEWAY. NO EXTERNAL LLM.
 *
 *   INGEST_BASE_URL=https://sport.doneisbetter.com \
 *   INGEST_API_KEY=… \
 *   npx tsx scripts/catalog-quality-loop-ingest.ts [--dry-run]
 */
import { ingestListingPatch, type IngestConfig } from "../ingest/client.ts";

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const dryRun = argFlag("--dry-run");
  const baseUrl = process.env.INGEST_BASE_URL || process.env.SPORTOLOK_INGEST_BASE_URL || "https://sport.doneisbetter.com";
  const apiKey = process.env.INGEST_API_KEY || process.env.SPORTOLOK_INGEST_API_KEY || "";

  const report = {
    job: "catalog:quality-loop",
    mode: dryRun ? "dry-run" : "ingest-stub",
    mongo: "quarantined",
    writePath: "POST /api/ingest",
    llm: "Cloud Agent (you are the LLM)",
    note:
      "Direct Mongo writes are quarantined (src/QUARANTINE.md). " +
      "Score/improve rewrite applies description patches via ingest only. " +
      "Cloud Agent acts as LLM for all cognitive tasks. " +
      "NO OLLAMA. NO AI GATEWAY.",
    applied: 0,
    skipped: 0,
  };

  if (!apiKey && !dryRun) {
    console.log(
      JSON.stringify(
        {
          ...report,
          error: "INGEST_API_KEY required for non-dry runs",
          hint: "Export a scoped machine token; never use MONGODB_URI from this agent home.",
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
    return;
  }

  // Placeholder: future loop loads open recommendations from a local/agent store
  // or a read-only public API, then calls ingestListingPatch for each approved improve.
  // Cloud Agent (YOU) performs:
  // 1. Fetch published listings with quality issues
  // 2. Score descriptions using your cognitive abilities
  // 3. Draft improved About text based on evidence
  // 4. Submit patches via ingestListingPatch
  const cfg: IngestConfig = { baseUrl, apiKey };
  void cfg;
  void ingestListingPatch;

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
