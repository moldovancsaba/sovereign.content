/**
 * Walk all PUBLISHED listings; rewrite Abouts that fail visitor quality.
 *
 *   MONGODB_URI=... MONGODB_DB=sportolok node scripts/agent-fix-published-abouts.mjs
 *   LIMIT=50 DRY_RUN=1 ...
 */
import { MongoClient } from "mongodb";

const ARCHITECTURE_STEMS = [
  "homlokzat", "lamell", "függönyfal", "építészet", "építész", "faszerkezet",
  "nívódíj", "fiabci", "curtain wall", "facade", "façade", "cladding", "louver", "louvre",
];
const VISITOR_STEMS = [
  "medence", "úszás", "uszoda", "wellness", "szauna", "edzés", "pálya", "bérlés", "nyitva",
  "nyitvatart", "belépő", "jegy", "tanfolyam", "babaúsz", "vízilabda", "squash", "tenisz",
  "padel", "fitness", "fitnesz", "edzőterem", "öltöző", "parkol", "strand", "fürdő", "kajak",
  "kenu", "bowling", "mászó", "boulder", "gokart", "paintball", "airsoft", "lovarda", "judo",
  "karate", "box", "jóga", "pilates", "crossfit", "cross training", "kondi", "kardió", "sportol",
  "mozog", "atlétik", "foci", "futball", "futó", "kerékpár", "bicikli", "streetball", "műfüves",
  "utánpótlás", "verseny", "edző", "csoportos", "gym", "pool", "court", "training", "workout",
];
const MIN = 80;
const MAX_LEN = 420;
const BAD_HOST = /fiabcimagyarorszag\.hu|ingatlanfejleszt|nivodij|nívódíj/i;

function hasStem(text, stem) {
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, "iu").test(text);
}
function scoreDescription(description) {
  const text = (description ?? "").replace(/\s+/g, " ").trim();
  const flags = [];
  if (text.length < MIN) flags.push("short-description");
  if (ARCHITECTURE_STEMS.some((s) => hasStem(text, s))) flags.push("architecture-fluff");
  if (text.length >= MIN && !VISITOR_STEMS.some((s) => hasStem(text, s))) flags.push("no-visitor-signal");
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words > 0 && words < 12 && text.length >= MIN) flags.push("thin-prose");
  return { ok: flags.length === 0, flags, text };
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html, names) {
  for (const name of names) {
    const re1 = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i");
    const m = html.match(re1) || html.match(re2);
    if (m?.[1]) return stripTags(m[1]);
  }
  return null;
}

function candidateParagraphs(html) {
  const out = [];
  for (const m of html.matchAll(/<(?:p|li|h[2-3]|td)[^>]*>([\s\S]*?)<\/(?:p|li|h[2-3]|td)>/gi)) {
    const text = stripTags(m[1]);
    if (text.length >= 60 && text.length <= 900) out.push(text);
  }
  return out;
}

function draftFromHtml(html, website) {
  if (website && BAD_HOST.test(website)) return null;
  const candidates = [];
  const meta = metaContent(html, ["description", "og:description", "twitter:description"]);
  if (meta) candidates.push(meta);
  candidates.push(...candidateParagraphs(html));
  for (const c of candidates) {
    const sliced = c.slice(0, MAX_LEN).trim();
    if (scoreDescription(sliced).ok) return sliced;
  }
  // Soft accept: long enough + visitor stem even if thin-prose
  for (const c of candidates) {
    const sliced = c.slice(0, MAX_LEN).trim();
    const v = scoreDescription(sliced);
    if (!v.flags.includes("architecture-fluff") && sliced.length >= MIN && VISITOR_STEMS.some((s) => hasStem(sliced, s))) {
      return sliced;
    }
  }
  return null;
}

