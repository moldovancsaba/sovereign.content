#!/usr/bin/env node
/**
 * catalog:find — Evidence-only venue discovery for new markets.
 *
 * SSOT contract: https://sovereigncontent.messmass.com/jobs#catalogfind
 *
 * Cloud Agent FIND workflow:
 * 1. CLI plans campaign + seeds firstBrief
 * 2. Agent WebSearches each searchQueries entry
 * 3. Agent verifies evidence bar (named venue, location, contact, first-party URL)
 * 4. Agent seeds fixture → dry-run → apply → record attempt
 * 5. Zero-result when no evidence-grade venue found
 *
 * Never invents phones, emails, ages, court counts. Honest zero-result when no evidence.
 *
 * Usage:
 *   npm run catalog:find -- --until-found --max-cells 8
 *   npm run catalog:find -- --fixture scripts/data/HUN-verified.json --dry-run
 *   npm run catalog:find -- --fixture scripts/data/HUN-verified.json
 *   npm run catalog:find -- --record-attempt --cc HU --city Budapest --outcome seeded
 *
 * Flags:
 *   --until-found              Do-until-seed campaign mode
 *   --max-cells N              Max locality cells to search (default: 8)
 *   --fixture PATH             Apply research fixture JSON
 *   --record-attempt           Record attempt outcome
 *   --cc COUNTRY_CODE          Country code for attempt
 *   --city CITY                City name for attempt
 *   --outcome seeded|zero-result  Attempt outcome
 *   --dry-run                  Report only, no writes
 *
 * Env:
 *   MONGODB_URI, MONGODB_DB, VERTICAL
 *
 * Exit codes:
 *   0 = success (including honest zero-result)
 *   1 = error
 */

import { MongoClient } from "mongodb";
import fs from "fs";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required");
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || "sportolok";
const vertical = process.env.VERTICAL || "sportolok";

// Parse args
const args = process.argv.slice(2);

function getArg(name: string): string | null {
  const eqIdx = args.findIndex((a) => a.startsWith(`${name}=`));
  if (eqIdx !== -1) return args[eqIdx].split("=")[1];
  const spaceIdx = args.findIndex((a) => a === name);
  if (spaceIdx !== -1 && spaceIdx + 1 < args.length) return args[spaceIdx + 1];
  return null;
}

const untilFound = args.includes("--until-found");
const maxCells = parseInt(getArg("--max-cells") || "8");
const fixturePath = getArg("--fixture");
const recordAttempt = args.includes("--record-attempt");
const cc = getArg("--cc");
const city = getArg("--city");
const outcome = getArg("--outcome") as "seeded" | "zero-result" | null;
const dryRun = args.includes("--dry-run");

console.log(`FIND ${dryRun ? "(DRY-RUN)" : ""}: db=${dbName} vertical=${vertical}`);

// Sparse market cells for sportolok (Hungary sport facilities)
const SPARSE_CELLS = [
  { cc: "HU", city: "Debrecen", activity: "uszoda", priority: "high" },
  { cc: "HU", city: "Szeged", activity: "uszoda", priority: "high" },
  { cc: "HU", city: "Pécs", activity: "uszoda", priority: "medium" },
  { cc: "HU", city: "Győr", activity: "uszoda", priority: "medium" },
  { cc: "HU", city: "Nyíregyháza", activity: "fitness-terem", priority: "medium" },
  { cc: "HU", city: "Kecskemét", activity: "fitness-terem", priority: "medium" },
  { cc: "HU", city: "Székesfehérvár", activity: "uszoda", priority: "low" },
  { cc: "HU", city: "Miskolc", activity: "uszoda", priority: "low" },
];

interface FindBrief {
  cell: typeof SPARSE_CELLS[0];
  searchQueries: string[];
  sourcesToCheck: string[];
  evidenceBar: string[];
}

