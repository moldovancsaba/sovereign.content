#!/usr/bin/env node
/**
 * Standalone deliverer for scripts/data/osm-padel-africa-10.json — no Next/GDS import graph.
 * Writes PUBLISHED listings + listings_serving docs into MONGODB_DB (default padel-africa).
 *
 * Fills every Listing leaf that OSM/Nominatim evidence supports (contact, address/territory,
 * geo, venueModel, schedule slots from opening_hours, price signal from fee, media from image,
 * locationGroup keys, contactLinks, etc.). Never invents prices, ages, or programs.
 *
 *   MONGODB_URI=... node scripts/seed-osm-padel-africa-10.standalone.mjs [--dry-run]
 *   MONGODB_URI=... node scripts/seed-osm-padel-africa-10.standalone.mjs \
 *     --fixture=scripts/data/osm-padel-africa-next.json [--dry-run]
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE = resolve(__dirname, "data/osm-padel-africa-10.json");
const SERVING_DERIVATION_VERSION = 3;

/** Curated Abouts live in Mongo (`listing_curated_abouts`), not in the git tree. */
let CURATED_ABOUT = {};

function fixturePathFromArgv(argv) {
  const flag = argv.find((a) => a.startsWith("--fixture="));
  if (flag) return resolve(flag.slice("--fixture=".length));
  const idx = argv.indexOf("--fixture");
  if (idx >= 0 && argv[idx + 1]) return resolve(argv[idx + 1]);
  return process.env.OSM_FIXTURE ? resolve(process.env.OSM_FIXTURE) : DEFAULT_FIXTURE;
}

const TZ_BY_CC = {
  ZA: "Africa/Johannesburg",
  EG: "Africa/Cairo",
  KE: "Africa/Nairobi",
  MA: "Africa/Casablanca",
  TN: "Africa/Tunis",
  NA: "Africa/Windhoek",
  CI: "Africa/Abidjan",
  MZ: "Africa/Maputo",
  AO: "Africa/Luanda",
  TZ: "Africa/Dar_es_Salaam",
  BJ: "Africa/Porto-Novo",
  CM: "Africa/Douala",
  MG: "Indian/Antananarivo",
  GM: "Africa/Banjul",
  ZW: "Africa/Harare",
  NG: "Africa/Lagos",
  GH: "Africa/Accra",
  SN: "Africa/Dakar",
  RW: "Africa/Kigali",
  UG: "Africa/Kampala",
  ET: "Africa/Addis_Ababa",
  BW: "Africa/Gaborone",
  ZM: "Africa/Lusaka",
  DZ: "Africa/Algiers",
  LY: "Africa/Tripoli",
  GQ: "Africa/Malabo",
};

const COUNTRY_BOUNDS = {
  AO: { minLat: -18.05, maxLat: -4.37, minLng: 11.66, maxLng: 24.09 },
  BJ: { minLat: 6.2, maxLat: 12.45, minLng: 0.75, maxLng: 3.86 },
  BW: { minLat: -26.91, maxLat: -17.78, minLng: 19.99, maxLng: 29.37 },
  CI: { minLat: 4.34, maxLat: 10.74, minLng: -8.6, maxLng: -2.49 },
  CM: { minLat: 1.65, maxLat: 13.08, minLng: 8.49, maxLng: 16.19 },
  DZ: { minLat: 18.96, maxLat: 37.09, minLng: -8.67, maxLng: 11.99 },
  EG: { minLat: 22.0, maxLat: 31.67, minLng: 24.7, maxLng: 36.9 },
  ET: { minLat: 3.4, maxLat: 14.89, minLng: 32.99, maxLng: 47.98 },
  GH: { minLat: 4.71, maxLat: 11.17, minLng: -3.26, maxLng: 1.2 },
  GM: { minLat: 13.05, maxLat: 13.83, minLng: -16.85, maxLng: -13.8 },
  GQ: { minLat: -1.5, maxLat: 3.8, minLng: 5.5, maxLng: 11.5 },
  KE: { minLat: -4.68, maxLat: 5.51, minLng: 33.91, maxLng: 41.9 },
  LY: { minLat: 19.5, maxLat: 33.2, minLng: 9.3, maxLng: 25.2 },
  MA: { minLat: 27.66, maxLat: 35.93, minLng: -13.17, maxLng: -1.0 },
  MG: { minLat: -25.6, maxLat: -11.9, minLng: 43.1, maxLng: 50.5 },
  MZ: { minLat: -26.87, maxLat: -10.47, minLng: 30.21, maxLng: 40.84 },
  NA: { minLat: -28.97, maxLat: -16.96, minLng: 11.72, maxLng: 25.26 },
  NG: { minLat: 4.27, maxLat: 13.89, minLng: 2.67, maxLng: 14.68 },
  RW: { minLat: -2.84, maxLat: -1.05, minLng: 28.86, maxLng: 30.9 },
  SN: { minLat: 12.31, maxLat: 16.69, minLng: -17.53, maxLng: -11.36 },
  TN: { minLat: 30.24, maxLat: 37.54, minLng: 7.52, maxLng: 11.6 },
  TZ: { minLat: -11.75, maxLat: -0.99, minLng: 29.34, maxLng: 40.44 },
  UG: { minLat: -1.48, maxLat: 4.22, minLng: 29.57, maxLng: 35.04 },
  ZA: { minLat: -34.84, maxLat: -22.13, minLng: 16.45, maxLng: 32.89 },
  ZM: { minLat: -18.1, maxLat: -8.2, minLng: 21.9, maxLng: 33.8 },
  ZW: { minLat: -22.5, maxLat: -15.5, minLng: 25.1, maxLng: 33.1 },
};

