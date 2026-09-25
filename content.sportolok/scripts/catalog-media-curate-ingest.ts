#!/usr/bin/env npx tsx
/**
 * catalog:media-curate — ingest path (no Mongo).
 *
 * Finds listings with website, extracts OG image URL (fair-use discovery of URL only),
 * patches listing.media via executorIngest. Passthrough https URL (no R2 required).
 *
 *   npm run catalog:media-curate -- --limit=5
 *   npm run catalog:media-curate -- --dry-run --limit=5
 *   npm run catalog:media-curate -- --listing-id=l-…
 */
import { executeIngestTask } from "../src/lib/sovereign/executorIngest.ts";
import { exitIfMongoEnv } from "./lib/refuseAgentMongo.ts";
import { listPublishedIds, fetchPublicListing } from "./lib/publicListings.ts";

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

function ogImageFromHtml(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1] && /^https?:\/\//i.test(m[1])) return m[1];
    if (m?.[1]?.startsWith("/")) {
      try {
        return new URL(m[1], baseUrl).href;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

async function discoverOg(website: string): Promise<string | null> {
  try {
    const res = await fetch(website, {
      headers: {
        "user-agent":
          "SportolokDiscoveryBot/1.0 (content.sportolok; research use; +https://sport.doneisbetter.com)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return ogImageFromHtml(html, website);
  } catch {
    return null;
  }
}

async function main() {
  exitIfMongoEnv("catalog-media-curate-ingest.ts");
  const dryRun = process.argv.includes("--dry-run");
  const limit = Number(argValue("--limit") || 5);
  const onlyId = argValue("--listing-id");

  const ids = onlyId ? [onlyId] : await listPublishedIds(Math.max(limit * 4, 40));
  const report = {
    job: "catalog:media-curate",
    writePath: "executorIngest → POST /api/ingest",
    mongo: "quarantined",
    dryRun,
    scanned: 0,
    patched: 0,
    skipped: 0,
    errors: [] as string[],
    results: [] as Array<Record<string, unknown>>,
  };

  for (const id of ids) {
    if (report.patched >= limit && !onlyId) break;
    const listing = await fetchPublicListing(id);
    report.scanned++;
    if (!listing?.website) {
      report.skipped++;
      continue;
    }

    const imageUrl = await discoverOg(listing.website);
    if (!imageUrl) {
      report.skipped++;
      report.results.push({ id, name: listing.name, action: "skip", reason: "no_og_image" });
      continue;
    }

    const patch = {
      media: [
        {
          url: imageUrl,
          kind: "image",
          source: "website_og",
        },
      ],
    };

    if (dryRun) {
      report.patched++;
      report.results.push({
        id,
        name: listing.name,
        action: "dry-run",
        imageUrl,
      });
      continue;
    }

    const result = await executeIngestTask(
      {
        listingId: id,
        patch,
        reason: "catalog-media-curate:website_og",
      },
      { dryRun: false },
    );

    if (result.outcome === "success") {
      report.patched++;
      report.results.push({
        id,
        name: listing.name,
        action: "patched",
        imageUrl,
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