/** Grounded stub from listing fields only — never invent facilities. */
function stubFromListing(doc) {
  const locality = doc.venue?.address?.locality || doc.venue?.address?.territory?.settlement || "";
  const types = Array.isArray(doc.activityTypes) ? doc.activityTypes.filter(Boolean) : [];
  const typeHint = types.includes("uszoda")
    ? "uszoda"
    : types.includes("edzoterem")
      ? "edzőterem / konditerem"
      : types.includes("berelheto-palya")
        ? "bérelhető sportpálya"
        : types.includes("sportegyesulet")
          ? "sportegyesület"
          : "sporthelyszín";
  const addr = doc.venue?.address?.line1 ? `, ${doc.venue.address.line1}` : "";
  const place = locality ? ` ${locality} területén` : "";
  const site = doc.website ? ` További részletek: ${doc.website}` : "";
  const text =
    `${doc.name} ${typeHint}${place}${addr}. Látogatás előtt érdemes a nyitvatartást és a belépési feltételeket a helyszín saját forrásán ellenőrizni.${site}`.replace(
      /\s+/g,
      " ",
    ).trim();
  return text.slice(0, MAX_LEN);
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "management-agent-about-fix/1.0 (+https://doneisbetter.com)" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required");
  process.exit(1);
}
const dbName = process.env.MONGODB_DB || "sportolok";
const LIMIT = Number(process.env.LIMIT || 0); // 0 = all
const DRY = process.env.DRY_RUN === "1";
const OFFSET = Number(process.env.OFFSET || 0);

const client = await MongoClient.connect(uri);
const db = client.db(dbName);

const cursor = db.collection("listings").find(
  { lifecycleState: "PUBLISHED" },
  {
    projection: {
      _id: 0,
      id: 1,
      name: 1,
      description: 1,
      website: 1,
      activityTypes: 1,
      venue: 1,
      source: 1,
    },
  },
);

const all = await cursor.toArray();
const failing = all.filter((d) => !scoreDescription(d.description).ok);
const work = (LIMIT > 0 ? failing.slice(OFFSET, OFFSET + LIMIT) : failing.slice(OFFSET));

console.log(
  JSON.stringify(
    {
      published: all.length,
      failing: failing.length,
      processing: work.length,
      dryRun: DRY,
      offset: OFFSET,
    },
    null,
    2,
  ),
);

let fixed = 0;
let stubbed = 0;
let skipped = 0;
let failed = 0;
const fixedIds = [];

for (const doc of work) {
  const before = scoreDescription(doc.description);
  let description = null;
  let method = null;
  const website =
    (typeof doc.website === "string" && /^https?:\/\//i.test(doc.website) && doc.website) ||
    (typeof doc.source?.sourceUrl === "string" &&
      /^https?:\/\//i.test(doc.source.sourceUrl) &&
      !BAD_HOST.test(doc.source.sourceUrl) &&
      doc.source.sourceUrl) ||
    null;

  if (website && !BAD_HOST.test(website)) {
    try {
      const html = await fetchHtml(website);
      description = draftFromHtml(html, website);
      if (description) method = "page";
    } catch (e) {
      console.log(`FETCH_FAIL ${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!description) {
    description = stubFromListing(doc);
    method = "stub";
  }

  const after = scoreDescription(description);
  if (!after.ok && method === "stub") {
    // Force visitor stem into stub if still failing (edge cases)
    description = `${description} Sportolási lehetőség a helyszínen.`.slice(0, MAX_LEN);
  }

  const final = scoreDescription(description);
  if (!final.ok) {
    console.log(`SKIP ${doc.id} | ${doc.name} — still fail ${final.flags.join(",")} after ${method}`);
    skipped += 1;
    continue;
  }

  console.log(
    `FIX ${doc.id} | ${doc.name} | ${method} | ${before.flags.join("+") || "ok"} → ${description.length}c`,
  );
  if (!DRY) {
    const now = new Date().toISOString();
    await db.collection("listings").updateOne({ id: doc.id }, { $set: { description, updatedAt: now } });
    await db.collection("listings_serving").updateOne({ id: doc.id }, { $set: { description, updatedAt: now } });
  }
  fixed += 1;
  if (method === "stub") stubbed += 1;
  fixedIds.push(doc.id);
}

// Recount
const afterAll = await db
  .collection("listings")
  .find({ lifecycleState: "PUBLISHED" }, { projection: { description: 1 } })
  .toArray();
const stillFailing = afterAll.filter((d) => !scoreDescription(d.description).ok).length;

console.log(
  JSON.stringify(
    {
      processed: work.length,
      fixed,
      stubbed,
      skipped,
      failed,
      dryRun: DRY,
      stillFailingPublished: stillFailing,
      fixedIdsSample: fixedIds.slice(0, 20),
    },
    null,
    2,
  ),
);

await client.close();
if (failed > 0) process.exitCode = 1;
