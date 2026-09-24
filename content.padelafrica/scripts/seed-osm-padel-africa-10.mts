/**
 * Deliver 10 evidenced OSM padel listings into padel-africa — one per African country.
 *
 * Evidence only: name/coords/address/website/phone/email/opening_hours/fee/indoor/image
 * and Nominatim address grain from OpenStreetMap. No invented prices, ages, or programs.
 *
 *   VERTICAL=padel-africa MONGODB_URI=... MONGODB_DB=padel-africa \
 *     npx tsx scripts/seed-osm-padel-africa-10.mts [--dry-run]
 *
 * Fixture: scripts/data/osm-padel-africa-10.json
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";
import { parseListing, type ContactLink, type Listing, type MediaAsset } from "../src/lib/entity/listing";
import { runPublishGate, isPublishable } from "../src/lib/publishGate/gate";
import { resolveVertical } from "../src/lib/vertical/resolve";
import { upsertListing } from "../src/lib/listings";
import { deriveServingDoc } from "../src/lib/servingModel/deriveServingDoc";
import { writeServingDoc } from "../src/lib/servingModel/writeServingDoc";
import { resolveTerritory } from "../src/lib/geo/territoryResolve";
import { packTerritoryScope } from "../src/lib/vertical/pack";
import { acceptCoordinate } from "../src/lib/geo/acceptanceBounds";
import type { RecurringSlot, Weekday } from "../src/lib/schedule/schedule";
import type { Price } from "../src/lib/price/price";
import type { Address } from "../src/lib/geo/geo";

const FIXTURE = resolve("scripts/data/osm-padel-africa-10.json");
const ABOUT_FIXTURE = resolve("scripts/data/osm-padel-africa-about.json");
const CURATED_ABOUT = JSON.parse(readFileSync(ABOUT_FIXTURE, "utf8")) as Record<string, string>;

const TZ_BY_CC: Record<string, string> = {
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
};

const OSM_DAY: Record<string, Weekday> = {
  Mo: "mon",
  Tu: "tue",
  We: "wed",
  Th: "thu",
  Fr: "fri",
  Sa: "sat",
  Su: "sun",
};
const OSM_DAY_ORDER = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

type OsmPick = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
  _nominatim?: { display_name?: string; address?: Record<string, string> };
  _source?: string;
};

function latLon(e: OsmPick): { lat: number; lng: number } {
  if (typeof e.lat === "number" && typeof e.lon === "number") return { lat: e.lat, lng: e.lon };
  if (e.center) return { lat: e.center.lat, lng: e.center.lon };
  throw new Error(`no coordinates for osm ${e.type}/${e.id}`);
}

function osmUrl(e: OsmPick): string {
  const kind = e.type === "node" || e.type === "way" || e.type === "relation" ? e.type : "node";
  return `https://www.openstreetmap.org/${kind}/${e.id}`;
}

function preferredLabel(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  const m = s.match(/^[\p{Script=Latin}0-9][\p{Script=Latin}0-9 .,'’\-/]*/u);
  if (m && m[0].trim().length >= 2) return m[0].trim().replace(/[,\s./-]+$/u, "");
  return s;
}

function firstDefined(...vals: Array<string | undefined>): string | undefined {
  for (const v of vals) {
    const s = v?.trim();
    if (s) return s;
  }
  return undefined;
}

function normalizeHttps(raw: string | undefined): string | undefined {
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

function expandOsmDays(spec: string): Weekday[] {
  const days = new Set<Weekday>();
  for (const part of spec.split(",").map((p) => p.trim()).filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-");
      const i0 = OSM_DAY_ORDER.indexOf(a as (typeof OSM_DAY_ORDER)[number]);
      const i1 = OSM_DAY_ORDER.indexOf(b as (typeof OSM_DAY_ORDER)[number]);
      if (i0 < 0 || i1 < 0) continue;
      for (let i = i0; i <= i1; i++) days.add(OSM_DAY[OSM_DAY_ORDER[i]]!);
    } else if (OSM_DAY[part]) {
      days.add(OSM_DAY[part]!);
    }
  }
  return [...days];
}

function openingHoursToRecurring(hours: string): RecurringSlot[] {
  if (!hours) return [];
  const slots: RecurringSlot[] = [];
  for (const rule of hours.split(";").map((r) => r.trim()).filter(Boolean)) {
    const m = rule.match(/^([A-Za-z,-]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!m) continue;
    const startTime = m[2]!.padStart(5, "0");
    const endTime = m[3]!.padStart(5, "0");
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) continue;
    for (const weekday of expandOsmDays(m[1]!)) {
      slots.push({ weekday, startTime, endTime });
    }
  }
  return slots;
}

