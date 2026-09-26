#!/usr/bin/env tsx
/**
 * Fair-use discovery: Határon túl one-pass
 *
 * Separate camera from Itthon (HU sources.json). Walks
 * sources-hataron-tul.json only — RO/RS/HR/SI/AT/SK/UA Hungarian-language
 * venues/clubs under one big "Határon túl" product mode.
 *
 * Discovery only — enrich via `fair-use:enrich -- --camera=hataron-tul` once
 * management pack.cities includes Határon túl (routes to `${MONGODB_DB}_hataron-tul`).
 * Seeds land in find-seeds.json with territory HATARON-TUL + camera hataron-tul.
 *
 *   npm run fair-use:hataron-tul-pass
 *   npm run fair-use:hataron-tul-pass -- --dry-run
 *   npm run fair-use:hataron-tul-pass -- --limit=3
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  type SourceRegistry,
  type SourceConfig,
  loadSourceState,
  saveSourceState,
  isSourceReady,
  sleepBetweenSources,
} from "./lib/common";
import { processGenericDirectory } from "./lib/sources/genericDirectory";
import { isHataronTulJunkTitle } from "./lib/hataronTulExtract";
import {
  loadFindSeeds,
  saveFindSeeds,
  addCandidateToSeeds,
} from "./lib/seedBuilder";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SOURCES_FILE = path.join(__dirname, "sources-hataron-tul.json");
const STATE_FILE = path.join(__dirname, "data", "source-state-hataron-tul.json");
const FIND_SEEDS_FILE = path.join(__dirname, "data", "find-seeds.json");
const METRICS_FILE = path.join(__dirname, "data", "metrics-hataron-tul-pass.json");

function argInt(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!hit) return fallback;
  const n = parseInt(hit.split("=")[1], 10);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limit = argInt("--limit", 99);
  const skipSleep = process.argv.includes("--no-sleep");

  console.log("🚀 Sportolok Fair-Use — Határon túl pass");
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`   Camera: hataron-tul (one big Határon túl)`);
  console.log("");

  if (!fs.existsSync(SOURCES_FILE)) {
    console.error(`❌ Missing ${SOURCES_FILE}`);
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf-8")) as SourceRegistry & {
    camera?: string;
    label?: string;
  };
  const state = loadSourceState(STATE_FILE);
  const nowMs = Date.now();

  const active = registry.sources.filter(
    (s) => s.status === "active" || s.status === "planned",
  );
  let ready = active.filter((s) =>
    isSourceReady(state[s.id], s.cooldownSec, nowMs),
  );
  if (limit < ready.length) ready = ready.slice(0, limit);

  console.log(`📋 Sources: ${registry.sources.length} · active ${active.length} · ready ${ready.length}`);
  console.log("");

  if (!ready.length) {
    console.log("⏸️  No Határon túl sources ready.");
    return;
  }

  const findSeeds = loadFindSeeds(FIND_SEEDS_FILE);
  let totalCandidates = 0;
  const perSource: Array<Record<string, unknown>> = [];

  for (let i = 0; i < ready.length; i++) {
    const source: SourceConfig = ready[i];
    console.log(`[${i + 1}/${ready.length}] ${source.name} (${source.countryCode || "?"})`);

    const result = await processGenericDirectory(source, dryRun);
    state[source.id] = {
      sourceId: source.id,
      lastFetchMs: nowMs,
      lastStatus: result.success ? "ok" : "error",
      lastError: result.error,
    };

    const kept = result.candidates.filter(
      (c) => !isHataronTulJunkTitle(c.title),
    );
    for (const candidate of kept) {
      addCandidateToSeeds(findSeeds, candidate);
      totalCandidates++;
    }

    perSource.push({
      sourceId: source.id,
      countryCode: source.countryCode,
      success: result.success,
      candidates: kept.length,
      droppedJunk: result.candidates.length - kept.length,
      error: result.error,
      sample: kept.slice(0, 3).map((c) => c.title),
    });

    console.log("");
    if (!skipSleep && i < ready.length - 1) {
      await sleepBetweenSources(registry.defaultInterSourceSec);
    }
  }

  const htPending = Object.values(findSeeds).filter(
    (s) => s.territory === "HATARON-TUL" && s.status === "pending",
  ).length;
  const htTotal = Object.values(findSeeds).filter(
    (s) => s.territory === "HATARON-TUL",
  ).length;

  if (!dryRun) {
    saveSourceState(STATE_FILE, state);
    saveFindSeeds(FIND_SEEDS_FILE, findSeeds);
  }

  const metrics = {
    updatedAt: new Date().toISOString(),
    job: "fair-use:hataron-tul-pass",
    camera: "hataron-tul",
    label: "Határon túl",
    dryRun,
    sourcesProcessed: ready.length,
    candidates: totalCandidates,
    hataronTulSeedsTotal: htTotal,
    hataronTulPending: htPending,
    perSource,
    note: "Discovery done. Enrich with fair-use:enrich --camera=hataron-tul after management cities deploy.",
  };
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2) + "\n");

  console.log("📊 Határon túl pass summary");
  console.log(JSON.stringify(metrics, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
