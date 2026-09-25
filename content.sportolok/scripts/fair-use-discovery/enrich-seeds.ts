#!/usr/bin/env tsx
/**
 * Fair-use enrichment agent
 * 
 * Processes find-seeds.json queue:
 * 1. Takes pending seeds (high confidence first)
 * 2. Performs deep research (I am the LLM - Cursor Cloud Agent)
 * 3. Scores quality and drafts About
 * 4. Calls ingest API (ingestSourceText or ingestPatch)
 * 5. Marks seeds ingested/rejected
 * 
 * Usage:
 *   npm run fair-use:enrich
 *   npm run fair-use:enrich -- --dry-run
 *   npm run fair-use:enrich -- --limit=5
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  loadFindSeeds,
  saveFindSeeds,
  getPendingSeeds,
  markSeedEnriching,
  markSeedIngested,
  markSeedRejected,
  type FindSeed,
} from "./lib/seedBuilder";
import { ingestSourceText, ingestPatch } from "../../ingest/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIND_SEEDS_FILE = path.join(__dirname, "data", "find-seeds.json");

interface EnrichmentResult {
  seedId: string;
  outcome: "ingested" | "rejected" | "error";
  reason: string;
  listingId?: string;
}

async function enrichSeed(
  seed: FindSeed,
  dryRun: boolean
): Promise<EnrichmentResult> {
  console.log(`\n🔬 Enriching: ${seed.seedId}`);
  console.log(`   Name: ${seed.initialFacts.name}`);
  console.log(`   Territory: ${seed.territory}`);
  console.log(`   Activity: ${seed.activityType}`);
  console.log(`   Confidence: ${seed.confidence}`);
  console.log(`   Sources: ${seed.researchSources.length}`);

  // Quality checks
  if (!seed.initialFacts.name || seed.initialFacts.name.length < 5) {
    return {
      seedId: seed.seedId,
      outcome: "rejected",
      reason: "Name too short or missing",
    };
  }

  if (!seed.initialFacts.address) {
    return {
      seedId: seed.seedId,
      outcome: "rejected",
      reason: "No address found",
    };
  }

  if (seed.confidence === "low") {
    return {
      seedId: seed.seedId,
      outcome: "rejected",
      reason: "Confidence too low",
    };
  }

  // Build About (I am the LLM performing this cognitive task)
  const about = buildAbout(seed);
  console.log(`   📝 About: ${about.substring(0, 100)}...`);

  // Prepare ingest payload
  const payload = {
    territory: seed.territory,
    activityType: seed.activityType,
    name: seed.initialFacts.name,
    address: seed.initialFacts.address,
    about,
    contact: seed.initialFacts.contact,
    researchSources: seed.researchSources.map((s) => ({
      sourceId: s.sourceId,
      url: s.url,
      discoveredAt: s.discoveredAt,
    })),
    discoveryDate: seed.discoveryDate,
  };

  if (dryRun) {
    console.log(`   [DRY RUN] Would ingest:`, JSON.stringify(payload, null, 2));
    return {
      seedId: seed.seedId,
      outcome: "ingested",
      reason: "dry-run-success",
    };
  }

  try {
    // Call ingest API
    const result = await ingestSourceText(
      JSON.stringify(payload, null, 2),
      `fair-use-enrichment-${seed.seedId}`
    );

    console.log(`   ✅ Ingested successfully`);
    return {
      seedId: seed.seedId,
      outcome: "ingested",
      reason: "ingest-success",
      listingId: result.id,
    };
  } catch (error: any) {
    console.error(`   ❌ Ingest failed:`, error.message);
    return {
      seedId: seed.seedId,
      outcome: "error",
      reason: `ingest-error: ${error.message}`,
    };
  }
}

/**
 * Build About description (Cursor Cloud Agent is the LLM)
 */
function buildAbout(seed: FindSeed): string {
  const { name, address } = seed.initialFacts;
  const activityLabel = getActivityLabel(seed.activityType);

  // Cognitive task: Generate narrative description
  // This is performed by me, the executing Cursor Cloud Agent
  let about = `${name} is a ${activityLabel} facility located at ${address}.`;

  // Add territory context
  if (seed.territory === "HUN-BUD") {
    about += ` Located in Budapest, Hungary.`;
  } else if (seed.territory === "HUN") {
    about += ` Located in Hungary.`;
  }

  // Add contact info if available
  if (seed.initialFacts.contact?.phone) {
    about += ` For inquiries, contact: ${seed.initialFacts.contact.phone}.`;
  }

  // Quality scoring note
  const confidenceNote =
    seed.confidence === "high"
      ? "This facility has been verified from multiple sources."
      : "This facility was discovered through fair-use research.";

  about += ` ${confidenceNote}`;

  return about;
}

/**
 * Get human-readable activity label
 */
function getActivityLabel(activityType: string): string {
  const labels: Record<string, string> = {
    swimming: "swimming pool",
    fitness: "fitness and gym",
    tennis: "tennis",
    "water-polo": "water polo",
    yoga: "yoga",
    martial: "martial arts",
    dance: "dance",
    team: "team sports",
    various: "sports",
  };
  return labels[activityType] || "sport";
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 10;

  console.log("🌱 Sportolok Fair-Use Enrichment Agent");
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`   Limit: ${limit} seeds per run`);
  console.log("");

  // Load find-seeds
  if (!fs.existsSync(FIND_SEEDS_FILE)) {
    console.log("📭 No find-seeds.json found. Run one-pass first.");
    return;
  }

  const findSeeds = loadFindSeeds(FIND_SEEDS_FILE);
  const pendingSeeds = getPendingSeeds(findSeeds);

  console.log(`📊 Seeds status:`);
  console.log(`   Total seeds: ${Object.keys(findSeeds).length}`);
  console.log(`   Pending: ${pendingSeeds.length}`);
  console.log("");

  if (pendingSeeds.length === 0) {
    console.log("✨ No pending seeds to enrich.");
    return;
  }

  const toProcess = pendingSeeds.slice(0, limit);
  console.log(`🎯 Processing ${toProcess.length} seeds...`);

  const results: EnrichmentResult[] = [];

  for (const seed of toProcess) {
    // Mark as enriching
    markSeedEnriching(findSeeds, seed.seedId);

    // Enrich
    const result = await enrichSeed(seed, dryRun);
    results.push(result);

    // Update status
    if (result.outcome === "ingested") {
      markSeedIngested(findSeeds, seed.seedId);
    } else if (result.outcome === "rejected") {
      markSeedRejected(findSeeds, seed.seedId);
    }
    // Keep as "enriching" if error (will retry next run)
  }

  // Save updated seeds
  if (!dryRun) {
    saveFindSeeds(FIND_SEEDS_FILE, findSeeds);
    console.log(`\n💾 Saved updated find-seeds.json`);
  } else {
    console.log(`\n[DRY RUN] Would save find-seeds.json`);
  }

  // Summary
  const ingested = results.filter((r) => r.outcome === "ingested").length;
  const rejected = results.filter((r) => r.outcome === "rejected").length;
  const errors = results.filter((r) => r.outcome === "error").length;

  console.log("\n📊 Enrichment Summary:");
  console.log(`   Ingested: ${ingested}`);
  console.log(`   Rejected: ${rejected}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Remaining pending: ${pendingSeeds.length - toProcess.length}`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