function venueModelFromTags(tags: Record<string, string>): Listing["venueModel"] {
  if (tags.indoor === "no") return "outdoors";
  if (tags.indoor === "yes") return "own_premises";
  if (tags.covered === "yes" || tags.building || tags.leisure === "sports_centre") return "own_premises";
  if (tags.leisure === "pitch") return "outdoors";
  return "own_premises";
}

function priceFromTags(tags: Record<string, string>): Price {
  if (tags.fee === "no") return { model: "free", note: "No fee (OSM fee=no)." };
  if (tags.fee === "yes") {
    return { model: "unknown", note: "Fee charged; amount not published on OpenStreetMap." };
  }
  return { model: "unknown" };
}

function contactLinksFrom(input: {
  website?: string;
  phone?: string;
  email?: string;
  tags: Record<string, string>;
}): ContactLink[] | undefined {
  const links: ContactLink[] = [];
  const seen = new Set<string>();
  const push = (link: ContactLink) => {
    const key = `${link.type}|${link.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push(link);
  };

  if (input.website) {
    let host = "";
    try {
      host = new URL(input.website).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      /* ignore */
    }
    if (host.includes("instagram.com")) {
      push({ type: "instagram", label: "Instagram", value: input.website, url: input.website });
    } else if (host.includes("facebook.com") || host.includes("fb.com")) {
      push({ type: "facebook", label: "Facebook", value: input.website, url: input.website });
    } else {
      push({ type: "website", label: host || "Website", value: input.website, url: input.website });
    }
  }

  const ig = normalizeHttps(input.tags["contact:instagram"] || input.tags.instagram);
  if (ig) push({ type: "instagram", label: "Instagram", value: ig, url: ig });
  const fb = normalizeHttps(input.tags["contact:facebook"] || input.tags.facebook);
  if (fb) push({ type: "facebook", label: "Facebook", value: fb, url: fb });
  if (input.phone) push({ type: "phone", label: "Phone", value: input.phone });
  if (input.email) push({ type: "email", label: "Email", value: input.email });

  return links.length ? links : undefined;
}

function mediaFromTags(tags: Record<string, string>, name: string): MediaAsset[] {
  const image = normalizeHttps(tags.image || tags["image:0"]);
  if (!image || !/^https?:\/\//i.test(image)) return [];
  return [{ url: image, kind: "image", alt: name, primary: true }];
}

function locationGroupKeys(input: {
  name: string;
  website?: string;
  address: Address;
}): { locationGroupId?: string; locationKey?: string } {
  let host = "";
  if (input.website) {
    try {
      host = new URL(input.website).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      host = "";
    }
  }
  const identity =
    host ||
    input.name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(" ")
      .filter(Boolean)
      .join(" ")
      .trim();
  if (!identity) return {};
  const locationGroupId = `lg_${createHash("sha1").update(identity).digest("hex").slice(0, 20)}`;
  const chain = (["continent", "country", "region", "subregion", "settlement", "district", "quarter"] as const)
    .map((level) => input.address.territory?.[level])
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");
  const parts = [...chain, input.address.locality, input.address.line1]
    .map((v) => (v ?? "").trim().toLowerCase())
    .filter(Boolean);
  if (!parts.length) return { locationGroupId };
  return {
    locationGroupId,
    locationKey: `lk_${createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16)}`,
  };
}

/** Fallback only — curated About in osm-padel-africa-about.json is preferred. Never embed URLs. */
function aboutDescription(input: {
  name: string;
  street: string;
  locality: string;
  countryCode: string;
  region?: string;
  tags: Record<string, string>;
}): string {
  const { name, street, locality, countryCode, region, tags } = input;
  const place = [street, locality, region, countryCode].filter(Boolean).join(", ");
  const sentences: string[] = [];

  let lead = `${name} is a padel club in ${locality}, ${countryCode}`;
  if (street) lead = `${name} is a padel club on ${street} in ${locality}, ${countryCode}`;
  sentences.push(`${lead}.`);

  if (tags.indoor === "no") sentences.push("Outdoor courts.");
  else if (tags.indoor === "yes") sentences.push("Indoor courts.");
  else if (tags.covered === "yes") sentences.push("Covered courts.");
  else if (tags.building === "sports_hall") sentences.push("Indoor sports hall.");

  if (tags.lit === "yes") sentences.push("Floodlit for evening play.");
  if (tags.fee === "yes") sentences.push("Paid access.");
  else if (tags.fee === "no") sentences.push("Free to play.");
  if (tags.access === "customers") sentences.push("Customers only.");

  let text = sentences.join(" ").replace(/\s+/g, " ").trim();
  if (text.length < 40 && place) text = `${name} is a padel club at ${place}.`;
  return text;
}

function resolveAbout(id: string, fallbackArgs: Parameters<typeof aboutDescription>[0]): string {
  const curated = CURATED_ABOUT[id]?.trim();
  if (curated && curated.length >= 40) {
    if (/\b(?:https?:\/\/|www\.)\S+/i.test(curated)) {
      throw new Error(`curated About for ${id} contains an inline URL`);
    }
    return curated;
  }
  return aboutDescription(fallbackArgs);
}

function buildTerritory(
  cc: string,
  locality: string,
  region: string | undefined,
  nom: Record<string, string>,
): Address["territory"] {
  const territory: NonNullable<Address["territory"]> = {
    continent: "Africa",
    country: cc,
    settlement: preferredLabel(locality) || locality,
  };
  if (region) territory.region = preferredLabel(region) || region;
  const district = preferredLabel(firstDefined(nom.city_district, nom.suburb, nom.county));
  const quarter = preferredLabel(firstDefined(nom.neighbourhood, nom.quarter, nom.city_block));
  if (district && district.toLowerCase() !== territory.settlement!.toLowerCase()) {
    territory.district = district;
  }
  if (quarter && quarter.toLowerCase() !== (territory.district || "").toLowerCase()) {
    territory.quarter = quarter;
  }
  return territory;
}

function buildListing(cc: string, e: OsmPick, now: string): Listing {
  const tags = e.tags;
  const nom = e._nominatim?.address || {};
  const name = (tags.name || "").trim();
  if (!name) throw new Error(`${cc}: missing name`);
  const { lat, lng } = latLon(e);
  const accepted = acceptCoordinate({ lat, lng }, cc);
  if (!accepted.accepted) {
    throw new Error(`${cc}: coordinate (${lat},${lng}) rejected — ${accepted.reason}`);
  }

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
  const hours = firstDefined(tags.opening_hours) || "";
  const id = `osm-${e.type}-${e.id}`;

  const description = resolveAbout(id, {
    name,
    street,
    locality,
    countryCode: cc,
    region,
    tags,
  });
  if (description.length < 40) throw new Error(`${cc}: description too short`);

  const address: Address = {
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
  const recurring = openingHoursToRecurring(hours);

  return parseListing({
    id,
    name,
    description,
    activityTypes: ["padel-club"],
    topActivityTypes: ["padel-club"],
    badges: [],
    claimStatus: "unclaimed",
    website,
    phone,
    email,
    contactLinks,
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
    schedule: {
      timezone: TZ_BY_CC[cc] ?? "Africa/Johannesburg",
      recurring,
      sessions: [],
      seasonNote: hours || "Hours not listed yet.",
    },
    price: priceFromTags(tags),
    media,
    lifecycleState: "PUBLISHED",
    source: {
      sourceName: "openstreetmap",
      sourceUrl: osmUrl(e),
      ingestedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri && !dryRun) throw new Error("MONGODB_URI required (or pass --dry-run)");
  const vertical = process.env.VERTICAL?.trim() || "padel-africa";
  if (vertical !== "padel-africa") throw new Error("this seeder is for VERTICAL=padel-africa only");

  const raw = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, OsmPick>;
  const countries = Object.keys(raw);
  if (countries.length !== 10) throw new Error(`fixture must have exactly 10 countries, got ${countries.length}`);
  if (new Set(countries).size !== 10) throw new Error("fixture countries must be unique");

  const { pack, safety } = resolveVertical("padel-africa");
  const territoryScope = packTerritoryScope(pack);
  const now = new Date().toISOString();
  const listings: Listing[] = countries.map((cc) => buildListing(cc, raw[cc]!, now));

  for (const listing of listings) {
    const verdicts = runPublishGate(
      listing,
      { existing: listings.filter((x) => x.id !== listing.id), territoryScope },
      safety,
    );
    if (!isPublishable(verdicts)) {
      console.error(`${listing.id} FAILED gate:`, verdicts.filter((v) => v.status === "blocker"));
      process.exit(1);
    }
    console.log(`gate OK  ${listing.venue?.address.countryCode}  ${listing.id}  ${listing.name}`);
  }

  if (dryRun) {
    console.log(`(--dry-run) ${listings.length} listings would be written`);
    process.exit(0);
  }

  const client = await MongoClient.connect(uri!);
  const db = client.db(process.env.MONGODB_DB?.trim() || "padel-africa");
  const territory = resolveTerritory(pack.territory, null);

  for (const listing of listings) {
    await upsertListing(db, listing, pack);
    const serving = deriveServingDoc(listing, pack, territory, now);
    await writeServingDoc(db, serving);
    console.log(`wrote   ${listing.venue?.address.countryCode}  ${listing.id}`);
  }

  const published = await db.collection("listings").countDocuments({ lifecycleState: "PUBLISHED" });
  console.log(`done: ${listings.length} OSM listings upserted; PUBLISHED total now ${published}`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
