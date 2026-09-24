#!/usr/bin/env npx tsx
/**
 * catalog-quality-loop (ingest path) — agent-home stub.
 *
 * Does NOT open Mongo. Listing description / field writes must go through
 * content.padelafrica/ingest/client.ts → POST /api/ingest.
 *
 * Full score/improve/encode port from the quarantined Mongo loop is incremental;
 * this entrypoint refuses the old Mongo-only pattern and documents the contract.
 *
 *   INGEST_BASE_URL=https://padel-africa.doneisbetter.com \
 *   INGEST_API_KEY=… \
 *   npx tsx scripts/catalog-quality-loop-ingest.ts [--dry-run]
 */
import { ingestListingPatch, type IngestConfig } from "../ingest/client.ts";

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const dryRun = argFlag("--dry-run");
  const baseUrl = process.env.INGEST_BASE_URL || process.env.PADEL_INGEST_BASE_URL || "https://padel-africa.doneisbetter.com";
  const apiKey = process.env.INGEST_API_KEY || process.env.PADEL_INGEST_API_KEY || "";

  const report = {
    job: "catalog:quality-loop",
    mode: dryRun ? "dry-run" : "ingest-stub",
    mongo: "quarantined",
    writePath: "POST /api/ingest",
    note:
      "Mongo listingQuality store is quarantined (src/QUARANTINE.md). " +
      "Score/improve rewrite applies description patches via ingest only. " +
      "This stub does not invent About text or open MONGODB_URI.",
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
  const cfg: IngestConfig = { baseUrl, apiKey };
  void cfg;
  void ingestListingPatch;

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
