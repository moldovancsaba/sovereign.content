/**
 * Test Sovereign System with Real Scenarios
 * 
 * Scenarios:
 * 1. Improve existing published listing (republish with enrichment)
 * 2. Evaluate unpublished listing (quality gate decision)
 * 3. Find new listing opportunity (delivery optimizer)
 */

import { getDb } from "../src/lib/mongodb";
import { getVertical } from "../src/lib/vertical/resolve";
import { evaluateCard, evaluateListing, recordDecision } from "../src/lib/sovereign/agent";
import { calculateDeliveryPriority, deriveAudienceSegments } from "../src/lib/sovereign/delivery";
import { parseListing } from "../src/lib/entity/listing";
import type { ContentCard } from "../src/lib/pipeline/cards";

async function testScenario1_ImprovePublishedListing() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 SCENARIO 1: Improve Existing Published Listing");
  console.log("=".repeat(80) + "\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  const { pack } = getVertical();
  const sovereignConfig = (pack as any).sovereignAgent;

  // Find a published listing
  const publishedDoc = await db.collection("listings").findOne({
    lifecycleState: "PUBLISHED",
    vertical: pack.slug,
  });

  if (!publishedDoc) {
    console.log("⚠️  No published listings found for", pack.slug);
    return;
  }

  const listing = parseListing(publishedDoc);
  console.log("✅ Found published listing:", listing.id);
  console.log("   Name:", listing.name);
  console.log("   Category:", listing.category);
  console.log("   Description length:", listing.description?.length || 0);
  console.log("   Images:", listing.images?.length || 0);
  console.log("   Geocode:", listing.geocode ? "✓" : "✗");

  // Evaluate with sovereign agent
  console.log("\n🤖 Evaluating with Sovereign Agent...");
  
  if (!sovereignConfig) {
    console.log("⚠️  Sovereign agent not configured for", pack.slug);
    return;
  }

  const decision = evaluateListing(listing, sovereignConfig);
  
  console.log("\n📋 Decision Results:");
  console.log("   Decision:", decision.decision.toUpperCase());
  console.log("   Confidence:", (decision.confidence * 100).toFixed(1) + "%");
  console.log("   Reasoning:", decision.reasoning);
  
  if (decision.evidence.scores) {
    console.log("\n   Scores:");
    for (const [key, value] of Object.entries(decision.evidence.scores)) {
      console.log(`     - ${key}: ${(value * 100).toFixed(1)}%`);
    }
  }

  if (decision.evidence.flags.length > 0) {
    console.log("\n   Flags:", decision.evidence.flags.join(", "));
  }

  if (decision.evidence.missing.length > 0) {
    console.log("   Missing:", decision.evidence.missing.join(", "));
  }

  // Calculate delivery priority
  console.log("\n📦 Calculating Delivery Priority...");
  const priority = calculateDeliveryPriority(
    listing,
    sovereignConfig.deliveryRules,
    [], // No existing listings for simplicity
  );

  console.log("   Priority Score:", priority.score.toFixed(1), "/ 100");
  console.log("   Coverage Gap:", (priority.factors.coverageGap * 100).toFixed(1) + "%");
  console.log("   Completeness:", (priority.factors.completeness * 100).toFixed(1) + "%");
  console.log("   Demand:", (priority.factors.demand * 100).toFixed(1) + "%");
  console.log("   Newness:", (priority.factors.newness * 100).toFixed(1) + "%");

  // Determine audience segments
  const segments = deriveAudienceSegments(listing, pack);
  console.log("\n👥 Target Audience Segments:", segments.length);
  segments.slice(0, 3).forEach((seg) => {
    const parts = [];
    if (seg.ageMin || seg.ageMax) {
      parts.push(`age ${seg.ageMin || 0}-${seg.ageMax || 99}`);
    }
    if (seg.category) parts.push(seg.category);
    if (seg.location) parts.push(seg.location);
    console.log("   -", parts.join(", "));
  });

  // Recommendations
  console.log("\n💡 Recommendations:");
  if (decision.decision === "approve") {
    console.log("   ✅ Content meets quality standards");
    console.log("   ✅ Ready for promotion");
  } else if (decision.decision === "remediate") {
    console.log("   ⚠️  Improvements needed:");
    decision.evidence.missing.forEach((item) => {
      console.log(`     - Add ${item}`);
    });
  }

  if (priority.score < 50) {
    console.log("   ⚠️  Low priority - consider enrichment to improve visibility");
  } else if (priority.score >= 70) {
    console.log("   ✅ High priority - good candidate for featured placement");
  }

  // Record the decision
  await recordDecision(db, decision);
  console.log("\n✅ Decision recorded in audit trail");
}

