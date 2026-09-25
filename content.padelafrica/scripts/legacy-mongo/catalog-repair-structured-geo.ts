/**
 * Cloud Agent / CLI repair: fill missing Address / CountryCode / lat-lng / Phone on stuck
 * structured-header cards from research-grounded facts, then requeue them for autopilot.
 *
 * No AI Gateway. Uses Nominatim (GEOCODER_USER_AGENT) only when a patch omits coords.
 *
 *   VERTICAL=padel-africa MONGODB_URI=... MONGODB_DB=padel-africa \
 *     npx tsx scripts/catalog-repair-structured-geo.ts [--dry-run] [--run-autopilot]
 */
import { MongoClient } from "mongodb";
import { ContentCardSchema, reprocessCard } from "../src/lib/pipeline/cards";
import { upsertStructuredSourceHeaders } from "../src/lib/pipeline/structuredSource";
import { createCachedGeocoder, mongoGeocodeCache } from "../src/lib/geo/geocodeCache";
import { runBoundedCycles } from "../src/lib/pipeline/autopilot";
import { createLlmClient, isLlmConfigured } from "../src/lib/pipeline/extraction";

type Patch = {
  Address?: string;
  Locality?: string;
  CountryCode?: string;
  Phone?: string;
  Latitude?: string;
  Longitude?: string;
  /** Nominatim query when Latitude/Longitude omitted. */
  geocodeQuery?: string;
};

/** Research-grounded fills for cards stuck on no_geocode / too_incomplete without lat-lng headers. */
const PATCHES: Record<string, Patch> = {
  "openclaw-kimalemultisports237-instagram.com": {
    Address: "Youpwe, Douala, Cameroon",
    Locality: "Douala",
    CountryCode: "CM",
    Latitude: "4.0105092",
    Longitude: "9.6996140",
  },
  "openclaw-chlpadelclub-instagram.com": {
    Address: "Avenue Tshinyama, Quartier Karavia, Commune annexe, Lubumbashi",
    Locality: "Lubumbashi",
    CountryCode: "CD",
    Phone: "+243850212222",
    Latitude: "-11.6627353",
    Longitude: "27.4175706",
  },
  "openclaw-padelville-instagram.com": {
    Address: "CCHJ+R7, Libreville, Gabon",
    Locality: "Libreville",
    CountryCode: "GA",
    Phone: "+24174872727",
    Latitude: "0.4086518",
    Longitude: "9.4418849",
  },
  "openclaw-padbolgabon-instagram.com": {
    Address: "Libreville, Gabon",
    Locality: "Libreville",
    CountryCode: "GA",
    Latitude: "0.4086518",
    Longitude: "9.4418849",
  },
  "openclaw-centralpadel-instagram.com": {
    Address: "Haï Riyadh, Ilot 80, Bir El Djir, Oran",
    Locality: "Bir El Djir",
    CountryCode: "DZ",
    Phone: "+213770059521",
    Latitude: "35.7198740",
    Longitude: "-0.5675118",
  },
  "openclaw-oxygenarena-instagram.com": {
    Address: "Forêt de Bouchaoui, Chéraga, Alger",
    Locality: "Chéraga",
    CountryCode: "DZ",
    Phone: "+213560003535",
    Latitude: "36.7535243",
    Longitude: "2.9047929",
  },
  "openclaw-padelcourtatlakevictoriaserenagolfresortspa-serenahotels.com": {
    Address: "Lake Victoria Serena Golf Resort & Spa, Kigo",
    Locality: "Kigo",
    CountryCode: "UG",
    Latitude: "-0.2564662",
    Longitude: "31.7319951",
  },
  "openclaw-urbansport-urbansport.mu": {
    Address: "Grand Baie, Mauritius",
    Locality: "Grand Baie",
    CountryCode: "MU",
    Latitude: "-20.0130199",
    Longitude: "57.5846270",
  },
  "openclaw-rmclubgrandbaie-rmclub.mu": {
    Address: "Forbach, near Grand Baie, Mauritius",
    Locality: "Forbach",
    CountryCode: "MU",
    Phone: "+2302671440",
    Latitude: "-20.0671334",
    Longitude: "57.6318177",
  },
  "openclaw-padelmagic-padelmagic.club": {
    Address: "Sofitel Hotel Ivoire / Central Tennis Club, Cocody, Abidjan",
    Locality: "Abidjan",
    CountryCode: "CI",
    Phone: "+2250767076755",
    Latitude: "5.3264778",
    Longitude: "-4.0043241",
  },
  "openclaw-padelsquare-facebook.com": {
    Address: "Blvd de Marseille, Bietry, Zone 4, Abidjan",
    Locality: "Abidjan",
    CountryCode: "CI",
    Phone: "+2250714939393",
    Latitude: "5.2885739",
    Longitude: "-3.9887720",
  },
};

async function resolvePack() {
  const { resolveVertical } = await import("../src/lib/vertical/resolve");
  return resolveVertical(process.env.VERTICAL?.trim() || "management-console");
}

async function main() {
  if (!process.env.GEOCODER_USER_AGENT) {
    process.env.GEOCODER_USER_AGENT =
      "PadelAfricaCloudAgent/1.0 (catalog repair; +https://github.com/moldovancsaba/management)";
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dryRun = process.argv.includes("--dry-run");
  const runAutopilot = process.argv.includes("--run-autopilot");

  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "management");
  const geocoder = createCachedGeocoder({ store: mongoGeocodeCache(db) });

  const results: Array<Record<string, unknown>> = [];
  for (const [id, patch] of Object.entries(PATCHES)) {
    const doc = await db.collection("content_cards").findOne({ id });
    if (!doc) {
      results.push({ id, status: "missing" });
      continue;
    }
    const card = ContentCardSchema.parse(doc);
    const sourceText = typeof card.rawPayload?.sourceText === "string" ? card.rawPayload.sourceText : "";
    let next = { ...patch };
    if ((!next.Latitude || !next.Longitude) && next.geocodeQuery) {
      const hit = await geocoder.geocode({
        addressLine1: next.geocodeQuery,
        locality: next.Locality,
        countryCode: next.CountryCode,
      });
      if (hit) {
        next = { ...next, Latitude: String(hit.lat), Longitude: String(hit.lng) };
      }
    }
    const { geocodeQuery: _q, ...headerPatch } = next;
    const updatedText = upsertStructuredSourceHeaders(sourceText, headerPatch);
    if (dryRun) {
      results.push({ id, status: "dry-run", state: card.state, patch: headerPatch });
      continue;
    }
    // Always reprocessCard: it atomically sets sourceText + DISCOVERED. A separate updateOne
    // then moveCard($set whole card) would wipe the patched sourceText with the stale payload.
    const outcome = await reprocessCard(db, card.id, updatedText, "structured-geo-repair");
    results.push({ id, status: outcome.kind, from: card.state });
  }

  let autopilot: unknown = null;
  if (runAutopilot && !dryRun) {
    const { pack, safety } = await resolvePack();
    const llm = isLlmConfigured() ? createLlmClient() : null;
    autopilot = await runBoundedCycles(db, pack, safety, llm, Object.keys(PATCHES).length + 2, geocoder, {
      requeueStructured: true,
      requeueLimit: Object.keys(PATCHES).length,
    });
  }

  console.log(JSON.stringify({ dryRun, repaired: results, autopilot }, null, 2));
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