const OSM_DAY = { Mo: "mon", Tu: "tue", We: "wed", Th: "thu", Fr: "fri", Sa: "sat", Su: "sun" };
const OSM_DAY_ORDER = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function latLon(e) {
  if (typeof e.lat === "number" && typeof e.lon === "number") return { lat: e.lat, lng: e.lon };
  if (e.center) return { lat: e.center.lat, lng: e.center.lon };
  throw new Error(`no coordinates for osm ${e.type}/${e.id}`);
}

function inBounds(cc, lat, lng) {
  const b = COUNTRY_BOUNDS[cc];
  if (!b) return true;
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}

function osmUrl(e) {
  const kind = ["node", "way", "relation"].includes(e.type) ? e.type : "node";
  return `https://www.openstreetmap.org/${kind}/${e.id}`;
}

/** Prefer a leading Latin segment when Nominatim/OSM mash Latin + Arabic/Tifinagh. */
function preferredLabel(raw) {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  const m = s.match(/^[\p{Script=Latin}0-9][\p{Script=Latin}0-9 .,'’\-/]*/u);
  if (m && m[0].trim().length >= 2) return m[0].trim().replace(/[,\s./-]+$/u, "");
  return s;
}

function firstDefined(...vals) {
  for (const v of vals) {
    const s = typeof v === "string" ? v.trim() : v;
    if (s) return String(s).trim();
  }
  return undefined;
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

function expandOsmDays(spec) {
  const parts = spec.split(",").map((p) => p.trim()).filter(Boolean);
  const days = new Set();
  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-");
      const i0 = OSM_DAY_ORDER.indexOf(a);
      const i1 = OSM_DAY_ORDER.indexOf(b);
      if (i0 < 0 || i1 < 0) continue;
      for (let i = i0; i <= i1; i++) days.add(OSM_DAY[OSM_DAY_ORDER[i]]);
    } else if (OSM_DAY[part]) {
      days.add(OSM_DAY[part]);
    }
  }
  return [...days];
}

/**
 * Best-effort OSM opening_hours → recurring slots.
 * Handles "Mo-Su 06:00-22:00", "Mo-Fr 08:00-20:00; Sa 09:00-14:00", etc.
 * Returns [] when the string is too complex / unstructured.
 */
function openingHoursToRecurring(hours) {
  if (!hours) return [];
  const slots = [];
  for (const rule of hours.split(";").map((r) => r.trim()).filter(Boolean)) {
    const m = rule.match(/^([A-Za-z,-]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!m) continue;
    const days = expandOsmDays(m[1]);
    const startTime = m[2].padStart(5, "0");
    const endTime = m[3].padStart(5, "0");
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) continue;
    for (const weekday of days) {
      slots.push({ weekday, startTime, endTime });
    }
  }
  return slots;
}

function venueModelFromTags(tags) {
  if (tags.indoor === "no") return "outdoors";
  if (tags.indoor === "yes") return "own_premises";
  if (tags.covered === "yes" || tags.building || tags.leisure === "sports_centre") return "own_premises";
  if (tags.leisure === "pitch") return "outdoors";
  // A mapped club with a street address is premises a visitor can walk into.
  return "own_premises";
}

function priceFromTags(tags) {
  if (tags.fee === "no") return { model: "free", note: "No fee (OSM fee=no)." };
  if (tags.fee === "yes") {
    // Paid without an amount is invalid for PriceSchema — keep model unknown + evidence note.
    return { model: "unknown", note: "Fee charged; amount not published on OpenStreetMap." };
  }
  return { model: "unknown" };
}

function contactLinksFrom({ website, phone, email, tags }) {
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
    if (host.includes("instagram.com")) {
      push({ type: "instagram", label: "Instagram", value: website, url: website });
    } else if (host.includes("facebook.com") || host.includes("fb.com")) {
      push({ type: "facebook", label: "Facebook", value: website, url: website });
    } else {
      push({ type: "website", label: host || "Website", value: website, url: website });
    }
  }

  const ig = normalizeHttps(tags["contact:instagram"] || tags.instagram);
  if (ig) push({ type: "instagram", label: "Instagram", value: ig, url: ig });
  const fb = normalizeHttps(tags["contact:facebook"] || tags.facebook);
  if (fb) push({ type: "facebook", label: "Facebook", value: fb, url: fb });

  if (phone) push({ type: "phone", label: "Phone", value: phone });
  if (email) push({ type: "email", label: "Email", value: email });

  return links.length ? links : undefined;
}