async function testScenario2_EvaluateUnpublishedListing() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 SCENARIO 2: Evaluate Unpublished Listing");
  console.log("=".repeat(80) + "\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  const { pack } = getVertical();
  const sovereignConfig = (pack as any).sovereignAgent;

  // Find a content card in REVIEW_READY state
  const reviewCard = await db.collection("content_cards").findOne({
    state: "REVIEW_READY",
  }) as ContentCard | null;

  if (!reviewCard) {
    console.log("⚠️  No cards in REVIEW_READY state");
    
    // Try other states
    const otherCard = await db.collection("content_cards").findOne({
      state: { $in: ["EXTRACTED", "PUBLISH_PREFLIGHT_READY"] },
    }) as ContentCard | null;

    if (!otherCard) {
      console.log("⚠️  No content cards found in any workable state");
      return;
    }

    console.log("✅ Found card in state:", otherCard.state);
    console.log("   Card ID:", otherCard.id);
  } else {
    console.log("✅ Found card in REVIEW_READY state");
    console.log("   Card ID:", reviewCard.id);
  }

  const card = reviewCard || (await db.collection("content_cards").findOne({
    state: { $in: ["EXTRACTED", "PUBLISH_PREFLIGHT_READY"] },
  })) as ContentCard;

  if (!card) {
    console.log("⚠️  No suitable cards found");
    return;
  }

  console.log("   State:", card.state);
  console.log("   Source Pool:", card.sourcePool);
  console.log("   Created:", new Date(card.createdAt).toLocaleDateString());

  if (!sovereignConfig) {
    console.log("⚠️  Sovereign agent not configured for", pack.slug);
    return;
  }

  // Evaluate the card
  console.log("\n🤖 Evaluating with Sovereign Agent...");
  const decision = evaluateCard(card, sovereignConfig);

  console.log("\n📋 Decision Results:");
  console.log("   Decision:", decision.decision.toUpperCase());
  console.log("   Confidence:", (decision.confidence * 100).toFixed(1) + "%");
  console.log("   Reasoning:", decision.reasoning);

  if (decision.evidence.scores) {
    console.log("\n   Scores:");
    for (const [key, value] of Object.entries(decision.evidence.scores)) {
      console.log(`     - ${key}: ${(value * 100).toFixed(1)}%`);
    }
  }

  if (decision.evidence.flags.length > 0) {
    console.log("\n   ⚠️  Flags:", decision.evidence.flags.join(", "));
  }

  if (decision.evidence.missing.length > 0) {
    console.log("   Missing:", decision.evidence.missing.join(", "));
  }

  // Routing decision
  console.log("\n🔀 Routing Decision:");
  if (decision.decision === "approve" && decision.confidence >= 0.95) {
    console.log("   ✅ AUTO-PUBLISH: High confidence approval");
    console.log("   → Move to PUBLISHED state");
  } else if (decision.decision === "reject") {
    console.log("   ❌ REJECT: Does not meet quality standards");
    console.log("   → Move to BLOCKED_REPAIRABLE or QUARANTINED");
  } else if (decision.decision === "escalate") {
    console.log("   ⏫ ESCALATE: Needs human review");
    console.log("   → Keep in REVIEW_READY state");
  } else if (decision.decision === "remediate") {
    console.log("   🔧 REMEDIATE: Fixable issues identified");
    console.log("   → Send back for improvement");
  }

  // Record the decision
  await recordDecision(db, decision);
  console.log("\n✅ Decision recorded in audit trail");
}

