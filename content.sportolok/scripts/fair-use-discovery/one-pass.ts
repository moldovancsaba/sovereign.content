#!/usr/bin/env tsx
/**
 * Fair-use discovery: one-pass crawler
 * 
 * Based on content.classscout/scripts/rqk-fair-use pattern:
 * - Walks source registry (sources.json)
 * - Processes ONE page per source per pass
 * - Enforces rate limits: 45s inter-source, 300s pass cooldown
 * - Per-source cooldown (600–1200s)
 * - Polite User-Agent disclosure
 * - Feeds candidates into find-seeds.json
 * 
 * Usage:
 *   npm run fair-use:one-pass
 *   npm run fair-use:one-pass -- --dry-run
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  type SourceRegistry,
  type SourceState,
  loadSourceState,
  saveSourceState,
  isSourceReady,
  sleepBetweenSources,
} from "./lib/common";
import { processGenericDirectory } from "./lib/sources/genericDirectory";
import {
  loadFindSeeds,
  saveFindSeeds,
  addCandidateToSeeds,
} from "./lib/seedBuilder";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_DIR = __dirname;
const SOURCES_FILE = path.join(SCRIPT_DIR, "sources.json");
const STATE_FILE = path.join(SCRIPT_DIR, "data", "source-state.json");
const FIND_SEEDS_FILE = path.join(SCRIPT_DIR, "data", "find-seeds.json");

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log("🚀 Sportolok Fair-Use Discovery - One Pass");
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  // Load sources
  if (!fs.existsSync(SOURCES_FILE)) {
    console.error(`❌ Sources file not found: ${SOURCES_FILE}`);
    process.exit(1);
  }

  const registry: SourceRegistry = JSON.parse(
    fs.readFileSync(SOURCES_FILE, "utf-8")
  );

  console.log(`📋 Loaded ${registry.sources.length} sources`);
  console.log(
    `   Inter-source delay: ${registry.defaultInterSourceSec}s`
  );
  console.log(`   Pass cooldown: ${registry.defaultPassSleepSec}s`);
  console.log("");

  // Load state
  const state = loadSourceState(STATE_FILE);
  const nowMs = Date.now();

  // Filter ready sources
  const activeSources = registry.sources.filter((s) => s.status === "active" || s.status === "planned");
  const readySources = activeSources.filter((source) =>
    isSourceReady(state[source.id], source.cooldownSec, nowMs)
  );

  console.log(`✅ ${readySources.length} sources ready (${activeSources.length - readySources.length} on cooldown)`);
  console.log("");

  if (readySources.length === 0) {
    console.log("⏸️  No sources ready. Try again later.");
    return;
  }

  // Load find-seeds
  const findSeeds = loadFindSeeds(FIND_SEEDS_FILE);
  let totalCandidates = 0;

  // Process each ready source
  for (let i = 0; i < readySources.length; i++) {
    const source = readySources[i];

    console.log(`[${i + 1}/${readySources.length}] ${source.name}`);

    // Process source
    const result = await processGenericDirectory(source, dryRun);

    // Update state
    state[source.id] = {
      sourceId: source.id,
      lastFetchMs: nowMs,
      lastStatus: result.success ? "ok" : "error",
      lastError: result.error,
    };

    // Add candidates to find-seeds
    for (const candidate of result.candidates) {
      addCandidateToSeeds(findSeeds, candidate);
      totalCandidates++;
    }

    console.log("");

    // Inter-source delay
    if (i < readySources.length - 1) {
      await sleepBetweenSources(registry.defaultInterSourceSec);
    }
  }

  // Save state
  if (!dryRun) {
    saveSourceState(STATE_FILE, state);
    saveFindSeeds(FIND_SEEDS_FILE, findSeeds);
    console.log(`💾 Saved state and ${totalCandidates} candidate(s) to find-seeds`);
  } else {
    console.log(`[DRY RUN] Would save ${totalCandidates} candidate(s)`);
  }

  // Summary
  const pendingCount = Object.values(findSeeds).filter(
    (s) => s.status === "pending"
  ).length;
  console.log("");
  console.log("📊 Pass Summary:");
  console.log(`   Sources processed: ${readySources.length}`);
  console.log(`   New candidates: ${totalCandidates}`);
  console.log(`   Pending seeds: ${pendingCount}`);
  console.log("");
  console.log(`⏰ Next pass cooldown: ${registry.defaultPassSleepSec}s`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
