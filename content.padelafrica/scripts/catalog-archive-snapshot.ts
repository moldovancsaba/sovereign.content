#!/usr/bin/env npx tsx
/**
 * Archive-backup of padel-africa catalogue facts into git on the vertical branch.
 *
 * Day-to-day SSOT for content remains Mongo. This writes a dated JSON snapshot under
 * archive/padel-africa/content/ so GitHub holds a recoverable copy (descriptions, media
 * URLs, curated abouts, card queue summary) — never binary media.
 *
 * Usage:
 *   VERTICAL=padel-africa MONGODB_DB=padel-africa npm run catalog:archive-snapshot
 *   npm run catalog:archive-snapshot -- --dry-run
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";

const dryRun = process.argv.includes("--dry-run");
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || process.env.VERTICAL || "padel-africa";

if (!uri) {
  console.error(JSON.stringify({ error: "MONGODB_URI required" }));
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.join(process.cwd(), "archive", "padel-africa", "content", stamp);

async function main() {
  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db(dbName);

  const listings = await db
    .collection("listings")
    .find({})
    .project({
      _id: 0,
      id: 1,
      name: 1,
      description: 1,
      status: 1,
      countryCode: 1,
      locality: 1,
      region: 1,
      street: 1,
      geo: 1,
      media: 1,
      venueModel: 1,
      website: 1,
      phone: 1,
      updatedAt: 1,
    })
    .toArray();

  const curated = await db
    .collection("listing_curated_abouts")
    .find({})
    .project({ _id: 0 })
    .toArray();

  const qualityRecs = await db
    .collection("listing_quality_recommendations")
    .find({})
    .project({ _id: 0 })
    .toArray();

  const lessons = await db
    .collection("listing_quality_lessons")
    .find({})
    .project({ _id: 0 })
    .toArray();

  const cards = await db
    .collection("content_cards")
    .find({})
    .project({
      _id: 0,
      id: 1,
      state: 1,
      sourcePool: 1,
      updatedAt: 1,
    })
    .toArray();

  const cardStates: Record<string, number> = {};
  for (const c of cards) {
    const s = String((c as { state?: string }).state ?? "UNKNOWN");
    cardStates[s] = (cardStates[s] ?? 0) + 1;
  }

  const manifest = {
    vertical: dbName,
    capturedAt: new Date().toISOString(),
    purpose:
      "GitHub archive-backup of Mongo catalogue facts for padel-africa. Live SSOT remains Mongo; process SSOT is https://sovereigncontent.messmass.com",
    counts: {
      listings: listings.length,
      curatedAbouts: curated.length,
      qualityRecommendations: qualityRecs.length,
      qualityLessons: lessons.length,
      contentCards: cards.length,
      cardStates,
      listingsWithMedia: listings.filter(
        (l) => Array.isArray((l as { media?: unknown[] }).media) && (l as { media: unknown[] }).media.length > 0,
      ).length,
    },
  };

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, outDir, ...manifest }, null, 2));
    await client.close();
    return;
  }

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(outDir, "listings.json"), JSON.stringify(listings, null, 2));
  await writeFile(path.join(outDir, "listing_curated_abouts.json"), JSON.stringify(curated, null, 2));
  await writeFile(
    path.join(outDir, "listing_quality_recommendations.json"),
    JSON.stringify(qualityRecs, null, 2),
  );
  await writeFile(path.join(outDir, "listing_quality_lessons.json"), JSON.stringify(lessons, null, 2));
  await writeFile(path.join(outDir, "content_cards_summary.json"), JSON.stringify(cards, null, 2));
  await writeFile(
    path.join(outDir, "README.md"),
    `# Padel Africa content archive — ${stamp}

Captured from Mongo \`${dbName}\` for GitHub backup on the padel-africa working branch.

| File | Contents |
| --- | --- |
| \`manifest.json\` | Counts + capture metadata |
| \`listings.json\` | Published listing facts including About + media URLs |
| \`listing_curated_abouts.json\` | Curated About overrides |
| \`listing_quality_*.json\` | Quality loop recommendations / lessons |
| \`content_cards_summary.json\` | Card id/state only (no full sourceText) |

**Restore:** re-ingest via vertical admin / ingest paths — do not treat this folder as live SSOT.
**Process SSOT:** https://sovereigncontent.messmass.com
`,
  );

  await client.close();
  console.log(JSON.stringify({ dryRun: false, outDir, ...manifest.counts }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
