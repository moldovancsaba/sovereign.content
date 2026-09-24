#!/usr/bin/env node
/**
 * catalog:hygiene — Unified geo/price/contact drains for listings.
 *
 * No Google key, no AI Gateway, no Ollama. Uses Nominatim for geo, regex for price,
 * sourceText headers for contact.
 *
 * SSOT contract: https://sovereigncontent.messmass.com/jobs#cataloghygiene
 *
 * Usage:
 *   MONGODB_URI=... MONGODB_DB=sportolok node scripts/catalog-hygiene.mjs
 *   MONGODB_URI=... node scripts/catalog-hygiene.mjs --passes geo,price,contact
 *   MONGODB_URI=... node scripts/catalog-hygiene.mjs --dry-run
 *   MONGODB_URI=... node scripts/catalog-hygiene.mjs --limit 50
 *
 * Flags:
 *   --passes geo,price,contact  Comma-separated passes to run (default: all)
 *   --limit N                   Max listings per pass (default: 100)
 *   --dry-run                   Report only, no writes
 *
 * Exits 0/1 with client close in finally.
 *
 * Exit codes:
 *   0 = success
 *   1 = error
 */

import { MongoClient } from "mongodb";
import https from "https";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "sportolok";
const GEOCODER_USER_AGENT = process.env.GEOCODER_USER_AGENT || "sportolok-hygiene/1.0";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
const passesArg = args.find((a) => a.startsWith("--passes="))?.split("=")[1];
const passes = passesArg ? passesArg.split(",") : ["geo", "price", "contact"];
const limit = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "100");
const dryRun = args.includes("--dry-run");

