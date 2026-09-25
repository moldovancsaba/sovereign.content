#!/usr/bin/env npx tsx
/**
 * Dry-run / live ingest executor for sportolok agent home.
 *
 *   INGEST_API_KEY=… npx tsx scripts/run-executor-ingest.ts --dry-run \
 *     --listing-id=demo --patch='{"description":"…"}'
 */
import {
  executeIngestTask,
  type IngestExecutorTask,
} from "../src/lib/sovereign/executorIngest.ts";

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const listingId = argValue("--listing-id");
  const patchRaw = argValue("--patch") || "{}";
  if (!listingId) {
    console.log(
      JSON.stringify(
        {
          error: "listing_id_required",
          hint: "Pass --listing-id=… and optional --patch='{\"field\":…}'",
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
    return;
  }
  let patch: Record<string, unknown>;
  try {
    patch = JSON.parse(patchRaw) as Record<string, unknown>;
  } catch {
    console.log(JSON.stringify({ error: "patch_json_invalid" }, null, 2));
    process.exitCode = 2;
    return;
  }

  const task: IngestExecutorTask = {
    listingId,
    patch,
    reason: "sc-central-qa-executor-ingest",
  };

  if (!dryRun && !(process.env.INGEST_API_KEY || process.env.SPORT_INGEST_API_KEY)) {
    console.log(
      JSON.stringify(
        {
          error: "INGEST_API_KEY_missing",
          hint: "Use --dry-run without a key, or export INGEST_API_KEY for a real PATCH",
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
    return;
  }

  const result = await executeIngestTask(task, { dryRun });
  console.log(JSON.stringify({ job: "sportolok:executor-ingest", result }, null, 2));
  if (result.outcome === "failed") process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
