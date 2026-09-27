#!/usr/bin/env tsx
/**
 * Re-fetch facility detail pages and deepen addresses.
 *
 * Prefer street when the source has one. Otherwise emit city-level `Near {city}`
 * (Nominatim locality pin). Phone is optional — never required to proceed.
 *
 *   npm run fair-use:deepen-addresses -- --dry-run --limit=10
 *   npm run fair-use:deepen-addresses -- --limit=20
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  loadFindSeeds,
  saveFindSeeds,
  type FindSeed,
} from "./lib/seedBuilder";
import { politeFetch } from "./lib/common";
import { extractHungarianSportFacility } from "./lib/hungarianExtract";
import {
  ingestSourceText,
  ingestPatch,
  type IngestConfig,
} from "../../ingest/client.ts";
import { isStreetLevel, resolvePlaceLine } from "./lib/placeAddress.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIND_SEEDS_FILE = path.join(__dirname, "data", "find-seeds.json");

function loadConfig(): IngestConfig {
  const baseUrl =
    process.env.INGEST_BASE_URL ||
    process.env.SPORT_INGEST_BASE_URL ||
    "https://sport.doneisbetter.com";
  const apiKey = process.env.INGEST_API_KEY || process.env.SPORT_INGEST_API_KEY || "";
  if (!apiKey) throw new Error("INGEST_API_KEY required for live deepen");
  return { baseUrl, apiKey };
}

function researchCardId(seed: FindSeed): string {
  const slug = seed.seedId.replace(/^seed-hun-/, "");
  return `research-hun-${slug}`;
}

function publishedListingId(seed: FindSeed): string {
  return `l-${researchCardId(seed)}`;
}

function placeFor(seed: FindSeed) {
  return resolvePlaceLine({
    address: seed.initialFacts.address,
    territory: seed.territory,
    name: seed.initialFacts.name,
  });
}

function buildAbout(seed: FindSeed): string {
  const { name } = seed.initialFacts;
  const place = placeFor(seed);
  const label = place?.streetLevel ? place.line1 : place?.locality;
  let about = `A ${name} tanuszoda / uszoda`;
  if (label) about += ` (${label})`;
  about += ".";
  about +=
    " Helyszíni programok, belépés és nyitvatartás előtt érdemes a hivatalos oldalon tájékozódni.";
  return about;
}

function buildSourceText(seed: FindSeed): string {
  const c = seed.initialFacts.contact || {};
  const about = buildAbout(seed);
  const place = placeFor(seed);
  // Phone optional — omit when absent. No street → Near {city} for locality pin.
  return [
    `URL: ${seed.researchSources[0]?.url || ""}`,
    "Qualified as: swimming-facility",
    `Name: ${seed.initialFacts.name}`,
    `Venue: ${seed.initialFacts.name}`,
    place ? `Address: ${place.line1}` : null,
    place ? `Locality: ${place.locality}` : null,
    "Country: Hungary",
    "CountryCode: HU",
    c.phone ? `Phone: ${c.phone}` : null,
    c.email ? `Email: ${c.email}` : null,
    "",
    about,
    "",
    `Research source: ${seed.researchSources.map((s) => s.url).join(", ")}`,
    `Discovery date: ${seed.discoveryDate}`,
    `Activity: ${seed.activityType}`,
  ]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join("\n");
}

function parseAddressParts(seed: FindSeed): {
  line1: string;
  locality: string;
  postalCode?: string;
} {
  const place = placeFor(seed);
  const addr = seed.initialFacts.address || "";
  const postal = addr.match(/\b(\d{4})\b/)?.[1];
  if (place?.streetLevel) {
    const first = addr.split(",")[0]?.trim() || place.line1;
    const street =
      (/^\d+\s+/.test(first) || /(utca|út|útja|tér|körút)/i.test(first)
        ? first
        : addr.match(/\d+\s+[^,]+(?:utca|út|útja|tér|körút)[^,]*/i)?.[0]?.trim()) || place.line1;
    return { line1: street, locality: place.locality, postalCode: postal };
  }
  return {
    line1: place?.line1 || `Near ${place?.locality || "Budapest"}`,
    locality: place?.locality || "Budapest",
    postalCode: postal,
  };
}

