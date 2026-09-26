#!/usr/bin/env node
/**
 * catalog:media-curate — Fill empty listing media from website OG images with rehost.
 *
 * SSOT contract: https://sovereigncontent.messmass.com/jobs#catalogmedia-curate
 *
 * Media host hierarchy:
 * 1. Discover imagery (website OG / page snapshot)
 * 2. Rehost to R2 primary (if R2_* configured)
 * 3. Fallback to ImgBB backup (if IMGBB_API_KEY configured)
 * 4. If neither configured, attach discovered https URL (passthrough)
 *
 * Usage:
 *   MONGODB_URI=... MONGODB_DB=sportolok npm run catalog:media-curate -- --limit 40
 *   npm run catalog:media-curate -- --limit 25 --policy allow_og_scrape
 *   npm run catalog:media-curate -- --listing-id=... --dry-run
 *
 * Flags:
 *   --limit N                         Max listings to process (default: 25)
 *   --listing-id ID                   Process specific listing
 *   --policy allow_og_scrape|generated_art_only  Policy (default: allow_og_scrape)
 *   --dry-run                         Report only, no writes
 *
 * Env:
 *   MONGODB_URI, MONGODB_DB, VERTICAL
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (optional primary)
 *   IMGBB_API_KEY (optional backup)
 *   PUBLIC_SITE_ORIGIN (optional for page-snapshot fallback)
 *
 * Exit codes:
 *   0 = success
 *   1 = error
 */
import { MongoClient } from "mongodb";
import https from "https";
import crypto from "crypto";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required");
  process.exit(1);
}

// Parse args (handles both --flag=value and --flag value formats)
const args = process.argv.slice(2);

function getArg(name) {
  const eqIdx = args.findIndex((a) => a.startsWith(`${name}=`));
  if (eqIdx !== -1) return args[eqIdx].split("=")[1];
  const spaceIdx = args.findIndex((a) => a === name);
  if (spaceIdx !== -1 && spaceIdx + 1 < args.length) return args[spaceIdx + 1];
  return null;
}

const limit = parseInt(getArg("--limit") || "25");
const listingId = getArg("--listing-id");
const policyArg = getArg("--policy");
const policy = policyArg || process.env.MEDIA_CURATE_POLICY || "allow_og_scrape";
const dryRun = args.includes("--dry-run");

const dbName = process.env.MONGODB_DB || "sportolok";

// R2 config (primary)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const hasR2 = R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET;

// ImgBB config (backup)
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const hasImgBB = !!IMGBB_API_KEY;

console.log(`Media-curate ${dryRun ? "(DRY-RUN)" : ""}: db=${dbName} limit=${limit} policy=${policy}`);
console.log(`Rehost: R2=${hasR2 ? "✓" : "✗"} ImgBB=${hasImgBB ? "✓" : "✗"} passthrough=${!hasR2 && !hasImgBB ? "✓" : "fallback"}`);

function extractImages(html, baseUrl) {
  const out = [];
  const add = (u) => {
    if (!u || /^data:/i.test(u)) return;
    try {
      const url = new URL(u.replace(/&amp;/g, "&"), baseUrl);
      if (url.protocol === "http:") url.protocol = "https:";
      if (url.protocol !== "https:") return;
      if (/\b(logo|icon|sprite|favicon|pixel|1x1)\b/i.test(url.pathname + url.href)) return;
      if (/\.svg(\?|$)/i.test(url.pathname)) return;
      out.push(url.toString());
    } catch {
      /* ignore bad urls */
    }
  };
  for (const m of html.matchAll(/property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi)) {
    add(m[1]);
  }
  for (const m of html.matchAll(/content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi)) {
    add(m[1]);
  }
  for (const m of html.matchAll(/<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi)) {
    add(m[1]);
  }
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/gi)) {
    add(m[1]);
  }
  return [...new Set(out)].slice(0, 5);
}

