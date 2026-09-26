#!/usr/bin/env npx tsx
/**
 * catalog:about-curate — ingest path (no Mongo).
 *
 * Reads published listings via public sitemap + listing pages.
 * Improves weak/garbled About via executorIngest → POST /api/ingest patch.
 * Cursor Cloud Agent is the writer (Hungarian-first, no invented phones).
 *
 *   npm run catalog:about-curate -- --limit=10
 *   npm run catalog:about-curate -- --dry-run --limit=5
 *   npm run catalog:about-curate -- --listing-id=l-disc-…
 */
import { executeIngestTask } from "../src/lib/sovereign/executorIngest.ts";
import { exitIfMongoEnv } from "./lib/refuseAgentMongo.ts";
import {
  listPublishedIds,
  fetchPublicListing,
  scoreAbout,
  detectAboutGarble,
  draftAboutImprovement,
} from "./lib/publicListings.ts";

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

async function main() {
  exitIfMongoEnv("catalog-about-curate-ingest.ts");
  const dryRun = process.argv.includes("--dry-run");
  const limit = Number(argValue("--limit") || 10);
  const onlyId = argValue("--listing-id");

  const ids = onlyId ? [onlyId] : await listPublishedIds(Math.max(limit * 4, 40));
  const report = {
    job: "catalog:about-curate",
    writePath: "executorIngest → POST /api/ingest",
    mongo: "quarantined",
    dryRun,
    scanned: 0,
    improved: 0,
    skipped: 0,
    errors: [] as string[],
    results: [] as Array<Record<string, unknown>>,
  };

  for (const id of ids) {
    if (report.improved >= limit && !onlyId) break;
    const listing = await fetchPublicListing(id);
    report.scanned++;
    if (!listing) {
      report.skipped++;
      continue;
    }
    const draft = draftAboutImprovement(listing);
    if (!draft) {
      report.skipped++;
      report.results.push({
        id,
        name: listing.name,
        score: scoreAbout(listing.description),
        action: "skip",
        reason: "already_good_or_no_safe_draft",
      });
      continue;
    }

    const task = {
      listingId: id,
      patch: { description: draft.text },
      reason: `catalog-about-curate:${draft.reason}`,
    };

    if (dryRun) {
      report.improved++;
      report.results.push({
        id,
        name: listing.name,
        scoreBefore: scoreAbout(listing.description),
        scoreAfter: scoreAbout(draft.text),
        garble: detectAboutGarble(listing.description),
        action: "dry-run",
        reason: draft.reason,
        wouldPatchChars: draft.text.length,
        preview: draft.text.slice(0, 160),
      });
      continue;
    }

    const result = await executeIngestTask(task, { dryRun: false });
    if (result.outcome === "success") {
      report.improved++;
      report.results.push({
        id,
        name: listing.name,
        scoreBefore: scoreAbout(listing.description),
        scoreAfter: scoreAbout(draft.text),
        garble: detectAboutGarble(listing.description),
        action: "patched",
        reason: draft.reason,
        response: result.response,
      });
    } else {
      report.errors.push(`${id}: ${result.error || result.outcome}`);
      report.results.push({ id, action: "failed", error: result.error });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
