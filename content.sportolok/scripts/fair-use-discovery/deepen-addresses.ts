#!/usr/bin/env tsx
/**
 * Re-fetch facility detail pages and deepen street-level addresses.
 *
 * Fixes the prior bug where deepen preferred nearby `.pcard` listings over the
 * facility's own PublicSwimmingPool JSON-LD.
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIND_SEEDS_FILE = path.join(__dirname, "data", "find-seeds.json");

function isStreetLevel(address?: string): boolean {
  if (!address) return false;
  // postal code OR house number + street token
  return (
    /\d{4}\s+\S+/.test(address) ||
    /^\d+\s+\S+/.test(address) ||
    /\s\d+[.,]?\s*(utca|út|útja|tér|körút|krt)/i.test(address)
  );
}

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

function buildAbout(seed: FindSeed): string {
  const { name, address } = seed.initialFacts;
  let about = `A ${name} tanuszoda / uszoda`;
  if (address) about += ` (${address})`;
  about += ".";
  about +=
    " Helyszíni programok, belépés és nyitvatartás előtt érdemes a hivatalos oldalon tájékozódni.";
  return about;
}

function buildSourceText(seed: FindSeed): string {
  const c = seed.initialFacts.contact || {};
  const about = buildAbout(seed);
  return [
    `URL: ${seed.researchSources[0]?.url || ""}`,
    "Qualified as: swimming-facility",
    `Name: ${seed.initialFacts.name}`,
    `Venue: ${seed.initialFacts.name}`,
    seed.initialFacts.address ? `Address: ${seed.initialFacts.address}` : null,
    seed.territory === "HUN-BUD" ? "Locality: Budapest" : "Locality: Hungary",
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

function parseAddressParts(address: string): {
  line1?: string;
  locality: string;
  postalCode?: string;
} {
  const postal = address.match(/\b(\d{4})\b/)?.[1];
  const localityMatch = address.match(/\b(Budapest|Hungary)\b/i);
  const locality = localityMatch?.[1] === "Hungary" ? "Budapest" : localityMatch?.[1] || "Budapest";
  // Prefer street before first comma if it looks like a street
  const first = address.split(",")[0]?.trim() || "";
  let line1: string | undefined;
  if (/^\d+\s+/.test(first) || /(utca|út|útja|tér|körút)/i.test(first)) {
    line1 = first;
  } else {
    // "1039 Budapest, 272 Királyok útja" style after our formatter
    const street = address.match(/\d+\s+[^,]+(?:utca|út|útja|tér|körút)[^,]*/i)?.[0];
    line1 = street?.trim();
  }
  return { line1, locality, postalCode: postal };
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
  if (!gotStreet && !gotPhone) {
    return {
      seedId: seed.seedId,
      outcome: "no_street",
      reason: "source_lacks_street_or_new_phone",
      got: best?.address || null,
    };
  }

  const updated: FindSeed = {
    ...seed,
    initialFacts: {
      name: seed.initialFacts.name,
      address: gotStreet ? best!.address! : seed.initialFacts.address,
      contact: { ...seed.initialFacts.contact, ...best?.contact },
    },
    confidence: gotStreet ? "high" : seed.confidence === "low" ? "medium" : seed.confidence,
    status: seed.status === "rejected" ? "pending" : seed.status,
  };

  if (dryRun) {
    return {
      seedId: seed.seedId,
      outcome: "dry-run",
      addressBefore: seed.initialFacts.address,
      addressAfter: best.address,
      phone: best.contact?.phone,
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
          addressAfter: updated.initialFacts.address,
        };
      }
    } else {
      // Fallback: patch published listing venue.address
      pathUsed = "patch";
      const parts = parseAddressParts(updated.initialFacts.address || "");
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
          addressAfter: updated.initialFacts.address,
        };
      }
    }
  }

  return {
    seedId: seed.seedId,
    outcome: "deepened",
    path: pathUsed,
    addressBefore: seed.initialFacts.address,
    addressAfter: best.address,
    phone: best.contact?.phone,
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

  console.log(`📊 Candidates needing street address: ${candidates.length}`);

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
  const noStreet = results.filter((r) => r.outcome === "no_street").length;
  const errors = results.filter((r) => r.outcome === "error").length;

  console.log(
    JSON.stringify(
      {
        job: "sportolok:fair-use-deepen-addresses",
        dryRun,
        summary: { deepened, noStreet, errors, scanned: results.length },
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