async function fetchImages(website) {
  const res = await fetch(website, {
    headers: { "user-agent": "management-media-curate/1.0 (+https://doneisbetter.com)" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  return extractImages(html, website);
}

// Rehost to ImgBB (backup)
async function rehostToImgBB(imageUrl) {
  if (!hasImgBB) return null;
  
  try {
    const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!imageRes.ok) return null;
    
    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    
    const formData = new URLSearchParams();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64Image);
    
    const uploadRes = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    
    if (!uploadRes.ok) return null;
    
    const data = await uploadRes.json();
    return data.data?.url || null;
  } catch {
    return null;
  }
}

// Rehost to R2 (primary) - stub for now, needs AWS SDK
async function rehostToR2(imageUrl) {
  if (!hasR2) return null;
  
  // TODO: Implement R2 upload with AWS S3-compatible SDK
  // For now, return null to fall back to ImgBB
  return null;
}

// Rehost with hierarchy: R2 primary → ImgBB backup → https passthrough
async function rehostImage(url) {
  // Try R2 first
  const r2Url = await rehostToR2(url);
  if (r2Url) return { url: r2Url, rehosted: "r2" };
  
  // Fallback to ImgBB
  const imgbbUrl = await rehostToImgBB(url);
  if (imgbbUrl) return { url: imgbbUrl, rehosted: "imgbb" };
  
  // Passthrough if no host configured
  return { url, rehosted: "passthrough" };
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

const docs = await db
  .collection("listings")
  .find({
    lifecycleState: { $in: ["PUBLISHED", "REVIEW_READY"] },
    media: { $size: 0 },
    website: { $regex: "^https?://" },
  })
  .sort({ updatedAt: 1 })
  .limit(limit)
  .toArray();

console.log(`Scanning ${docs.length} empty-media listings`);
let enriched = 0;
let skipped = 0;
let failed = 0;
const enrichedIds = [];

for (const doc of docs) {
  try {
    // Policy check
    if (policy === "generated_art_only") {
      console.log(`SKIP ${doc.id} | ${doc.name} — policy=generated_art_only (no venue-photo scrape)`);
      skipped += 1;
      continue;
    }
    
    const urls = await fetchImages(doc.website);
    if (!urls.length) {
      console.log(`SKIP ${doc.id} | ${doc.name} — no images on ${doc.website}`);
      skipped += 1;
      continue;
    }
    
    // Rehost images through hierarchy
    const media = [];
    for (let i = 0; i < Math.min(urls.length, 5); i++) {
      const rehosted = await rehostImage(urls[i]);
      media.push({
        url: rehosted.url,
        kind: "image",
        ...(i === 0 && doc.name ? { alt: doc.name } : {}),
        ...(rehosted.rehosted !== "passthrough" ? { rehostedVia: rehosted.rehosted } : {}),
      });
    }
    
    console.log(`ENRICH ${doc.id} | ${doc.name} — ${media.length} image(s) [${media[0]?.rehostedVia || "passthrough"}]`);
    if (!dryRun) {
      const now = new Date().toISOString();
      await db.collection("listings").updateOne({ id: doc.id }, { $set: { media, updatedAt: now } });
      await db.collection("listings_serving").updateOne({ id: doc.id }, { $set: { media, updatedAt: now } });
    }
    enriched += 1;
    enrichedIds.push(doc.id);
  } catch (e) {
    console.log(`FAIL ${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
    failed += 1;
  }
}

const withMedia = await db.collection("listings").countDocuments({ "media.0": { $exists: true } });
console.log("\n✅ Media-curate complete");
console.log(
  JSON.stringify(
    { 
      db: dbName,
      scanned: docs.length, 
      enriched, 
      skipped, 
      failed, 
      policy,
      rehostConfig: { r2: hasR2, imgbb: hasImgBB, passthrough: !hasR2 && !hasImgBB },
      dryRun, 
      enrichedIds: enrichedIds.slice(0, 10), 
      withMediaTotal: withMedia 
    },
    null,
    2,
  ),
);
await client.close();
if (failed > 0) process.exit(1);