async function deepenOne(
  seed: FindSeed,
  dryRun: boolean,
  cfg: IngestConfig | null
): Promise<Record<string, unknown>> {
  const url = seed.researchSources[0]?.url;
  if (!url) return { seedId: seed.seedId, outcome: "skip", reason: "no_url" };
  if (isStreetLevel(seed.initialFacts.address)) {
    return { seedId: seed.seedId, outcome: "skip", reason: "already_street", address: seed.initialFacts.address };
  }
  if (!/\/uszoda\/|\/letesitmeny\//i.test(url)) {
    return { seedId: seed.seedId, outcome: "skip", reason: "not_detail_url" };
  }

  console.log(`\n📍 Deepen: ${seed.seedId} — ${seed.initialFacts.name}`);
  const res = await politeFetch(url);
  if (!res.ok) return { seedId: seed.seedId, outcome: "error", reason: `http_${res.status}` };
  const html = await res.text();
  const extracted = extractHungarianSportFacility(html, url, {
    sourceId: seed.researchSources[0].sourceId,
    sourceUrl: url,
    territory: seed.territory,
    activityTypes: [seed.activityType],
  });
  const seedName = seed.initialFacts.name.trim().toLowerCase();
  const best =
    extracted.find((c) => c.title.trim().toLowerCase() === seedName) ||
    extracted.find((c) => {
      const t = c.title.trim().toLowerCase();
      return t.includes(seedName) || seedName.includes(t);
    }) ||
    (extracted.length === 1 ? extracted[0] : undefined);

  const gotStreet = !!(best?.address && isStreetLevel(best.address));
  const gotPhone =
    !!best?.contact?.phone && best.contact.phone !== seed.initialFacts.contact?.phone;
  const cityHint = best?.address && !isStreetLevel(best.address) ? best.address : seed.initialFacts.address;

  const updated: FindSeed = {
    ...seed,
    initialFacts: {
      name: seed.initialFacts.name,
      address: gotStreet ? best!.address! : cityHint,
      contact: { ...seed.initialFacts.contact, ...best?.contact },
    },
    confidence: gotStreet ? "high" : seed.confidence === "low" ? "medium" : seed.confidence,
    status: seed.status === "rejected" ? "pending" : seed.status,
  };

  const place = placeFor(updated);
  // Phone optional. No street → city-level Near pin is enough to proceed.
  if (!gotStreet && !gotPhone && !place) {
    return {
      seedId: seed.seedId,
      outcome: "skip",
      reason: "no_street_phone_or_city",
      got: best?.address || null,
    };
  }

  if (dryRun) {
    return {
      seedId: seed.seedId,
      outcome: "dry-run",
      addressBefore: seed.initialFacts.address,
      addressAfter: gotStreet ? best?.address : place?.line1,
      phone: best?.contact?.phone || null,
      phoneOptional: true,
      geoPrecision: gotStreet ? "street" : "locality",
    };
  }

  // Prefer reprocess sourceText (works for DISCOVERED + published research cards)
  const cardId = researchCardId(updated);
  let ingestOutcome: unknown = null;
  let pathUsed = "reprocess";
  try {
    ingestOutcome = await ingestSourceText(cfg!, {
      id: cardId,
      sourceText: buildSourceText(updated),
      sourcePool: "live_discovery",
      reprocess: true,
    });
  } catch (err: any) {
    // Card never created (e.g. previously false-rejected) → create fresh
    if (/nothing to reprocess|404/i.test(err.message)) {
      pathUsed = "create";
      try {
        ingestOutcome = await ingestSourceText(cfg!, {
          id: cardId,
          sourceText: buildSourceText(updated),
          sourcePool: "live_discovery",
          reprocess: false,
        });
      } catch (errCreate: any) {
        return {
          seedId: seed.seedId,
          outcome: "error",
          reason: `create_failed: ${errCreate.message}`,
          addressAfter: place?.line1 || updated.initialFacts.address,
        };
      }
    } else {
      // Fallback: patch published listing venue.address (Near {city} when no street)
      pathUsed = "patch";
      const parts = parseAddressParts(updated);
      try {
        ingestOutcome = await ingestPatch(cfg!, {
          id: publishedListingId(updated),
          patch: {
            venue: {
              name: updated.initialFacts.name,
              address: {
                line1: parts.line1,
                locality: parts.locality,
                countryCode: "HU",
                ...(parts.postalCode ? { postalCode: parts.postalCode } : {}),
              },
            },
          },
        });
      } catch (err2: any) {
        return {
          seedId: seed.seedId,
          outcome: "error",
          reason: `ingest_failed: ${err.message} / ${err2.message}`,
          addressAfter: parts.line1,
        };
      }
    }
  }

  return {
    seedId: seed.seedId,
    outcome: "deepened",
    path: pathUsed,
    addressBefore: seed.initialFacts.address,
    addressAfter: gotStreet ? best?.address : place?.line1,
    phone: best?.contact?.phone || updated.initialFacts.contact?.phone || null,
    geoPrecision: gotStreet ? "street" : "locality",
    response: ingestOutcome,
    seedUpdate: updated,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rescue = process.argv.includes("--rescue-rejected");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 25;

  console.log("📍 Sportolok address deepen");
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`   Limit: ${limit}`);

  if (!fs.existsSync(FIND_SEEDS_FILE)) {
    console.log("No find-seeds.json");
    return;
  }

  const seeds = loadFindSeeds(FIND_SEEDS_FILE);
  if (rescue) {
    for (const s of Object.values(seeds)) {
      if (s.status === "rejected") s.status = "pending";
    }
  }

  const candidates = Object.values(seeds)
    .filter((s) => s.status === "ingested" || s.status === "pending" || s.status === "rejected")
    .filter((s) => !isStreetLevel(s.initialFacts.address))
    .slice(0, limit);

  console.log(`📊 Candidates needing street or city-level pin: ${candidates.length}`);

  const cfg = dryRun ? null : loadConfig();
  const results: Array<Record<string, unknown>> = [];

  for (const seed of candidates) {
    const result = await deepenOne(seed, dryRun, cfg);
    results.push(result);
    if (result.outcome === "deepened" && result.seedUpdate) {
      const updated = result.seedUpdate as FindSeed;
      seeds[seed.seedId] = {
        ...updated,
        status: "ingested",
      };
      delete (result as { seedUpdate?: unknown }).seedUpdate;
    }
  }

  if (!dryRun) {
    saveFindSeeds(FIND_SEEDS_FILE, seeds);
    console.log("\n💾 Saved find-seeds.json");
  }

  const deepened = results.filter((r) => r.outcome === "deepened" || r.outcome === "dry-run").length;
  const skipped = results.filter((r) => r.outcome === "skip" || r.outcome === "no_street").length;
  const errors = results.filter((r) => r.outcome === "error").length;

  console.log(
    JSON.stringify(
      {
        job: "sportolok:fair-use-deepen-addresses",
        dryRun,
        summary: { deepened, skipped, errors, scanned: results.length },
        results,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