// Nominatim geocoder
async function geocodeAddress(address) {
  const query = encodeURIComponent(address);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
  
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": GEOCODER_USER_AGENT } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.length > 0) {
            resolve({
              lat: parseFloat(parsed[0].lat),
              lng: parseFloat(parsed[0].lon)
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

// Price extractor (simple regex)
function extractPrice(text) {
  if (!text) return null;
  
  // Look for Hungarian price patterns: "2500 Ft", "2.500 Ft", "2 500 Ft"
  const match = text.match(/(\d+[\s.,]?\d*)\s*(?:Ft|forint|HUF)/i);
  if (match) {
    const amount = parseFloat(match[1].replace(/[\s.,]/g, ""));
    if (!isNaN(amount) && amount > 0) {
      return {
        minorUnits: Math.round(amount * 100),
        currency: "HUF"
      };
    }
  }
  
  return null;
}

// Contact extractor from sourceText headers
function extractContact(sourceText) {
  if (!sourceText) return {};
  
  const contact = {};
  
  // Phone: lines starting with "Phone:" or "Tel:"
  const phoneMatch = sourceText.match(/(?:Phone|Tel|Telefon):\s*([+\d\s()-]+)/i);
  if (phoneMatch) {
    contact.phone = phoneMatch[1].trim();
  }
  
  // Website: lines starting with "Website:" or "Web:"
  const webMatch = sourceText.match(/(?:Website|Web|Weboldal):\s*(https?:\/\/[^\s]+)/i);
  if (webMatch) {
    contact.website = webMatch[1].trim();
  }
  
  // Email: lines starting with "Email:"
  const emailMatch = sourceText.match(/Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    contact.email = emailMatch[1].trim();
  }
  
  return contact;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log(`Hygiene ${dryRun ? "(DRY-RUN)" : ""}: db=${MONGODB_DB} passes=${passes.join(",")} limit=${limit}`);
    
    const listingsCollection = db.collection("listings");
    const results = {
      geo: { scanned: 0, filled: 0, skipped: 0, failed: 0 },
      price: { scanned: 0, filled: 0, skipped: 0, failed: 0 },
      contact: { scanned: 0, filled: 0, skipped: 0, failed: 0 }
    };
    
    // GEO PASS
    if (passes.includes("geo")) {
      console.log("\n=== GEO PASS ===");
      const emptyGeo = await listingsCollection
        .find({
          lifecycleState: "PUBLISHED",
          $or: [
            { "venue.geo.lat": { $exists: false } },
            { "venue.geo.lng": { $exists: false } }
          ]
        })
        .limit(limit)
        .toArray();
      
      results.geo.scanned = emptyGeo.length;
      console.log(`Found ${emptyGeo.length} published listings without geo`);
      
      for (const listing of emptyGeo.slice(0, dryRun ? 3 : emptyGeo.length)) {
        const address = listing.venue?.address;
        if (!address) {
          results.geo.skipped++;
          continue;
        }
        
        const addressString = [
          address.line1,
          address.territory?.settlement,
          address.territory?.country
        ].filter(Boolean).join(", ");
        
        if (!addressString) {
          results.geo.skipped++;
          continue;
        }
        
        try {
          const geo = await geocodeAddress(addressString);
          if (geo) {
            if (!dryRun) {
              await listingsCollection.updateOne(
                { _id: listing._id },
                { $set: { "venue.geo": geo, hygieneGeocodedAt: new Date() } }
              );
            }
            console.log(`  ✓ ${listing.name}: ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`);
            results.geo.filled++;
          } else {
            results.geo.failed++;
          }
          
          // Rate limit: 1 req/sec for Nominatim
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (e) {
          console.error(`  ✗ ${listing.name}: ${e.message}`);
          results.geo.failed++;
        }
      }
    }
    
    // PRICE PASS
    if (passes.includes("price")) {
      console.log("\n=== PRICE PASS ===");
      const emptyPrice = await listingsCollection
        .find({
          lifecycleState: "PUBLISHED",
          "price.minorUnits": { $exists: false },
          description: { $exists: true, $ne: "" }
        })
        .limit(limit)
        .toArray();
      
      results.price.scanned = emptyPrice.length;
      console.log(`Found ${emptyPrice.length} published listings without price`);
      
      for (const listing of emptyPrice) {
        const price = extractPrice(listing.description);
        if (price) {
          if (!dryRun) {
            await listingsCollection.updateOne(
              { _id: listing._id },
              { $set: { price, hygieneExtractedPriceAt: new Date() } }
            );
          }
          console.log(`  ✓ ${listing.name}: ${price.minorUnits / 100} ${price.currency}`);
          results.price.filled++;
        } else {
          results.price.skipped++;
        }
      }
    }
    
    // CONTACT PASS
    if (passes.includes("contact")) {
      console.log("\n=== CONTACT PASS ===");
      const cards = await db.collection("content_cards")
        .find({
          lifecycleState: "PUBLISHED",
          "rawPayload.sourceText": { $exists: true, $ne: "" }
        })
        .limit(limit)
        .toArray();
      
      results.contact.scanned = cards.length;
      console.log(`Found ${cards.length} cards with sourceText`);
      
      for (const card of cards) {
        const contact = extractContact(card.rawPayload.sourceText);
        if (Object.keys(contact).length > 0) {
          // Find associated listing
          const listing = await listingsCollection.findOne({ sourceCardId: card._id });
          if (listing) {
            const updates = {};
            if (contact.phone && !listing.venue?.contact?.phone) {
              updates["venue.contact.phone"] = contact.phone;
            }
            if (contact.website && !listing.venue?.website) {
              updates["venue.website"] = contact.website;
            }
            if (contact.email && !listing.venue?.contact?.email) {
              updates["venue.contact.email"] = contact.email;
            }
            
            if (Object.keys(updates).length > 0) {
              if (!dryRun) {
                await listingsCollection.updateOne(
                  { _id: listing._id },
                  { $set: { ...updates, hygieneContactAt: new Date() } }
                );
              }
              console.log(`  ✓ ${listing.name}: ${Object.keys(updates).join(", ")}`);
              results.contact.filled++;
            }
          }
        } else {
          results.contact.skipped++;
        }
      }
    }
    
    console.log("\n✅ Hygiene complete");
    console.log(JSON.stringify({
      db: MONGODB_DB,
      passes: passes,
      results,
      dryRun
    }, null, 2));
    
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Hygiene failed:", err);
  process.exit(1);
});
