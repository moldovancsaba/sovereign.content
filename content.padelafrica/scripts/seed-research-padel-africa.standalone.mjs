#!/usr/bin/env node
/**
 * Seed verified research venues (non-OSM) into padel-africa — evidence-only.
 *
 * Reads a JSON array of venue records (e.g. scripts/data/algeria-padel-verified.json,
 * scripts/data/angola-padel-verified.json), built from country ecosystem CSV audits.
 * Never invents clubs, court counts, or prices. About prose must not embed URLs/phones.
 *
 *   MONGODB_URI=... node scripts/seed-research-padel-africa.standalone.mjs [--dry-run]
 *   MONGODB_URI=... node scripts/seed-research-padel-africa.standalone.mjs \
 *     --fixture=scripts/data/angola-padel-verified.json [--dry-run]
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE = resolve(__dirname, "data/algeria-padel-verified.json");
const SERVING_DERIVATION_VERSION = 3;

const TZ_BY_CC = {
  DZ: "Africa/Algiers",
  AO: "Africa/Luanda",
  BF: "Africa/Ouagadougou",
  BI: "Africa/Bujumbura",
  BW: "Africa/Gaborone",
  CV: "Atlantic/Cape_Verde",
  ZA: "Africa/Johannesburg",
  EG: "Africa/Cairo",
  KE: "Africa/Nairobi",
  MA: "Africa/Casablanca",
  TN: "Africa/Tunis",
  NA: "Africa/Windhoek",
  CI: "Africa/Abidjan",
  MZ: "Africa/Maputo",
  BJ: "Africa/Porto-Novo",
  CM: "Africa/Douala",
  CG: "Africa/Brazzaville",
  CD: "Africa/Kinshasa",
  DJ: "Africa/Djibouti",
  GQ: "Africa/Malabo",
  SZ: "Africa/Mbabane",
  GA: "Africa/Libreville",
  GH: "Africa/Accra",
  GN: "Africa/Conakry",
  GM: "Africa/Banjul",
  LY: "Africa/Tripoli",
  MG: "Indian/Antananarivo",
  MW: "Africa/Blantyre",
  MR: "Africa/Nouakchott",
  MU: "Indian/Mauritius",
  NG: "Africa/Lagos",
  RW: "Africa/Kigali",
  SC: "Indian/Mahe",
  SL: "Africa/Freetown",
  SN: "Africa/Dakar",
  SO: "Africa/Mogadishu",
  TG: "Africa/Lome",
  TZ: "Africa/Dar_es_Salaam",
  UG: "Africa/Kampala",
  ZM: "Africa/Lusaka",
  ZW: "Africa/Harare",
};

const COUNTRY_BOUNDS = {
  AO: { minLat: -18.05, maxLat: -4.37, minLng: 11.66, maxLng: 24.09 },
  BF: { minLat: 9.4, maxLat: 15.1, minLng: -5.6, maxLng: 2.4 },
  BI: { minLat: -4.5, maxLat: -2.3, minLng: 28.9, maxLng: 30.9 },
  BW: { minLat: -27.0, maxLat: -17.75, minLng: 19.95, maxLng: 29.4 },
  CI: { minLat: 4.2, maxLat: 10.75, minLng: -8.6, maxLng: -2.45 },
  CM: { minLat: 1.65, maxLat: 13.08, minLng: 8.33, maxLng: 16.2 },
  CG: { minLat: -5.1, maxLat: 3.75, minLng: 11.0, maxLng: 18.7 },
  CD: { minLat: -13.5, maxLat: 5.4, minLng: 12.2, maxLng: 31.3 },
  CV: { minLat: 14.8, maxLat: 17.3, minLng: -25.4, maxLng: -22.6 },
  DJ: { minLat: 10.9, maxLat: 12.75, minLng: 41.75, maxLng: 43.45 },
  DZ: { minLat: 18.96, maxLat: 37.09, minLng: -8.67, maxLng: 11.99 },
  EG: { minLat: 21.7, maxLat: 31.75, minLng: 24.65, maxLng: 37.0 },
  GA: { minLat: -4.0, maxLat: 2.35, minLng: 8.65, maxLng: 14.6 },
  GH: { minLat: 4.5, maxLat: 11.2, minLng: -3.3, maxLng: 1.25 },
  GN: { minLat: 7.15, maxLat: 12.7, minLng: -15.1, maxLng: -7.6 },
  GM: { minLat: 13.05, maxLat: 13.85, minLng: -16.85, maxLng: -13.8 },
  GQ: { minLat: -1.5, maxLat: 3.8, minLng: 5.6, maxLng: 11.4 },
  KE: { minLat: -4.8, maxLat: 5.1, minLng: 33.9, maxLng: 42.0 },
  LY: { minLat: 19.5, maxLat: 33.2, minLng: 9.3, maxLng: 25.2 },
  MA: { minLat: 21.3, maxLat: 35.95, minLng: -17.15, maxLng: -0.95 },
  MG: { minLat: -25.7, maxLat: -11.85, minLng: 43.15, maxLng: 50.55 },
  MR: { minLat: 14.7, maxLat: 27.35, minLng: -17.1, maxLng: -4.8 },
  MU: { minLat: -20.55, maxLat: -19.95, minLng: 57.3, maxLng: 57.85 },
  MW: { minLat: -17.2, maxLat: -9.35, minLng: 32.65, maxLng: 35.95 },
  MZ: { minLat: -26.87, maxLat: -10.47, minLng: 30.21, maxLng: 40.84 },
  NA: { minLat: -28.97, maxLat: -16.96, minLng: 11.72, maxLng: 25.26 },
  NG: { minLat: 4.27, maxLat: 13.89, minLng: 2.67, maxLng: 14.68 },
  RW: { minLat: -2.84, maxLat: -1.05, minLng: 28.86, maxLng: 30.9 },
  SC: { minLat: -10.3, maxLat: -3.7, minLng: 45.2, maxLng: 56.3 },
  SL: { minLat: 6.9, maxLat: 10.0, minLng: -13.35, maxLng: -10.25 },
  SN: { minLat: 12.31, maxLat: 16.69, minLng: -17.53, maxLng: -11.36 },
  SO: { minLat: -1.7, maxLat: 12.0, minLng: 40.9, maxLng: 51.5 },
  SZ: { minLat: -27.4, maxLat: -25.65, minLng: 30.75, maxLng: 32.2 },
  TG: { minLat: 6.1, maxLat: 11.15, minLng: -0.15, maxLng: 1.85 },
  TN: { minLat: 30.24, maxLat: 37.54, minLng: 7.52, maxLng: 11.6 },
  TZ: { minLat: -11.75, maxLat: -0.99, minLng: 29.34, maxLng: 40.44 },
  UG: { minLat: -1.48, maxLat: 4.22, minLng: 29.57, maxLng: 35.04 },
  ZA: { minLat: -34.84, maxLat: -22.13, minLng: 16.45, maxLng: 32.89 },
  ZM: { minLat: -18.1, maxLat: -8.2, minLng: 21.95, maxLng: 33.75 },
  ZW: { minLat: -22.45, maxLat: -15.6, minLng: 25.2, maxLng: 33.1 },
};

let CURATED_ABOUT = {};

function fixturePathFromArgv(argv) {
  const flag = argv.find((a) => a.startsWith("--fixture="));
  if (flag) return resolve(flag.slice("--fixture=".length));
  const idx = argv.indexOf("--fixture");
  if (idx >= 0 && argv[idx + 1]) return resolve(argv[idx + 1]);
  return process.env.RESEARCH_FIXTURE ? resolve(process.env.RESEARCH_FIXTURE) : DEFAULT_FIXTURE;
}

function normalizeHttps(raw) {
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(raw.trim().includes("://") ? raw.trim() : `https://${raw.trim()}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.protocol = "https:";
    for (const p of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_)/.test(p)) url.searchParams.delete(p);
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function assertNoAboutChrome(text, id) {
  if (/\b(?:https?:\/\/|www\.)\S+/i.test(text)) {
    throw new Error(`${id}: About embeds a URL — move to contact fields`);
  }
  if (/\b(?:More at|Call\s+\+?\d)/i.test(text)) {
    throw new Error(`${id}: About leaks contact cues`);
  }
  if (text.trim().length < 120) {
    throw new Error(`${id}: About too thin (${text.trim().length} chars)`);
  }
}

function contactLinksFrom({ website, phone, email, instagram, facebook }) {
  const links = [];
  const seen = new Set();
  const push = (link) => {
    const key = `${link.type}|${link.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push(link);
  };
  if (website) {
    let host = "";
    try {
      host = new URL(website).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      /* ignore */
    }
    push({ type: "website", label: host || "Website", value: website, url: website });
  }
  if (instagram) push({ type: "instagram", label: "Instagram", value: instagram, url: instagram });
  if (facebook) push({ type: "facebook", label: "Facebook", value: facebook, url: facebook });
  if (phone) push({ type: "phone", label: "Phone", value: phone });
  if (email) push({ type: "email", label: "Email", value: email });
  return links.length ? links : undefined;
}