async function main() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Mode 1: Apply fixture
    if (fixturePath) {
      console.log(`\n=== APPLY FIXTURE ===`);
      console.log(`Path: ${fixturePath}`);
      
      if (!fs.existsSync(fixturePath)) {
        console.error(`Fixture not found: ${fixturePath}`);
        process.exit(1);
      }
      
      const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      console.log(`Loaded ${fixture.length} venue(s)`);
      
      if (dryRun) {
        console.log("\nDRY-RUN: Would seed:");
        fixture.slice(0, 3).forEach((v: any, i: number) => {
          console.log(`  ${i + 1}. ${v.name} (${v.city}, ${v.countryCode})`);
        });
        return;
      }
      
      // Create content_cards in DISCOVERED state
      const cards = db.collection("content_cards");
      let seeded = 0;
      
      for (const venue of fixture) {
        const card = {
          lifecycleState: "DISCOVERED",
          vertical,
          discoveredAt: new Date(),
          discoveredVia: "catalog-find",
          rawPayload: {
            name: venue.name,
            sourceText: `Name: ${venue.name}\nCountryCode: ${venue.countryCode}\nCity: ${venue.city}\n${venue.address ? `Address: ${venue.address}\n` : ""}${venue.website ? `Website: ${venue.website}\n` : ""}${venue.phone ? `Phone: ${venue.phone}\n` : ""}${venue.description || ""}`,
            extractedImages: venue.images || [],
          },
        };
        
        await cards.insertOne(card);
        seeded++;
      }
      
      console.log(`\n✅ Seeded ${seeded} venue(s) as DISCOVERED cards`);
      return;
    }
    
    // Mode 2: Record attempt
    if (recordAttempt) {
      if (!cc || !city || !outcome) {
        console.error("--record-attempt requires --cc, --city, and --outcome");
        process.exit(1);
      }
      
      console.log(`\n=== RECORD ATTEMPT ===`);
      console.log(`Location: ${city}, ${cc}`);
      console.log(`Outcome: ${outcome}`);
      
      if (dryRun) {
        console.log("\nDRY-RUN: Would record attempt");
        return;
      }
      
      const attempts = db.collection("find_attempts");
      await attempts.insertOne({
        vertical,
        countryCode: cc,
        city,
        outcome,
        recordedAt: new Date(),
        recordedBy: "catalog-find",
      });
      
      console.log("✅ Attempt recorded");
      return;
    }
    
    // Mode 3: Until-found campaign
    if (untilFound) {
      console.log(`\n=== UNTIL-FOUND CAMPAIGN ===`);
      console.log(`Max cells: ${maxCells}`);
      
      // Filter to cells not yet attempted or with zero-result (can retry)
      const attempts = db.collection("find_attempts");
      const attemptedCities = new Set(
        (await attempts.find({ vertical, outcome: "seeded" }).toArray())
          .map((a: any) => `${a.countryCode}-${a.city}`)
      );
      
      const pendingCells = SPARSE_CELLS.filter(
        (cell) => !attemptedCities.has(`${cell.cc}-${cell.city}`)
      ).slice(0, maxCells);
      
      if (pendingCells.length === 0) {
        console.log("\n✅ Budget exhausted: all cells attempted");
        return;
      }
      
      console.log(`\nPending cells: ${pendingCells.length}`);
      
      // Generate firstBrief for Cloud Agent to execute
      const firstCell = pendingCells[0];
      const brief: FindBrief = {
        cell: firstCell,
        searchQueries: [
          `${firstCell.activity} ${firstCell.city} ${firstCell.cc}`,
          `sport ${firstCell.city} Hungary`,
          `${firstCell.city} ${firstCell.activity} nyitvatartás`,
        ],
        sourcesToCheck: [
          "Official venue websites",
          "City sport facility directories",
          "Google Maps verified listings",
        ],
        evidenceBar: [
          "Named venue (not generic 'Sport Center')",
          "Specific location pin or address",
          "Contact (phone, website, or first-party URL)",
          "Prefer two independent sources",
        ],
      };
      
      console.log("\n📋 FIRST BRIEF (Cloud Agent executes):");
      console.log(JSON.stringify(brief, null, 2));
      
      console.log("\n🤖 Agent Instructions:");
      console.log("1. WebSearch each searchQueries entry");
      console.log("2. Open official pages from sourcesToCheck");
      console.log("3. Verify evidence bar (never invent phones/emails/ages)");
      console.log("4. If FOUND:");
      console.log("   - Create fixture JSON: scripts/data/HUN-${firstCell.city}-verified.json");
      console.log("   - npm run catalog:find -- --fixture <path> --dry-run");
      console.log("   - npm run catalog:find -- --fixture <path>");
      console.log(`   - npm run catalog:find -- --record-attempt --cc ${firstCell.cc} --city ${firstCell.city} --outcome seeded`);
      console.log("   - STOP (campaign complete)");
      console.log("5. If ZERO:");
      console.log(`   - npm run catalog:find -- --record-attempt --cc ${firstCell.cc} --city ${firstCell.city} --outcome zero-result`);
      console.log("   - Continue to next cell");
      
      console.log(`\n⏸️ Campaign paused: waiting for agent execution on ${firstCell.city}`);
      return;
    }
    
    // Default: show status
    console.log("\n=== FIND STATUS ===");
    const attempts = db.collection("find_attempts");
    const attemptStats = await attempts.aggregate([
      { $match: { vertical } },
      { $group: { _id: "$outcome", count: { $sum: 1 } } },
    ]).toArray();
    
    const stats = Object.fromEntries(attemptStats.map((s: any) => [s._id, s.count]));
    console.log("Attempts:", JSON.stringify(stats, null, 2));
    
    const cards = db.collection("content_cards");
    const discoveredCount = await cards.countDocuments({
      vertical,
      discoveredVia: "catalog-find",
    });
    
    console.log(`Discovered via FIND: ${discoveredCount}`);
    console.log("\nUsage:");
    console.log("  npm run catalog:find -- --until-found --max-cells 8");
    console.log("  npm run catalog:find -- --fixture scripts/data/HUN-verified.json");
    
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("FIND failed:", err);
  process.exit(1);
});
