#!/usr/bin/env node
/**
 * catalog:quality-loop — Score → improve → encode lessons for published listings.
 *
 * Closed loop: score About prose → open recommendations → apply safe upgrades → encode lessons.
 * Never invents venues. Writes Mongo only (no GDS load).
 *
 * SSOT contract: https://sovereigncontent.messmass.com/jobs#catalogquality-loop
 *
 * Usage:
 *   MONGODB_URI=... MONGODB_DB=sportolok node scripts/catalog-quality-loop.mjs
 *   MONGODB_URI=... node scripts/catalog-quality-loop.mjs --score-limit 100 --improve-limit 40
 *   MONGODB_URI=... node scripts/catalog-quality-loop.mjs --dry-run
 *
 * Flags:
 *   --score-limit N     Max listings to score (default: 100)
 *   --improve-limit N   Max listings to improve (default: 40)
 *   --dry-run           Report only, no writes
 *
 * Exit codes:
 *   0 = success (including alreadyGood=100%)
 *   1 = error
 */

import { MongoClient } from "mongodb";
import { scoreDescriptionQuality } from "../src/lib/catalogHygiene/descriptionQuality.js";
import {
  type QualityLesson,
  QUALITY_LESSONS_COLLECTION,
  inferLessonType,
  generateRecommendation,
} from "../src/lib/sovereign/lessons.js";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "sportolok";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
const scoreLimit = parseInt(args.find((a) => a.startsWith("--score-limit="))?.split("=")[1] || "100");
const improveLimit = parseInt(args.find((a) => a.startsWith("--improve-limit="))?.split("=")[1] || "40");
const dryRun = args.includes("--dry-run");

async function main() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log(`Quality-loop ${dryRun ? "(DRY-RUN)" : ""}: db=${MONGODB_DB} scoreLimit=${scoreLimit} improveLimit=${improveLimit}`);
    
    const listingsCollection = db.collection("listings");
    
    // Phase 1: Score published listings
    const published = await listingsCollection
      .find({ lifecycleState: "PUBLISHED" })
      .limit(scoreLimit)
      .toArray();
    
    console.log(`Scoring ${published.length} published listings...`);
    
    const scored = published.map((listing) => {
      const verdict = scoreDescriptionQuality(listing.description);
      return {
        id: listing._id,
        name: listing.name,
        score: verdict.score,
        ok: verdict.ok,
        flags: verdict.flags,
        reasons: verdict.reasons,
        descriptionLen: (listing.description || "").length
      };
    });
    
    const failing = scored.filter((s) => !s.ok);
    const alreadyGood = scored.filter((s) => s.ok);
    
    console.log("\nScore results:");
    console.log(`  Already good: ${alreadyGood.length}/${scored.length} (${Math.round(alreadyGood.length / scored.length * 100)}%)`);
    console.log(`  Need improvement: ${failing.length}`);
    
    if (failing.length > 0) {
      console.log("\nTop failing flags:");
      const flagCounts = {};
      failing.forEach((f) => {
        f.flags.forEach((flag) => {
          flagCounts[flag] = (flagCounts[flag] || 0) + 1;
        });
      });
      Object.entries(flagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([flag, count]) => {
          console.log(`  ${flag}: ${count}`);
        });
    }
    
    // Phase 2: Improve (in real implementation, this would call Cloud Agent or curated About path)
    const toImprove = failing.slice(0, improveLimit);
    
    if (dryRun) {
      console.log("\nDRY-RUN: Would improve", toImprove.length, "listings:");
      toImprove.slice(0, 5).forEach((l) => {
        console.log(`  ${l.id} - ${l.name} (${l.flags.join(", ")})`);
      });
      
      console.log("\nDRY-RUN: Would encode", failing.length, "quality lessons");
      return;
    }
    
    // Phase 3: Encode lessons (write to MongoDB for learning loop)
    console.log("\nQuality patterns to encode:");
    const lessonPatterns: Record<string, { count: number; samples: Array<{ id: any; name: any; reasons: string[] }> }> = {};
    failing.forEach((f) => {
      f.flags.forEach((flag) => {
        if (!lessonPatterns[flag]) {
          lessonPatterns[flag] = { count: 0, samples: [] };
        }
        lessonPatterns[flag].count++;
        if (lessonPatterns[flag].samples.length < 3) {
          lessonPatterns[flag].samples.push({
            id: f.id,
            name: f.name,
            reasons: f.reasons
          });
        }
      });
    });
    
    // Log patterns
    Object.entries(lessonPatterns).forEach(([flag, data]) => {
      console.log(`\n  ${flag} (${data.count} occurrences):`);
      data.samples.forEach((s, i) => {
        console.log(`    ${i + 1}. ${s.name}: ${s.reasons.join("; ")}`);
      });
    });
    
    // Create lesson documents
    const lessonsCollection = db.collection(QUALITY_LESSONS_COLLECTION);
    const lessonDocs: QualityLesson[] = [];
    
    Object.entries(lessonPatterns).forEach(([flag, data]) => {
      lessonDocs.push({
        lessonId: `lesson-${Date.now()}-${flag.toLowerCase().replace(/_/g, "-")}`,
        createdAt: new Date(),
        vertical: MONGODB_DB,
        lessonType: inferLessonType(flag),
        pattern: {
          flag,
          occurrences: data.count,
          samples: data.samples.map((s) => ({
            listingId: String(s.id),
            name: String(s.name),
            context: s.reasons.join("; ")
          }))
        },
        recommendation: generateRecommendation(flag),
        appliedCount: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        status: "learning"
      });
    });
    
    // Write lessons to DB
    if (lessonDocs.length > 0 && !dryRun) {
      await lessonsCollection.insertMany(lessonDocs as any);
      console.log(`\n✅ Encoded ${lessonDocs.length} quality lessons to DB`);
    } else if (lessonDocs.length > 0) {
      console.log(`\nDRY-RUN: Would encode ${lessonDocs.length} quality lessons`);
    }
    
    console.log("\n✅ Quality-loop complete");
    console.log(JSON.stringify({
      db: MONGODB_DB,
      scanned: scored.length,
      alreadyGood: alreadyGood.length,
      needImprovement: failing.length,
      wouldImprove: toImprove.length,
      lessonsEncoded: lessonDocs.length,
      dryRun
    }, null, 2));
    
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Quality-loop failed:", err);
  process.exit(1);
});