function locationGroupKeys({ name, website, address }) {
  const host = (() => {
    if (!website) return "";
    try {
      return new URL(website).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      return "";
    }
  })();
  const identity =
    host ||
    name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(" ")
      .filter(Boolean)
      .join(" ")
      .trim();
  if (!identity) return {};
  const locationGroupId = `lg_${createHash("sha1").update(identity).digest("hex").slice(0, 20)}`;
  const parts = [address.region, address.locality, address.line1]
    .map((v) => (v ?? "").trim().toLowerCase())
    .filter(Boolean);
  if (!parts.length) return { locationGroupId };
  return {
    locationGroupId,
    locationKey: `lk_${createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16)}`,
  };
}

function researchId(recordId) {
  return `research-${String(recordId).toLowerCase()}`;
}

function buildListing(row, now) {
  const cc = String(row.countryCode || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) throw new Error(`bad countryCode ${cc}`);
  const name = String(row.name || "").trim();
  if (!name) throw new Error("missing name");
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error(`${name}: missing coords`);
  const bounds = COUNTRY_BOUNDS[cc];
  if (bounds && (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng)) {
    throw new Error(`${name}: (${lat},${lng}) outside ${cc} bounds`);
  }

  const locality = String(row.city || "").trim();
  if (!locality) throw new Error(`${name}: missing city`);
  const region = row.region ? String(row.region).trim() : undefined;
  const line1 = String(row.line1 || "").trim() || `Near ${locality}`;
  const website = normalizeHttps(row.website);
  const phone = row.phone ? String(row.phone).trim() : undefined;
  const email = row.email ? String(row.email).trim() : undefined;
  const instagram = normalizeHttps(row.instagram);
  const facebook = normalizeHttps(row.facebook);
  const id = researchId(row.recordId);

  let description = typeof CURATED_ABOUT[id] === "string" && CURATED_ABOUT[id].trim().length >= 120
    ? CURATED_ABOUT[id].trim()
    : String(row.description || "").trim();
  assertNoAboutChrome(description, id);

  const address = {
    line1,
    locality,
    ...(region ? { region } : {}),
    countryCode: cc,
    territory: {
      continent: "AF",
      country: cc,
      ...(region ? { region } : {}),
      settlement: locality,
    },
  };

  const contactLinks = contactLinksFrom({ website, phone, email, instagram, facebook });
  const group = locationGroupKeys({ name, website: website || instagram, address });
  const primarySource = normalizeHttps(row.primarySourceUrl) || "research-audit";

  return {
    id,
    name,
    description,
    activityTypes: ["padel-club"],
    topActivityTypes: ["padel-club"],
    badges: [],
    claimStatus: "unclaimed",
    ...(website ? { website } : {}),
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(contactLinks ? { contactLinks } : {}),
    ...group,
    venueModel: row.venueModel === "outdoors" ? "outdoors" : "own_premises",
    venue: {
      name,
      address,
      geo: {
        position: { lat, lng },
        precision: row.geoPrecision === "locality" ? "locality" : "street",
        source: row.geoSource === "nominatim" ? "nominatim" : "civic",
        geocodedAt: now,
      },
    },
    schedule: {
      timezone: TZ_BY_CC[cc] || "Africa/Johannesburg",
      recurring: [],
      sessions: [],
      seasonNote: String(row.seasonNote || "Hours not listed yet.").slice(0, 200),
    },
    price: { model: "unknown" },
    media: [],
    lifecycleState: "PUBLISHED",
    source: {
      sourceName: "research-audit",
      sourceUrl: primarySource,
      ingestedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function servingDoc(listing, now) {
  const { email, phone, contactLinks, source, researchFields, ...card } = listing;
  return {
    id: listing.id,
    card: listing.topActivityTypes ? { ...card, activityTypes: listing.topActivityTypes } : card,
    searchText: [
      listing.name,
      listing.description,
      listing.venue?.address?.locality,
      listing.venue?.address?.region,
      listing.venue?.address?.countryCode,
      listing.phone,
      listing.website,
      ...(listing.contactLinks || []).map((l) => l.value),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    derivationVersion: SERVING_DERIVATION_VERSION,
    derivedAt: now,
    popularityRank: 0,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const fixturePath = fixturePathFromArgv(process.argv);
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri && !dryRun) {
    console.error("MONGODB_URI required (or pass --dry-run)");
    process.exit(1);
  }

  const rowsRaw = JSON.parse(readFileSync(fixturePath, "utf8"));
  const enrichOnly = process.argv.includes("--enrich-only");
  const rows = Array.isArray(rowsRaw) ? rowsRaw : [];
  if (!enrichOnly && rows.length < 1) throw new Error(`fixture must be a non-empty array: ${fixturePath}`);
  console.log(`fixture ${fixturePath} (${rows.length} venues)${enrichOnly ? " [--enrich-only]" : ""}`);

  const now = new Date().toISOString();

  if (!dryRun) {
    const preload = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });
    await preload.connect();
    const pdb = preload.db((process.env.MONGODB_DB || "padel-africa").trim());
    const aboutRows = await pdb.collection("listing_curated_abouts").find({}).project({ listingId: 1, description: 1 }).toArray();
    CURATED_ABOUT = Object.fromEntries(
      aboutRows
        .filter((r) => typeof r.listingId === "string" && typeof r.description === "string")
        .map((r) => [r.listingId, r.description]),
    );
    await preload.close();
  }

  const listings = rows.map((row) => buildListing(row, now));
  for (const l of listings) {
    console.log(
      `ok  ${l.venue.address.countryCode}  ${l.id}  ${l.name}  @ ${l.venue.address.locality}  venueModel=${l.venueModel}  links=${(l.contactLinks || []).length}  geo=${l.venue.geo.precision}`,
    );
  }

  if (dryRun) {
    console.log(`(--dry-run) would upsert ${listings.length} research listings`);
    if (listings[0]) console.log(JSON.stringify(listings[0], null, 2));
    if (enrichOnly) console.log("(--dry-run) enrich-only path would still attempt OSM enrich blocks for fixture country");
    return;
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });
  await client.connect();
  const db = client.db((process.env.MONGODB_DB || "padel-africa").trim());

  for (const listing of listings) {
    const { createdAt, ...rest } = listing;
    await db.collection("listings").updateOne(
      { id: listing.id },
      { $set: { ...rest, updatedAt: now }, $setOnInsert: { createdAt } },
      { upsert: true },
    );
    const doc = servingDoc(listing, now);
    const { popularityRank: _rank, ...body } = doc;
    await db.collection("listings_serving").updateOne(
      { id: doc.id },
      [
        {
          $replaceWith: {
            $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }],
          },
        },
      ],
      { upsert: true },
    );
    console.log(`wrote ${listing.venue.address.countryCode} ${listing.id}`);
  }

  // Infer fixture country for enrich-only (empty) runs.
  const fixtureCc =
    listings[0]?.venue.address.countryCode ||
    (fixturePath.includes("tanzania")
      ? "TZ"
      : fixturePath.includes("benin")
        ? "BJ"
        : undefined);
  const hasCc = (cc) => listings.some((l) => l.venue.address.countryCode === cc) || fixtureCc === cc;

  // Algeria: prior Instagram lead for Vibora stays REVIEW_READY — canonical is research-alg-ven-003.
  const prior = await db.collection("listings").findOne(
    { id: "l-openclaw-viborapadelclub-instagram.com" },
    { projection: { _id: 0, id: 1, lifecycleState: 1 } },
  );
  if (prior && prior.lifecycleState !== "PUBLISHED") {
    console.log(`note: ${prior.id} remains ${prior.lifecycleState}; published canonical is research-alg-ven-003`);
  }

  // Angola: enrich existing OSM CPA card with research contact (do not duplicate as research-ago-ven-012).
  if (hasCc("AO")) {
    const cpaPatch = {
      phone: "+244 928 240 734",
      email: "lukeny.hendrick@cpa.ao",
      updatedAt: now,
    };
    const cpaLinks = [
      { type: "website", label: "tiepadel.com", value: "https://www.tiepadel.com/ClubedePadeldeAngola", url: "https://www.tiepadel.com/ClubedePadeldeAngola" },
      { type: "facebook", label: "Facebook", value: "https://www.facebook.com/cpaclubpadelangola/", url: "https://www.facebook.com/cpaclubpadelangola/" },
      { type: "phone", label: "Phone", value: "+244 928 240 734" },
      { type: "email", label: "Email", value: "lukeny.hendrick@cpa.ao" },
    ];
    const cpa = await db.collection("listings").findOne({ id: "osm-way-1333292737", lifecycleState: "PUBLISHED" });
    if (cpa) {
      const existingLinks = Array.isArray(cpa.contactLinks) ? cpa.contactLinks : [];
      const seen = new Set(existingLinks.map((l) => `${l.type}|${l.value}`));
      const merged = [...existingLinks];
      for (const link of cpaLinks) {
        const key = `${link.type}|${link.value}`;
        if (!seen.has(key)) {
          merged.push(link);
          seen.add(key);
        }
      }
      await db.collection("listings").updateOne(
        { id: "osm-way-1333292737" },
        { $set: { ...cpaPatch, contactLinks: merged, website: cpa.website || "https://www.tiepadel.com/ClubedePadeldeAngola" } },
      );
      const fresh = await db.collection("listings").findOne({ id: "osm-way-1333292737" }, { projection: { _id: 0 } });
      if (fresh) {
        const doc = servingDoc(fresh, now);
        const { popularityRank: _r, ...body } = doc;
        await db.collection("listings_serving").updateOne(
          { id: doc.id },
          [{ $replaceWith: { $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }] } }],
          { upsert: true },
        );
      }
      console.log("enriched osm-way-1333292737 (CPA) with research phone/email/facebook");
    }
  }

  // Cameroon: enrich existing OSM Elite Padel card (do not duplicate as research-cmr-ven-001).
  if (hasCc("CM")) {
    const eliteId = "osm-way-1524068106";
    const eliteWebsite = "https://elitepadelyde.com/";
    const elitePhone = "+237 674 85 87 28";
    const eliteIg = "https://www.instagram.com/elitepadelyaounde/";
    const eliteAbout =
      typeof CURATED_ABOUT[eliteId] === "string" && CURATED_ABOUT[eliteId].trim().length >= 120
        ? CURATED_ABOUT[eliteId].trim()
        : undefined;
    const eliteLinks = [
      { type: "website", label: "elitepadelyde.com", value: eliteWebsite, url: eliteWebsite },
      { type: "instagram", label: "Instagram", value: eliteIg, url: eliteIg },
      { type: "phone", label: "Phone", value: elitePhone },
    ];
    const elite = await db.collection("listings").findOne({ id: eliteId, lifecycleState: "PUBLISHED" });
    if (elite) {
      const existingLinks = Array.isArray(elite.contactLinks) ? elite.contactLinks : [];
      const seen = new Set(existingLinks.map((l) => `${l.type}|${l.value}`));
      const merged = [...existingLinks];
      for (const link of eliteLinks) {
        const key = `${link.type}|${link.value}`;
        if (!seen.has(key)) {
          merged.push(link);
          seen.add(key);
        }
      }
      const elitePatch = {
        phone: elitePhone,
        website: eliteWebsite,
        contactLinks: merged,
        updatedAt: now,
        ...(eliteAbout ? { description: eliteAbout } : {}),
        "schedule.seasonNote": "Daily 08:00–22:00",
      };
      await db.collection("listings").updateOne({ id: eliteId }, { $set: elitePatch });
      const fresh = await db.collection("listings").findOne({ id: eliteId }, { projection: { _id: 0 } });
      if (fresh) {
        const doc = servingDoc(fresh, now);
        const { popularityRank: _r, ...body } = doc;
        await db.collection("listings_serving").updateOne(
          { id: doc.id },
          [{ $replaceWith: { $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }] } }],
          { upsert: true },
        );
      }
      console.log(`enriched ${eliteId} (Elite Padel Yaoundé) with research website/phone/instagram/About`);
    }
  }

  // Egypt: enrich existing OSM Neon Padel card (do not duplicate as a research-egy row).
  if (hasCc("EG")) {
    const neonId = "osm-way-1233805697";
    const neonPhone = "+20 110 222 0005";
    const neonWebsite = "https://actu-padel.com/en/directory/padel-club/padel-neon-new-cairo-city/";
    const neonAbout =
      typeof CURATED_ABOUT[neonId] === "string" && CURATED_ABOUT[neonId].trim().length >= 120
        ? CURATED_ABOUT[neonId].trim()
        : undefined;
    const neonLinks = [
      { type: "website", label: "actu-padel.com", value: neonWebsite, url: neonWebsite },
      { type: "phone", label: "Phone", value: neonPhone },
    ];
    const neon = await db.collection("listings").findOne({ id: neonId, lifecycleState: "PUBLISHED" });
    if (neon) {
      const existingLinks = Array.isArray(neon.contactLinks) ? neon.contactLinks : [];
      const seen = new Set(existingLinks.map((l) => `${l.type}|${l.value}`));
      const merged = [...existingLinks];
      for (const link of neonLinks) {
        const key = `${link.type}|${link.value}`;
        if (!seen.has(key)) {
          merged.push(link);
          seen.add(key);
        }
      }
      const neonPatch = {
        phone: neonPhone,
        website: neon.website || neonWebsite,
        contactLinks: merged,
        updatedAt: now,
        ...(neonAbout ? { description: neonAbout } : {}),
      };
      await db.collection("listings").updateOne({ id: neonId }, { $set: neonPatch });
      const fresh = await db.collection("listings").findOne({ id: neonId }, { projection: { _id: 0 } });
      if (fresh) {
        const doc = servingDoc(fresh, now);
        const { popularityRank: _r, ...body } = doc;
        await db.collection("listings_serving").updateOne(
          { id: doc.id },
          [{ $replaceWith: { $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }] } }],
          { upsert: true },
        );
      }
      console.log(`enriched ${neonId} (Neon Padel Cairo) with research phone/website/About`);
    }
  }

  // Mozambique: enrich existing OSM Padel Club Maputo (do not duplicate as research-moz).
  if (hasCc("MZ")) {
    const maputoId = "osm-way-1183409068";
    const maputoWebsite = "https://www.padelclub.co.mz/";
    const maputoPhone = "+258 85 358 8341";
    const maputoAbout =
      typeof CURATED_ABOUT[maputoId] === "string" && CURATED_ABOUT[maputoId].trim().length >= 120
        ? CURATED_ABOUT[maputoId].trim()
        : undefined;
    const maputoLinks = [
      { type: "website", label: "padelclub.co.mz", value: maputoWebsite, url: maputoWebsite },
      { type: "phone", label: "Phone", value: maputoPhone },
    ];
    const maputo = await db.collection("listings").findOne({ id: maputoId, lifecycleState: "PUBLISHED" });
    if (maputo) {
      const existingLinks = Array.isArray(maputo.contactLinks) ? maputo.contactLinks : [];
      const seen = new Set(existingLinks.map((l) => `${l.type}|${l.value}`));
      const merged = [...existingLinks];
      for (const link of maputoLinks) {
        const key = `${link.type}|${link.value}`;
        if (!seen.has(key)) {
          merged.push(link);
          seen.add(key);
        }
      }
      const maputoPatch = {
        phone: maputoPhone,
        website: maputo.website || maputoWebsite,
        contactLinks: merged,
        updatedAt: now,
        ...(maputoAbout ? { description: maputoAbout } : {}),
        "schedule.seasonNote": "Daily 06:00–22:00",
      };
      await db.collection("listings").updateOne({ id: maputoId }, { $set: maputoPatch });
      const fresh = await db.collection("listings").findOne({ id: maputoId }, { projection: { _id: 0 } });
      if (fresh) {
        const doc = servingDoc(fresh, now);
        const { popularityRank: _r, ...body } = doc;
        await db.collection("listings_serving").updateOne(
          { id: doc.id },
          [{ $replaceWith: { $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }] } }],
          { upsert: true },
        );
      }
      console.log(`enriched ${maputoId} (Padel Club Maputo) with research website/phone/About`);
    }
  }

  // Namibia: enrich existing OSM Swakopmund Namibia Padel (do not duplicate Windhoek as OSM).
  if (hasCc("NA")) {
    const swakopId = "osm-node-12477757278";
    const swakopWebsite = "https://namibiapadel.com/";
    const swakopPhone = "+264 81 716 9915";
    const swakopEmail = "coastal@namibiapadel.com";
    const swakopAbout =
      typeof CURATED_ABOUT[swakopId] === "string" && CURATED_ABOUT[swakopId].trim().length >= 120
        ? CURATED_ABOUT[swakopId].trim()
        : undefined;
    const swakopLinks = [
      { type: "website", label: "namibiapadel.com", value: swakopWebsite, url: swakopWebsite },
      { type: "phone", label: "Phone", value: swakopPhone },
      { type: "email", label: "Email", value: swakopEmail },
    ];
    const swakop = await db.collection("listings").findOne({ id: swakopId, lifecycleState: "PUBLISHED" });
    if (swakop) {
      const existingLinks = Array.isArray(swakop.contactLinks) ? swakop.contactLinks : [];
      const seen = new Set(existingLinks.map((l) => `${l.type}|${l.value}`));
      const merged = [...existingLinks];
      for (const link of swakopLinks) {
        const key = `${link.type}|${link.value}`;
        if (!seen.has(key)) {
          merged.push(link);
          seen.add(key);
        }
      }
      const swakopPatch = {
        phone: swakopPhone,
        email: swakopEmail,
        website: swakop.website || swakopWebsite,
        contactLinks: merged,
        updatedAt: now,
        ...(swakopAbout ? { description: swakopAbout } : {}),
        "schedule.seasonNote": "Daily 06:00–23:00",
      };
      await db.collection("listings").updateOne({ id: swakopId }, { $set: swakopPatch });
      const fresh = await db.collection("listings").findOne({ id: swakopId }, { projection: { _id: 0 } });
      if (fresh) {
        const doc = servingDoc(fresh, now);
        const { popularityRank: _r, ...body } = doc;
        await db.collection("listings_serving").updateOne(
          { id: doc.id },
          [{ $replaceWith: { $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }] } }],
          { upsert: true },
        );
      }
      console.log(`enriched ${swakopId} (Namibia Padel Swakopmund) with research website/phone/email/About`);
    }
  }

  // South Africa: enrich existing OSM Africa Padel V&A (do not duplicate as research-zaf).
  if (hasCc("ZA")) {
    const vaId = "osm-way-1266919001";
    const vaWebsite = "https://www.africapadel.com/";
    const vaPhone = "+27 81 440 2419";
    const vaAbout =
      typeof CURATED_ABOUT[vaId] === "string" && CURATED_ABOUT[vaId].trim().length >= 120
        ? CURATED_ABOUT[vaId].trim()
        : undefined;
    const vaLinks = [
      { type: "website", label: "africapadel.com", value: vaWebsite, url: vaWebsite },
      { type: "phone", label: "Phone", value: vaPhone },
    ];
    const va = await db.collection("listings").findOne({ id: vaId, lifecycleState: "PUBLISHED" });
    if (va) {
      const existingLinks = Array.isArray(va.contactLinks) ? va.contactLinks : [];
      const seen = new Set(existingLinks.map((l) => `${l.type}|${l.value}`));
      const merged = [...existingLinks];
      for (const link of vaLinks) {
        const key = `${link.type}|${link.value}`;
        if (!seen.has(key)) {
          merged.push(link);
          seen.add(key);
        }
      }
      const vaPatch = {
        phone: vaPhone,
        website: va.website || vaWebsite,
        contactLinks: merged,
        updatedAt: now,
        ...(vaAbout ? { description: vaAbout } : {}),
        "schedule.seasonNote": "Daily 06:00–23:00",
      };
      await db.collection("listings").updateOne({ id: vaId }, { $set: vaPatch });
      const fresh = await db.collection("listings").findOne({ id: vaId }, { projection: { _id: 0 } });
      if (fresh) {
        const doc = servingDoc(fresh, now);
        const { popularityRank: _r, ...body } = doc;
        await db.collection("listings_serving").updateOne(
          { id: doc.id },
          [{ $replaceWith: { $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }] } }],
          { upsert: true },
        );
      }
      console.log(`enriched ${vaId} (Africa Padel V&A) with research website/phone/About`);
    }
  }


  // Tunisia: enrich existing OSM Padel in Mourouj (do not duplicate).
  if (hasCc("TN")) {
    const mouroujId = "osm-node-14065918067";
    const mouroujPhone = "+216 25 444 423";
    const mouroujAbout =
      typeof CURATED_ABOUT[mouroujId] === "string" && CURATED_ABOUT[mouroujId].trim().length >= 120
        ? CURATED_ABOUT[mouroujId].trim()
        : undefined;
    const mouroujLinks = [{ type: "phone", label: "Phone", value: mouroujPhone }];
    const mourouj = await db.collection("listings").findOne({ id: mouroujId, lifecycleState: "PUBLISHED" });
    if (mourouj) {
      const existingLinks = Array.isArray(mourouj.contactLinks) ? mourouj.contactLinks : [];
      const seen = new Set(existingLinks.map((l) => `${l.type}|${l.value}`));
      const merged = [...existingLinks];
      for (const link of mouroujLinks) {
        const key = `${link.type}|${link.value}`;
        if (!seen.has(key)) {
          merged.push(link);
          seen.add(key);
        }
      }
      await db.collection("listings").updateOne(
        { id: mouroujId },
        {
          $set: {
            phone: mouroujPhone,
            contactLinks: merged,
            updatedAt: now,
            ...(mouroujAbout ? { description: mouroujAbout } : {}),
          },
        },
      );
      const fresh = await db.collection("listings").findOne({ id: mouroujId }, { projection: { _id: 0 } });
      if (fresh) {
        const doc = servingDoc(fresh, now);
        const { popularityRank: _r, ...body } = doc;
        await db.collection("listings_serving").updateOne(
          { id: doc.id },
          [{ $replaceWith: { $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }] } }],
          { upsert: true },
        );
      }
      console.log(`enriched ${mouroujId} (Padel in Mourouj) with research phone/About`);
    }
  }

  // Tanzania: enrich existing OSM Padel Sports Africa (no additional research rows this pass).
  if (hasCc("TZ")) {
    const psaId = "osm-node-13937004559";
    const psaWebsite = "https://ps4africa.com/";
    const psaPhone = "+255 740 300 304";
    const psaEmail = "play@ps4africa.com";
    const psaAbout =
      typeof CURATED_ABOUT[psaId] === "string" && CURATED_ABOUT[psaId].trim().length >= 120
        ? CURATED_ABOUT[psaId].trim()
        : undefined;
    const psaLinks = [
      { type: "website", label: "ps4africa.com", value: psaWebsite, url: psaWebsite },
      { type: "phone", label: "Phone", value: psaPhone },
      { type: "email", label: "Email", value: psaEmail },
    ];
    const psa = await db.collection("listings").findOne({ id: psaId, lifecycleState: "PUBLISHED" });
    if (psa) {
      const existingLinks = Array.isArray(psa.contactLinks) ? psa.contactLinks : [];
      const seen = new Set(existingLinks.map((l) => `${l.type}|${l.value}`));
      const merged = [...existingLinks];
      for (const link of psaLinks) {
        const key = `${link.type}|${link.value}`;
        if (!seen.has(key)) {
          merged.push(link);
          seen.add(key);
        }
      }
      await db.collection("listings").updateOne(
        { id: psaId },
        {
          $set: {
            phone: psaPhone,
            email: psaEmail,
            website: psa.website || psaWebsite,
            contactLinks: merged,
            updatedAt: now,
            ...(psaAbout ? { description: psaAbout } : {}),
            "schedule.seasonNote": "Daily 06:00–23:00",
          },
        },
      );
      const fresh = await db.collection("listings").findOne({ id: psaId }, { projection: { _id: 0 } });
      if (fresh) {
        const doc = servingDoc(fresh, now);
        const { popularityRank: _r, ...body } = doc;
        await db.collection("listings_serving").updateOne(
          { id: doc.id },
          [{ $replaceWith: { $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }] } }],
          { upsert: true },
        );
      }
      console.log(`enriched ${psaId} (Padel Sports Africa Dar) with research website/phone/email/About`);
    }
  }

  // Zimbabwe: enrich existing OSM Old Georgians padel (do not duplicate).
  if (hasCc("ZW")) {
    const ogId = "osm-way-443984820";
    const ogAbout =
      typeof CURATED_ABOUT[ogId] === "string" && CURATED_ABOUT[ogId].trim().length >= 120
        ? CURATED_ABOUT[ogId].trim()
        : undefined;
    const og = await db.collection("listings").findOne({ id: ogId, lifecycleState: "PUBLISHED" });
    if (og && ogAbout) {
      await db.collection("listings").updateOne({ id: ogId }, { $set: { description: ogAbout, updatedAt: now } });
      const fresh = await db.collection("listings").findOne({ id: ogId }, { projection: { _id: 0 } });
      if (fresh) {
        const doc = servingDoc(fresh, now);
        const { popularityRank: _r, ...body } = doc;
        await db.collection("listings_serving").updateOne(
          { id: doc.id },
          [{ $replaceWith: { $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }] } }],
          { upsert: true },
        );
      }
      console.log(`enriched ${ogId} (Old Georgians) with curated About`);
    }
  }

  // Benin: enrich existing OSM Cotonou Padel Club (no additional research rows this pass).
  if (hasCc("BJ")) {
    const cpcId = "osm-node-13440135409";
    const cpcWebsite = "https://cotonoupadelclub.carrd.co/";
    const cpcBooking = "https://cotonou-padel.doinsport.club/home";
    const cpcPhone = "+229 46 09 95 72";
    const cpcAbout =
      typeof CURATED_ABOUT[cpcId] === "string" && CURATED_ABOUT[cpcId].trim().length >= 120
        ? CURATED_ABOUT[cpcId].trim()
        : undefined;
    const cpcLinks = [
      { type: "website", label: "cotonoupadelclub.carrd.co", value: cpcWebsite, url: cpcWebsite },
      { type: "website", label: "Doinsport booking", value: cpcBooking, url: cpcBooking },
      { type: "phone", label: "Phone", value: cpcPhone },
    ];
    const cpc = await db.collection("listings").findOne({ id: cpcId, lifecycleState: "PUBLISHED" });
    if (cpc) {
      const existingLinks = Array.isArray(cpc.contactLinks) ? cpc.contactLinks : [];
      const seen = new Set(existingLinks.map((l) => `${l.type}|${l.value}`));
      const merged = [...existingLinks];
      for (const link of cpcLinks) {
        const key = `${link.type}|${link.value}`;
        if (!seen.has(key)) {
          merged.push(link);
          seen.add(key);
        }
      }
      await db.collection("listings").updateOne(
        { id: cpcId },
        {
          $set: {
            phone: cpcPhone,
            website: cpc.website || cpcWebsite,
            contactLinks: merged,
            updatedAt: now,
            ...(cpcAbout ? { description: cpcAbout } : {}),
            "schedule.seasonNote": "Daily 08:00–00:00",
          },
        },
      );
      const fresh = await db.collection("listings").findOne({ id: cpcId }, { projection: { _id: 0 } });
      if (fresh) {
        const doc = servingDoc(fresh, now);
        const { popularityRank: _r, ...body } = doc;
        await db.collection("listings_serving").updateOne(
          { id: doc.id },
          [{ $replaceWith: { $mergeObjects: [{ $literal: body }, { popularityRank: { $ifNull: ["$popularityRank", 0] } }] } }],
          { upsert: true },
        );
      }
      console.log(`enriched ${cpcId} (Cotonou Padel Club) with research website/phone/About`);
    }
  }

  const published = await db.collection("listings").countDocuments({ lifecycleState: "PUBLISHED" });
  const byCc = await db
    .collection("listings")
    .aggregate([
      { $match: { lifecycleState: "PUBLISHED", id: { $in: listings.map((l) => l.id) } } },
      { $group: { _id: "$venue.address.countryCode", n: { $sum: 1 } } },
    ])
    .toArray();
  console.log(`done: ${listings.length} research listings; PUBLISHED total ${published}; seeded-by-cc ${JSON.stringify(Object.fromEntries(byCc.map((r) => [r._id, r.n])))}`);
  await client.close();
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