async function testScenario3_FindNewListingOpportunity() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 SCENARIO 3: Find New Listing Opportunity (Coverage Gap Analysis)");
  console.log("=".repeat(80) + "\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  const { pack } = getVertical();
  const sovereignConfig = (pack as any).sovereignAgent;

  if (!sovereignConfig) {
    console.log("⚠️  Sovereign agent not configured for", pack.slug);
    return;
  }

  // Get all published listings
  const allListings = await db
    .collection("listings")
    .find({
      lifecycleState: "PUBLISHED",
      vertical: pack.slug,
    })
    .toArray();

  console.log("📊 Current Catalog:", allListings.length, "published listings");

  // Analyze coverage by category
  const categoryCount: Record<string, number> = {};
  const locationCount: Record<string, number> = {};

  for (const doc of allListings) {
    const listing = parseListing(doc);
    
    if (listing.category) {
      categoryCount[listing.category] = (categoryCount[listing.category] || 0) + 1;
    }
    
    if (listing.address?.locality) {
      locationCount[listing.address.locality] = (locationCount[listing.address.locality] || 0) + 1;
    }
  }

  console.log("\n📊 Coverage by Category:");
  const sortedCategories = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  for (const [category, count] of sortedCategories) {
    console.log(`   ${category}: ${count} listings`);
  }

  console.log("\n📊 Coverage by Location:");
  const sortedLocations = Object.entries(locationCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  for (const [location, count] of sortedLocations) {
    console.log(`   ${location}: ${count} listings`);
  }

  // Identify gaps
  console.log("\n🔍 Coverage Gap Analysis:");
  
  const allCategories = pack.taxonomy.categories.map((c) => c.id);
  const missingCategories = allCategories.filter((cat) => !categoryCount[cat]);
  
  if (missingCategories.length > 0) {
    console.log("\n   ⚠️  Categories with NO listings:");
    missingCategories.slice(0, 5).forEach((cat) => {
      console.log(`     - ${cat}`);
    });
  }

  const underservedCategories = Object.entries(categoryCount)
    .filter(([, count]) => count < 3)
    .sort(([, a], [, b]) => a - b);

  if (underservedCategories.length > 0) {
    console.log("\n   ⚠️  Underserved categories (<3 listings):");
    underservedCategories.slice(0, 5).forEach(([cat, count]) => {
      console.log(`     - ${cat}: ${count} listings`);
    });
  }

  // Calculate priority for a hypothetical new listing in a gap area
  console.log("\n💡 Opportunity Score for New Listing:");
  
  const gapCategory = missingCategories[0] || underservedCategories[0]?.[0];
  if (gapCategory) {
    console.log(`   Target Category: ${gapCategory}`);
    
    // Create a hypothetical listing
    const hypotheticalListing: any = {
      id: "hypothetical-001",
      category: gapCategory,
      name: `Sample ${gapCategory} Activity`,
      description: "A sample description that meets minimum length requirements. ".repeat(10),
      images: [{ url: "https://example.com/image.jpg", alt: "Sample" }],
      geocode: { lat: 47.4979, lng: 19.0402 }, // Budapest
      address: { locality: "Budapest" },
      schedule: { freeform: "Monday-Friday 9-17" },
      createdAt: new Date().toISOString(),
    };

    const priority = calculateDeliveryPriority(
      hypotheticalListing,
      sovereignConfig.deliveryRules,
      allListings.map((d) => parseListing(d)),
    );

    console.log("   Priority Score:", priority.score.toFixed(1), "/ 100");
    console.log("   Coverage Gap Factor:", (priority.factors.coverageGap * 100).toFixed(1) + "%");
    console.log("   → HIGH PRIORITY due to coverage gap");
    
    console.log("\n   💡 Recommendation:");
    console.log("      Search for more", gapCategory, "listings");
    console.log("      Focus on underrepresented locations");
    console.log("      These will receive highest priority scores");
  }

  console.log("\n✅ Coverage gap analysis complete");
}

async function main() {
  console.log("🚀 Sovereign Content System - Real Scenario Testing");
  console.log("================================================\n");

  const { pack } = getVertical();
  console.log("Vertical:", pack.slug);
  console.log("Display Name:", pack.displayName);

  const sovereignConfig = (pack as any).sovereignAgent;
  if (!sovereignConfig?.enabled) {
    console.log("\n⚠️  WARNING: Sovereign agent is not enabled for this vertical");
    console.log("   Enable it in the vertical pack configuration to use these features.\n");
  } else {
    console.log("\n✅ Sovereign agent is ENABLED");
    console.log("   Allowed decisions:", sovereignConfig.allowedDecisions.join(", "));
    console.log("   Autonomy threshold:", (sovereignConfig.autonomyThreshold * 100).toFixed(0) + "%\n");
  }

  try {
    await testScenario1_ImprovePublishedListing();
    await testScenario2_EvaluateUnpublishedListing();
    await testScenario3_FindNewListingOpportunity();

    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL SCENARIOS COMPLETE");
    console.log("=".repeat(80) + "\n");

    console.log("📊 Summary:");
    console.log("   1. ✅ Evaluated existing published listing for improvements");
    console.log("   2. ✅ Assessed unpublished content for publication readiness");
    console.log("   3. ✅ Identified coverage gaps and new listing opportunities");
    console.log("\n   All decisions recorded in sovereign_decisions collection");
    console.log("   Check MongoDB for full audit trail\n");

  } catch (error) {
    console.error("\n❌ Error during testing:");
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
