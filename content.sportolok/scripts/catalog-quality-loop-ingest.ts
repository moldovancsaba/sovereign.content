#!/usr/bin/env npx tsx
/**
 * catalog-quality-loop (ingest path) — Cursor Cloud Agent is the LLM.
 * Reads published listings via public sitemap; patches via executorIngest.
 *
 *   npm run catalog:quality-loop -- --limit 10
 *   npm run catalog:quality-loop:dry -- --limit 10
 */
import { executeIngestTask } from "../src/lib/sovereign/executorIngest.ts";
import { exitIfMongoEnv } from "./lib/refuseAgentMongo.ts";
import {
  listPublishedIds,
  fetchPublicListing,
  scoreAbout,
} from "./lib/publicListings.ts";

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argInt(name: string, defaultVal: number): number {
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return parseInt(eq.split("=")[1], 10) || defaultVal;
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx + 1 >= process.argv.length) return defaultVal;
  const val = parseInt(process.argv[idx + 1], 10);
  return isNaN(val) ? defaultVal : val;
}

function draftImprovedAbout(listing: {
  id: string;
  name: string;
  description: string;
  locality?: string;
}): { improved: string; reason: string } | null {
  const desc = (listing.description || "").trim();
  const score = scoreAbout(desc);
  if (score >= 70) return null;
  if (desc.length < 40) {
    const place = listing.locality ? ` in ${listing.locality}` : " in Hungary";
    return {
      improved: `${listing.name} is a sport facility${place}. Confirm opening hours and programmes before visiting.`,
      reason: "stub_from_name_locality",
    };
  }
  let improved = desc;
  if (!/[.!?]$/.test(improved)) improved += ".";
  if (improved === desc && score >= 50) return null;
  return { improved, reason: "punctuation_clarity" };
}

async function main() {
  exitIfMongoEnv("catalog-quality-loop-ingest.ts");
  const dryRun = argFlag("--dry-run");
  const limit = argInt("--limit", 10);

  const report = {
    job: "catalog:quality-loop",
    mode: dryRun ? "dry-run" : "live",
    mongo: "quarantined",
    writePath: "executorIngest → POST /api/ingest",
    llm: "Cursor Cloud Agent",
    scanned: 0,
    belowThreshold: 0,
    improved: 0,
    skipped: 0,
    errors: [] as string[],
    results: [] as Array<Record<string, unknown>>,
  };

  if (!dryRun && !(process.env.INGEST_API_KEY || process.env.SPORT_INGEST_API_KEY)) {
    console.log(JSON.stringify({ ...report, error: "INGEST_API_KEY required" }, null, 2));
    process.exitCode = 2;
    return;
  }

  const ids = await listPublishedIds(Math.max(limit * 3, 30));
  for (const id of ids) {
    if (report.improved >= limit) break;
    const listing = await fetchPublicListing(id);
    report.scanned++;
    if (!listing) {
      report.skipped++;
      continue;
    }
    const scoreBefore = scoreAbout(listing.description);
    if (scoreBefore < 70) report.belowThreshold++;
    const draft = draftImprovedAbout(listing);
    if (!draft) {
      report.skipped++;
      report.results.push({ id, name: listing.name, scoreBefore, action: "skip" });
      continue;
    }

    if (dryRun) {
      report.improved++;
      report.results.push({
        id,
        name: listing.name,
        scoreBefore,
        scoreAfter: scoreAbout(draft.improved),
        action: "dry-run",
        reason: draft.reason,
      });
      continue;
    }

    const result = await executeIngestTask(
      {
        listingId: id,
        patch: { description: draft.improved },
        reason: `catalog-quality-loop:${draft.reason}`,
      },
      { dryRun: false },
    );
    if (result.outcome === "success") {
      report.improved++;
      report.results.push({
        id,
        name: listing.name,
        scoreBefore,
        scoreAfter: scoreAbout(draft.improved),
        action: "patched",
        reason: draft.reason,
        response: result.response,
      });
    } else {
      report.errors.push(`${id}: ${result.error}`);
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