function mediaFromTags(tags, name) {
  const image = normalizeHttps(tags.image || tags["image:0"] || tags.wikimedia_commons);
  // wikimedia_commons is often a bare filename — only accept real http(s) URLs.
  if (!image || !/^https?:\/\//i.test(image)) return [];
  return [{ url: image, kind: "image", alt: name, primary: true }];
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
  const chain = ["continent", "country", "region", "subregion", "settlement", "district", "quarter"]
    .map((level) => address.territory?.[level])
    .filter((v) => typeof v === "string" && v.trim());
  const parts = [...chain, address.locality, address.line1]
    .map((v) => (v ?? "").trim().toLowerCase())
    .filter(Boolean);
  if (!parts.length) return { locationGroupId };
  return {
    locationGroupId,
    locationKey: `lk_${createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16)}`,
  };
}

/** Visitor-facing fallback when no curated About exists — never embeds URLs or phone numbers
 *  (`validatePublicDescription` rejects inline URLs; contact belongs in contact fields). */
function aboutDescription({ name, street, locality, countryCode, region, tags, padelPitchNote }) {
  const place = [street, locality, region, countryCode].filter(Boolean).join(", ");
  const sentences = [];

  const isSportsClub = tags.leisure === "sports_centre" && !/padel/i.test(name) && padelPitchNote;
  let lead = isSportsClub
    ? `${name} is a sports club with padel courts in ${locality}, ${countryCode}`
    : `${name} is a padel club in ${locality}, ${countryCode}`;
  if (street) {
    lead = isSportsClub
      ? `${name} is a sports club with padel courts on ${street} in ${locality}, ${countryCode}`
      : `${name} is a padel club on ${street} in ${locality}, ${countryCode}`;
  }
  sentences.push(`${lead}.`);

  if (tags.indoor === "no") sentences.push("Outdoor courts.");
  else if (tags.indoor === "yes") sentences.push("Indoor courts.");
  else if (tags.covered === "yes") sentences.push("Covered courts.");
  else if (tags.building === "sports_hall" || tags.building === "yes") sentences.push("Indoor venue.");

  if (tags.lit === "yes") sentences.push("Floodlit for evening play.");
  if (tags.fee === "yes") sentences.push("Paid access.");
  else if (tags.fee === "no") sentences.push("Free to play.");
  if (tags.access === "customers") sentences.push("Customers only.");

  let text = sentences.join(" ").replace(/\s+/g, " ").trim();
  if (text.length < 40 && place) {
    text = `${name} is a padel club at ${place}.`;
  }
  return text;
}

function resolveAbout(id, fallbackArgs) {
  const curated = CURATED_ABOUT[id];
  if (typeof curated === "string" && curated.trim().length >= 40) {
    const text = curated.trim();
    if (/\b(?:https?:\/\/|www\.)\S+/i.test(text)) {
      throw new Error(`curated About for ${id} contains an inline URL`);
    }
    return text;
  }
  return aboutDescription(fallbackArgs);
}

function buildTerritory(cc, locality, region, nom) {
  const territory = {
    continent: "Africa",
    country: cc,
    settlement: preferredLabel(locality) || locality,
  };
  if (region) territory.region = preferredLabel(region) || region;
  // padel-africa marks district/quarter unused, but storing them keeps Nominatim grain for later.
  const district = preferredLabel(firstDefined(nom.city_district, nom.suburb, nom.county));
  const quarter = preferredLabel(firstDefined(nom.neighbourhood, nom.quarter, nom.city_block));
  if (district && district.toLowerCase() !== territory.settlement.toLowerCase()) {
    territory.district = district;
  }
  if (quarter && quarter.toLowerCase() !== (territory.district || "").toLowerCase()) {
    territory.quarter = quarter;
  }
  return territory;
}

function buildListing(cc, e, now) {
  const tags = e.tags || {};
  const nom = e._nominatim?.address || {};
  const name = String(tags.name || "").trim();
  if (!name) throw new Error(`${cc}: missing name`);
  const { lat, lng } = latLon(e);
  if (!inBounds(cc, lat, lng)) throw new Error(`${cc}: (${lat},${lng}) outside bounds`);

  const street = firstDefined(tags["addr:street"], tags["addr:full"], nom.road) || "";
  const locality = firstDefined(tags["addr:city"], nom.city, nom.town, nom.village);
  if (!locality) throw new Error(`${cc}: missing locality for ${name}`);
  const line1 = street || `Near ${locality}`;
  const line2 = preferredLabel(firstDefined(nom.neighbourhood, nom.suburb));
  const region = preferredLabel(firstDefined(tags["addr:state"], nom.state, nom.region));
  const postalCode = firstDefined(tags["addr:postcode"], tags["addr:postal_code"], nom.postcode);
  const website = normalizeHttps(tags.website || tags["contact:website"]);
  const phone = firstDefined(tags.phone, tags["contact:phone"], tags["contact:mobile"]);
  const email = firstDefined(tags.email, tags["contact:email"]);
  const hours = firstDefined(tags.opening_hours, tags["opening_hours:covid19"]) || "";

  const id = `osm-${e.type}-${e.id}`;
  const description = resolveAbout(id, {
    name,
    street,
    locality,
    countryCode: cc,
    region,
    tags,
    padelPitchNote: e._padel_pitch_note,
  });
  if (description.length < 40) throw new Error(`${cc}: description too short: ${description}`);

  const recurring = openingHoursToRecurring(hours);
  const schedule = {
    timezone: TZ_BY_CC[cc] || "Africa/Johannesburg",
    recurring,
    sessions: [],
    seasonNote: hours || "Hours not listed yet.",
  };

  const address = {
    line1,
    ...(line2 && line2.toLowerCase() !== locality.toLowerCase() ? { line2 } : {}),
    locality,
    ...(region ? { region } : {}),
    ...(postalCode ? { postalCode } : {}),
    countryCode: cc,
    territory: buildTerritory(cc, locality, region, nom),
  };

  const contactLinks = contactLinksFrom({ website, phone, email, tags });
  const media = mediaFromTags(tags, name);
  const group = locationGroupKeys({ name, website, address });

  const listing = {
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
    venueModel: venueModelFromTags(tags),
    venue: {
      name,
      address,
      geo: {
        position: { lat, lng },
        precision: street ? "street" : "locality",
        source: e._source?.includes("nominatim") ? "nominatim" : "civic",
        geocodedAt: now,
      },
    },
    schedule,
    price: priceFromTags(tags),
    media,
    lifecycleState: "PUBLISHED",
    source: { sourceName: "openstreetmap", sourceUrl: osmUrl(e), ingestedAt: now },
    createdAt: now,
    updatedAt: now,
  };
  return listing;
}

/** Count non-empty leaf paths for dry-run reporting. */
function countLeaves(value, path = "") {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    return value.flatMap((item, i) => countLeaves(item, `${path}[${i}]`));
  }
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => countLeaves(v, path ? `${path}.${k}` : k));
  }
  return [path];
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
      listing.venue?.address?.postalCode,
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
  const raw = JSON.parse(readFileSync(fixturePath, "utf8"));
  const countries = Object.keys(raw);
  if (countries.length < 1) throw new Error(`fixture empty: ${fixturePath}`);
  if (new Set(countries).size !== countries.length) throw new Error("fixture countries must be unique");
  console.log(`fixture ${fixturePath} (${countries.length} countries)`);
  const now = new Date().toISOString();

  if (!dryRun) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });
    await client.connect();
    const db = client.db((process.env.MONGODB_DB || "padel-africa").trim());
    const rows = await db.collection("listing_curated_abouts").find({}).project({ listingId: 1, description: 1 }).toArray();
    CURATED_ABOUT = Object.fromEntries(
      rows.filter((r) => typeof r.listingId === "string" && typeof r.description === "string").map((r) => [r.listingId, r.description]),
    );
    await client.close();
  }

  const listings = countries.map((cc) => buildListing(cc, raw[cc], now));

  let leafSum = 0;
  for (const l of listings) {
    const leaves = countLeaves(l);
    leafSum += leaves.length;
    console.log(
      `ok  ${l.venue.address.countryCode}  ${l.id}  ${l.name}  @ ${l.venue.address.locality}  leaves=${leaves.length}  venueModel=${l.venueModel}  slots=${l.schedule.recurring.length}  links=${(l.contactLinks || []).length}  media=${l.media.length}`,
    );
  }
  console.log(`avg filled leaves ≈ ${(leafSum / listings.length).toFixed(1)} across ${listings.length} listings`);

  if (dryRun) {
    console.log(`(--dry-run) would upsert ${listings.length} listings`);
    console.log("sample keys:", Object.keys(listings[0]).sort().join(", "));
    console.log(JSON.stringify(listings[0], null, 2));
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
  const published = await db.collection("listings").countDocuments({ lifecycleState: "PUBLISHED" });
  console.log(`done: ${listings.length} OSM listings; PUBLISHED total ${published}`);
  await client.close();
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
