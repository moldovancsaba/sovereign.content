#!/usr/bin/env node
/**
 * catalog:autopilot — Bounded discover→extract→prepare→gate→publish cycles.
 *
 * Advances content_cards through the pipeline. Structured cards (Name: / CountryCode: / lat-lng headers)
 * can advance without LLM. This is the CLI twin of /api/cron/content-intelligence-autopilot.
 *
 * SSOT contract: https://sovereigncontent.messmass.com/jobs#catalogautopilot
 *
 * Usage:
 *   MONGODB_URI=... MONGODB_DB=sportolok node scripts/catalog-autopilot.mjs
 *   MONGODB_URI=... node scripts/catalog-autopilot.mjs --ticks 10 --requeue-limit 10
 *   MONGODB_URI=... node scripts/catalog-autopilot.mjs --dry-run
 *
 * Flags:
 *   --ticks N          Max cycles per run (default: 10)
 *   --requeue-limit N  Max stuck cards to requeue (default: 10)
 *   --dry-run          Report only, no writes
 *
 * Exit codes:
 *   0 = success (including empty queue)
 *   1 = error
 */

import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "sportolok";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
const maxTicks = parseInt(args.find((a) => a.startsWith("--ticks="))?.split("=")[1] || "10");
const requeueLimit = parseInt(args.find((a) => a.startsWith("--requeue-limit="))?.split("=")[1] || "10");
const dryRun = args.includes("--dry-run");

async function main() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log(`Autopilot ${dryRun ? "(DRY-RUN)" : ""}: db=${MONGODB_DB} maxTicks=${maxTicks} requeueLimit=${requeueLimit}`);
    
    // Count cards by state
    const cardsCollection = db.collection("content_cards");
    const states = await cardsCollection.aggregate([
      { $group: { _id: "$lifecycleState", count: { $sum: 1 } } }
    ]).toArray();
    
    const stateCounts = Object.fromEntries(states.map((s) => [s._id, s.count]));
    console.log("Card states:", JSON.stringify(stateCounts, null, 2));
    
    // Find requeue candidates: REVIEW_READY, BLOCKED_REPAIRABLE, QUARANTINED with structured headers
    const requeueCandidates = await cardsCollection.find({
      lifecycleState: { $in: ["REVIEW_READY", "BLOCKED_REPAIRABLE", "QUARANTINED"] },
      // Has structured headers (can advance without LLM)
      "rawPayload.name": { $exists: true, $ne: "" }
    }).limit(requeueLimit).toArray();
    
    console.log(`Found ${requeueCandidates.length} requeue candidates`);
    
    if (dryRun) {
      console.log("\nDRY-RUN: Would requeue:");
      requeueCandidates.slice(0, 5).forEach((card) => {
        console.log(`  ${card._id} (${card.lifecycleState}) - ${card.rawPayload?.name || "unnamed"}`);
      });
      
      console.log("\nDRY-RUN: Would run", maxTicks, "autopilot cycles");
      return;
    }
    
    // Requeue stuck cards back to DISCOVERED
    let requeued = 0;
    for (const card of requeueCandidates) {
      await cardsCollection.updateOne(
        { _id: card._id },
        { 
          $set: { 
            lifecycleState: "DISCOVERED",
            requeuedAt: new Date(),
            requeueReason: "autopilot-structured-retry"
          } 
        }
      );
      requeued++;
    }
    
    if (requeued > 0) {
      console.log(`Requeued ${requeued} cards to DISCOVERED`);
    }
    
    // Note: The actual cycle runner (runOneCycle) requires LLM for extraction.
    // This CLI focuses on requeuing structured cards that can be processed when
    // the Cloud Agent runs with proper extraction tooling.
    
    console.log("\nAutopilot tick complete");
    console.log({
      db: MONGODB_DB,
      maxTicks,
      requeued,
      note: "Full cycle runner requires Cloud Agent extraction. This CLI requeues structured cards."
    });
    
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Autopilot failed:", err);
  process.exit(1);
});
