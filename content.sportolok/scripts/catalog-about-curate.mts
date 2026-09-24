/**
 * Agent-owned About enrichment — draft grounded descriptions from the listing website.
 * No in-app LLM: Cloud Agent (or this deterministic OG/meta extract) writes About text.
 *
 * Mode:
 *   - default: extract meta description / first meaningful paragraph from the page
 *   - never invent venues or facts not present on the page
 *
 *   MONGODB_URI=... MONGODB_DB=sportolok LIMIT=15 node scripts/agent-description-enrich.mjs
 */
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required");
  process.exit(1);
}
const dbName = process.env.MONGODB_DB || "sportolok";
const LIMIT = Number(process.env.LIMIT || 15);
const DRY = process.env.DRY_RUN === "1";
const MIN_LEN = Number(process.env.MIN_DESC_LEN || 80);
const MAX_LEN = 420;

/** Same visitor bar as src/lib/catalogHygiene/descriptionQuality.ts — keep in sync. */
const ARCHITECTURE_FLUFF =
  /\b(homlokzat|lamell|függönyfal|függönyfalu|építészet|építész|faszerkezet|organikus\s+építészet|nívódíj|fiabci|curtain\s*wall|facade|façade|cladding|louver|louvre|architectural\s+concept)\b/i;
const VISITOR_SIGNAL =
  /\b(medence|úszás|uszoda|wellness|szauna|edzés|pálya|bérlés|nyitva|nyitvatartás|belépő|jegy|óra|tanfolyam|babaúszás|vízilabda|squash|tenisz|padel|fitness|edzőterem|öltöző)\b/i;
const BAD_ABOUT_HOST =
  /fiabcimagyarorszag\.hu|ingatlanfejleszt|nivodij|nívódíj/i;

function isVisitorUseful(text) {
  if (!text || text.length < MIN_LEN) return false;
  if (ARCHITECTURE_FLUFF.test(text)) return false;
  if (!VISITOR_SIGNAL.test(text)) return false;
  return true;
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

function firstParagraph(html) {
  const matches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  for (const m of matches) {
    const text = stripTags(m[1]);
    if (text.length >= MIN_LEN && text.length <= 800) return text;
  }
  return null;
}

function draftDescription(html, website) {
  if (website && BAD_ABOUT_HOST.test(website)) return null;
  const fromMeta =
    metaContent(html, ["description", "og:description", "twitter:description"]) || null;
  if (fromMeta && isVisitorUseful(fromMeta)) {
    return fromMeta.slice(0, MAX_LEN);
  }
  const para = firstParagraph(html);
  if (para && isVisitorUseful(para)) return para.slice(0, MAX_LEN);
  return null;
}

async function fetchHtml(website) {
  const res = await fetch(website, {
    headers: { "user-agent": "management-agent-enrich/1.0 (+https://doneisbetter.com)" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

const docs = await db
  .collection("listings")
  .find({
    lifecycleState: { $in: ["PUBLISHED", "REVIEW_READY"] },
    website: { $regex: "^https?://" },
    $or: [
      { description: { $exists: false } },
      { description: null },
      { description: "" },
      { description: { $regex: `^.{0,${MIN_LEN - 1}}$` } },
      { description: { $regex: ARCHITECTURE_FLUFF } },
    ],
  })
  .sort({ updatedAt: 1 })
  .limit(LIMIT)
  .toArray();

console.log(`Scanning ${docs.length} thin/fluff-description listings (dry=${DRY} db=${dbName})`);
let enriched = 0;
let skipped = 0;
let failed = 0;
const enrichedIds = [];

for (const doc of docs) {
  try {
    if (doc.website && BAD_ABOUT_HOST.test(doc.website)) {
      console.log(`SKIP ${doc.id} | ${doc.name} — bad About host ${doc.website}`);
      skipped += 1;
      continue;
    }
    const html = await fetchHtml(doc.website);
    const description = draftDescription(html, doc.website);
    if (!description) {
      console.log(`SKIP ${doc.id} | ${doc.name} — no visitor-useful text on ${doc.website}`);
      skipped += 1;
      continue;
    }
    console.log(`ENRICH ${doc.id} | ${doc.name} — ${description.length} chars`);
    if (!DRY) {
      const now = new Date().toISOString();
      await db.collection("listings").updateOne({ id: doc.id }, { $set: { description, updatedAt: now } });
      await db.collection("listings_serving").updateOne({ id: doc.id }, { $set: { description, updatedAt: now } });
    }
    enriched += 1;
    enrichedIds.push(doc.id);
  } catch (e) {
    console.log(`FAIL ${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
    failed += 1;
  }
}

const thin = await db.collection("listings").countDocuments({
  $or: [
    { description: { $exists: false } },
    { description: null },
    { description: "" },
    { description: { $regex: `^.{0,${MIN_LEN - 1}}$` } },
  ],
});

console.log(
  JSON.stringify({ scanned: docs.length, enriched, skipped, failed, dryRun: DRY, enrichedIds, thinRemaining: thin }, null, 2),
);
await client.close();
if (failed > 0) process.exitCode = 1;
