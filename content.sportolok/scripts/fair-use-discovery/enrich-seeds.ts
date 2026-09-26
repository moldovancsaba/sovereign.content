#!/usr/bin/env tsx
/**
 * Fair-use enrichment agent
 *
 * Processes find-seeds.json:
 * 1. Pending seeds (high confidence first)
 * 2. Optional detail-page fetch for address/phone (ONE fetch per seed)
 * 3. Quality gate
 * 4. ingestSourceText → DISCOVERED cards (D metric)
 * 5. Mark ingested/rejected
 *
 * Határon túl seeds (`camera: hataron-tul` / territory HATARON-TUL) send
 * `x-sportolok-camera: hataron-tul` so management routes into `${MONGODB_DB}_hataron-tul`.
 *
 *   npm run fair-use:enrich
 *   npm run fair-use:enrich -- --dry-run --limit=5
 *   npm run fair-use:enrich -- --camera=hataron-tul --limit=3
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
import { politeFetch } from "./lib/common";
import { extractHungarianSportFacility } from "./lib/hungarianExtract";
import {
  ingestSourceText,
  type IngestConfig,
} from "../../ingest/client.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIND_SEEDS_FILE = path.join(__dirname, "data", "find-seeds.json");

const HT_COUNTRY_LABEL: Record<string, { en: string; hu: string }> = {
  RO: { en: "Romania", hu: "Románia" },
  RS: { en: "Serbia", hu: "Szerbia" },
  SK: { en: "Slovakia", hu: "Szlovákia" },
  UA: { en: "Ukraine", hu: "Ukrajna" },
  HR: { en: "Croatia", hu: "Horvátország" },
  SI: { en: "Slovenia", hu: "Szlovénia" },
  AT: { en: "Austria", hu: "Ausztria" },
};

interface EnrichmentResult {
  seedId: string;
  outcome: "ingested" | "rejected" | "error";
  reason: string;
  listingId?: string;
  camera?: string;
  response?: unknown;
}

function loadConfig(): IngestConfig {
  const baseUrl =
    process.env.INGEST_BASE_URL ||
    process.env.SPORT_INGEST_BASE_URL ||
    "https://sport.doneisbetter.com";
  const apiKey = process.env.INGEST_API_KEY || process.env.SPORT_INGEST_API_KEY || "";
  if (!apiKey) throw new Error("INGEST_API_KEY required for live enrich");
  return { baseUrl, apiKey };
}

function isHataronTul(seed: FindSeed): boolean {
  return seed.camera === "hataron-tul" || seed.territory === "HATARON-TUL";
}

function seedCamera(seed: FindSeed): "itthon" | "hataron-tul" {
  return isHataronTul(seed) ? "hataron-tul" : "itthon";
}

async function deepenSeed(seed: FindSeed): Promise<FindSeed> {
  const url = seed.researchSources[0]?.url;
  if (!url) return seed;
  // Already has a street-level address (postal code)
  if (seed.initialFacts.address && /\d{4}\s+\S+/.test(seed.initialFacts.address)) {
    return seed;
  }
  // Only deepen when discovery URL looks like a facility detail page
  if (!/\/uszoda\/|\/letesitmeny\//i.test(url)) return seed;

  try {
    console.log(`   🔎 Deepen fetch: ${url}`);
    const res = await politeFetch(url);
    if (!res.ok) return seed;
    const html = await res.text();
    const extracted = extractHungarianSportFacility(html, url, {
      sourceId: seed.researchSources[0].sourceId,
      sourceUrl: url,
      territory: seed.territory,
      activityTypes: [seed.activityType],
    });
    // Prefer candidate whose title matches the seed name — never swap in a nearby listing
    const seedName = seed.initialFacts.name.trim().toLowerCase();
    const best =
      extracted.find((c) => c.title.trim().toLowerCase() === seedName) ||
      extracted.find((c) => {
        const t = c.title.trim().toLowerCase();
        return t.includes(seedName) || seedName.includes(t);
      }) ||
      (extracted.length === 1 ? extracted[0] : undefined);
    if (!best) return seed;

    const keepName =
      !best.title ||
      best.title.trim().toLowerCase() === seedName ||
      best.title.trim().toLowerCase().includes(seedName) ||
      seedName.includes(best.title.trim().toLowerCase());

    const nextAddress = best.address || seed.initialFacts.address;
    // Never keep NSÜ HQ footer as a venue street address
    const addressOk =
      nextAddress &&
      !/Petzvál\s*József/i.test(nextAddress) &&
      !/^1119\s+Budapest/i.test(nextAddress)
        ? nextAddress
        : seed.initialFacts.address &&
            !/Petzvál\s*József/i.test(seed.initialFacts.address) &&
            !/^1119\s+Budapest/i.test(seed.initialFacts.address)
          ? seed.initialFacts.address
          : undefined;

    return {
      ...seed,
      initialFacts: {
        name: keepName ? best.title || seed.initialFacts.name : seed.initialFacts.name,
        address: addressOk,
        contact: {
          ...seed.initialFacts.contact,
          ...best.contact,
        },
      },
      confidence:
        best.confidence === "high" || seed.confidence === "high"
          ? "high"
          : best.confidence === "medium" || seed.confidence === "medium"
            ? "medium"
            : "low",
    };
  } catch (err: any) {
    console.log(`   ⚠️  Deepen failed: ${err.message}`);
    return seed;
  }
}

function buildSourceText(seed: FindSeed, about: string): string {
  const c = seed.initialFacts.contact || {};
  const ht = isHataronTul(seed);
  const code = (seed.countryCode || (ht ? "" : "HU")).toUpperCase();
  const country = ht
    ? HT_COUNTRY_LABEL[code]?.en || code || "Unknown"
    : "Hungary";
  const locality = ht
    ? seed.initialFacts.address || HT_COUNTRY_LABEL[code]?.hu || country
    : seed.territory === "HUN-BUD"
      ? "Budapest"
      : "Hungary";
  const qualified =
    seed.activityType === "swimming"
      ? "swimming-facility"
      : seed.activityType === "fitness"
        ? "fitness-facility"
        : "sport-facility";
  const lines = [
    `URL: ${seed.researchSources[0]?.url || ""}`,
    `Qualified as: ${qualified}`,
    `Name: ${seed.initialFacts.name}`,
    `Venue: ${seed.initialFacts.name}`,
    seed.initialFacts.address ? `Address: ${seed.initialFacts.address}` : null,
    `Locality: ${locality}`,
    `Country: ${country}`,
    code ? `CountryCode: ${code}` : null,
    ht ? "Camera: hataron-tul" : null,
    c.phone ? `Phone: ${c.phone}` : null,
    c.email ? `Email: ${c.email}` : null,
    c.website ? `Website: ${c.website}` : null,
    "",
    about,
    "",
    `Research source: ${seed.researchSources.map((s) => s.url).join(", ")}`,
    `Discovery date: ${seed.discoveryDate}`,
    `Activity: ${seed.activityType}`,
  ].filter((x): x is string => typeof x === "string" && x.length > 0);
  return lines.join("\n");
}

function buildAbout(seed: FindSeed): string {
  const { name, address } = seed.initialFacts;
  const ht = isHataronTul(seed);
  const code = (seed.countryCode || "").toUpperCase();
  const countryHu = ht ? HT_COUNTRY_LABEL[code]?.hu : undefined;
  const kind =
    seed.activityType === "swimming"
      ? "tanuszoda / uszoda"
      : seed.activityType === "water-sports"
        ? "vízisport-központ"
        : seed.activityType === "handball"
          ? "sportcsarnok"
          : seed.activityType === "fitness"
            ? "edzőterem"
            : seed.activityType === "school-sport"
              ? "iskolai sportlétesítmény"
              : ht
                ? "magyar nyelvű sportklub / sportegyesület"
                : "sportlétesítmény";
  // Hungarian visitor copy — no English fair-use boilerplate, no invented phones.
  let about = `A ${name} ${kind}`;
  if (address) about += ` (${address}`;
  if (countryHu) about += address ? `, ${countryHu}` : ` (${countryHu}`;
  if (address || countryHu) about += ")";
  about += ".";
  about +=
    " Helyszíni programok, belépés és nyitvatartás előtt érdemes a hivatalos oldalon tájékozódni.";
  return about;
}

function researchCardId(seed: FindSeed): string {
  if (seed.seedId.startsWith("seed-ht-")) {
    return `research-ht-${seed.seedId.replace(/^seed-ht-/, "")}`;
  }
  const slug = seed.seedId.replace(/^seed-hun-/, "");
  return `research-hun-${slug}`;
}

async function enrichSeed(
  seed: FindSeed,
  dryRun: boolean
): Promise<EnrichmentResult> {
  console.log(`\n🔬 Enriching: ${seed.seedId}`);
  console.log(`   Name: ${seed.initialFacts.name}`);
  console.log(`   Confidence: ${seed.confidence}`);

  const deepened = await deepenSeed(seed);
  console.log(`   Address: ${deepened.initialFacts.address || "(none)"}`);

  if (!deepened.initialFacts.name || deepened.initialFacts.name.length < 5) {
    return { seedId: seed.seedId, outcome: "rejected", reason: "name_too_short" };
  }
  const junkName =
    /^(napozó|vasas|termál|kültéri|wellness|tanmedence|úszómedence|hullámmedence|élménymedence|gyermekmedence|margaréta medence)$/i;
  if (junkName.test(deepened.initialFacts.name.trim())) {
    return { seedId: seed.seedId, outcome: "rejected", reason: "junk_generic_name" };
  }
  if (!deepened.initialFacts.address) {
    return { seedId: seed.seedId, outcome: "rejected", reason: "no_address" };
  }
  // Locality-only addresses ("Budapest, Hungary") are ok for medium, but prefer street-level for ingest
  if (
    deepened.confidence === "medium" &&
    /^[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű\s-]+,\s*Hungary$/i.test(deepened.initialFacts.address) &&
    !/\d{4}\s/.test(deepened.initialFacts.address)
  ) {
    // Still allow named venues with locality — continue
  }
  if (deepened.confidence === "low") {
    return { seedId: seed.seedId, outcome: "rejected", reason: "confidence_low" };
  }

  // Határon túl needs CountryCode for territory admission — never invent phones.
  if (isHataronTul(deepened) && !deepened.countryCode) {
    return { seedId: seed.seedId, outcome: "rejected", reason: "ht_missing_country_code" };
  }

  const about = buildAbout(deepened);
  const sourceText = buildSourceText(deepened, about);
  const id = researchCardId(deepened);
  const camera = seedCamera(deepened);

  if (dryRun) {
    console.log(`   [DRY RUN] Would ingest ${id} camera=${camera} (${sourceText.length} chars)`);
    console.log(`   --- sourceText preview ---\n${sourceText.slice(0, 400)}\n   ---`);
    return {
      seedId: seed.seedId,
      outcome: "ingested",
      reason: "dry-run-success",
      listingId: id,
      camera,
    };
  }

  try {
    const cfg = loadConfig();
    const response = await ingestSourceText(cfg, {
      id,
      sourceText,
      sourcePool: "live_discovery",
      reprocess: false,
      camera,
    });
    console.log(`   ✅ Ingested ${id} → camera ${camera}`);
    return {
      seedId: seed.seedId,
      outcome: "ingested",
      reason: "ingest-success",
      listingId: id,
      camera,
      response,
    };
  } catch (error: any) {
    console.error(`   ❌ Ingest failed:`, error.message);
    return {
      seedId: seed.seedId,
      outcome: "error",
      reason: `ingest-error: ${error.message}`,
      camera,
    };
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 5;
  const cameraArg = process.argv.find((arg) => arg.startsWith("--camera="));
  const cameraFilter = cameraArg?.split("=")[1]?.trim() || null;

  console.log("🌱 Sportolok Fair-Use Enrichment Agent");
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`   Limit: ${limit}`);
  if (cameraFilter) console.log(`   Camera filter: ${cameraFilter}`);

  if (!fs.existsSync(FIND_SEEDS_FILE)) {
    console.log("📭 No find-seeds.json — run fair-use:one-pass first.");
    return;
  }

  const findSeeds = loadFindSeeds(FIND_SEEDS_FILE);
  let pendingSeeds = getPendingSeeds(findSeeds);
  if (cameraFilter === "hataron-tul") {
    pendingSeeds = pendingSeeds.filter(isHataronTul);
  } else if (cameraFilter === "itthon") {
    pendingSeeds = pendingSeeds.filter((s) => !isHataronTul(s));
  }
  console.log(`📊 Pending: ${pendingSeeds.length} / total ${Object.keys(findSeeds).length}`);

  if (!pendingSeeds.length) {
    console.log("✨ No pending seeds.");
    return;
  }

  const toProcess = pendingSeeds.slice(0, limit);
  const results: EnrichmentResult[] = [];

  for (const seed of toProcess) {
    markSeedEnriching(findSeeds, seed.seedId);
    const result = await enrichSeed(seed, dryRun);
    results.push(result);
    if (result.outcome === "ingested") markSeedIngested(findSeeds, seed.seedId);
    else if (result.outcome === "rejected") markSeedRejected(findSeeds, seed.seedId);
  }

  if (!dryRun) {
    saveFindSeeds(FIND_SEEDS_FILE, findSeeds);
    console.log(`\n💾 Saved find-seeds.json`);
  }

  const ingested = results.filter((r) => r.outcome === "ingested").length;
  const rejected = results.filter((r) => r.outcome === "rejected").length;
  const errors = results.filter((r) => r.outcome === "error").length;

  console.log(
    JSON.stringify(
      {
        job: "sportolok:fair-use-enrich",
        dryRun,
        cameraFilter,
        summary: { ingested, rejected, errors, remaining: pendingSeeds.length - toProcess.length },
        results,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
