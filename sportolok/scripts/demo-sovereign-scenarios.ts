/**
 * Demo Sovereign System with Simulated Scenarios
 * 
 * This demonstrates the sovereign system without requiring database access.
 * It shows how the system would evaluate real listings.
 */

import { evaluateCard, evaluateListing, DEFAULT_SOVEREIGN_CONFIG } from "../src/lib/sovereign/agent";
import { calculateDeliveryPriority, deriveAudienceSegments } from "../src/lib/sovereign/delivery";
import type { Listing } from "../src/lib/entity/listing";
import type { ContentCard } from "../src/lib/pipeline/cards";
import type { VerticalPack } from "../src/lib/vertical/pack";

// Simulate sportolok pack configuration
const sportolokPack: Partial<VerticalPack> = {
  slug: "sportolok",
  displayName: "Sportolók",
  timeZone: "Europe/Budapest",
  taxonomy: {
    categories: [
      { id: "football", label: "Football", order: 1 },
      { id: "basketball", label: "Basketball", order: 2 },
      { id: "tennis", label: "Tennis", order: 3 },
      { id: "swimming", label: "Swimming", order: 4 },
      { id: "martial-arts", label: "Martial Arts", order: 5 },
    ] as any,
    ageBands: [
      { id: "toddler", minAge: 2, maxAge: 4, label: "Óvodás (2-4)" },
      { id: "kid", minAge: 5, maxAge: 10, label: "Gyerek (5-10)" },
      { id: "teen", minAge: 11, maxAge: 17, label: "Tinédzser (11-17)" },
      { id: "adult", minAge: 18, maxAge: null, label: "Felnőtt (18+)" },
    ],
  },
};

// Use sportolok sovereign config
const sovereignConfig = {
  enabled: true,
  allowedDecisions: [
    "quality-gate",
    "content-enrichment",
    "delivery-priority",
    "description-quality",
    "schedule-validation",
    "geo-accuracy",
  ] as const,
  autonomyThreshold: 0.95,
  qualityGates: {
    minDescriptionLength: 150,
    minImageCount: 1,
    requiresSchedule: true,
    requiresPricing: false,
    requiresGeocode: true,
  },
  deliveryRules: {
    priorityFactors: [
      { factor: "coverage-gap" as const, weight: 0.45 },
      { factor: "completeness" as const, weight: 0.25 },
      { factor: "demand" as const, weight: 0.20 },
      { factor: "newness" as const, weight: 0.10 },
    ],
    maxPublishRate: 40,
  },
  learning: {
    enabled: true,
    minSampleSize: 100,
    retrainingFrequency: "weekly" as const,
  },
};

function scenario1_ExistingPublishedListing() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 SCENARIO 1: Improve Existing Published Listing");
  console.log("=".repeat(80) + "\n");

  // Simulate an existing published listing
  const listing: Listing = {
    id: "l-budapest-football-academy-001",
    name: "Budapest Football Academy",
    category: "football",
    description: "Professional football training for children and teenagers in Budapest. Our experienced coaches provide comprehensive training programs focusing on technical skills, tactical understanding, and physical conditioning. We offer age-appropriate sessions from beginners to advanced players.",
    images: [
      { url: "https://example.com/football1.jpg", alt: "Training session" },
      { url: "https://example.com/football2.jpg", alt: "Stadium view" },
    ],
    geocode: { lat: 47.4979, lng: 19.0402 },
    address: {
      addressLine1: "Futball utca 10",
      locality: "Budapest",
      countryCode: "HU",
    },
    schedule: {
      freeform: "Hétfő-Péntek: 15:00-19:00, Szombat: 09:00-13:00",
    },
    pricing: undefined, // Missing pricing - common for Hungarian clubs
    vertical: "sportolok",
    lifecycleState: "PUBLISHED",
    sourcePool: "manual",
    createdAt: new Date("2026-08-15").toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log("✅ Found published listing:", listing.id);
  console.log("   Name:", listing.name);
  console.log("   Category:", listing.category);
  console.log("   Description length:", listing.description?.length || 0);
  console.log("   Images:", listing.images?.length || 0);
  console.log("   Geocode:", listing.geocode ? "✓" : "✗");
  console.log("   Pricing:", listing.pricing ? "✓" : "✗");

  // Evaluate with sovereign agent
  console.log("\n🤖 Evaluating with Sovereign Agent...");
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

  if (decision.evidence.flags && decision.evidence.flags.length > 0) {
    console.log("\n   ⚠️  Flags:", decision.evidence.flags.join(", "));
  }

  if (decision.evidence.missing && decision.evidence.missing.length > 0) {
    console.log("   Missing:", decision.evidence.missing.join(", "));
  }

  // Calculate delivery priority
  console.log("\n📦 Calculating Delivery Priority...");
  
  // Simulate existing catalog (10 football listings already)
  const existingListings: Listing[] = Array.from({ length: 10 }, (_, i) => ({
    ...listing,
    id: `l-existing-${i}`,
    category: "football",
    createdAt: new Date(Date.now() - i * 7 * 86400000).toISOString(),
  }));

  // Build coverage gap map
  const coverageGaps = new Map<string, number>();
  coverageGaps.set("football", 0.3); // 10 listings = decent coverage, lower gap

  // Build demand signals map
  const demandSignals = new Map<string, number>();
  demandSignals.set("football", 0.7); // High demand

  const priority = calculateDeliveryPriority(listing, {
    config: sovereignConfig,
    coverageGaps,
    demandSignals,
    publishedAt: new Date(listing.createdAt),
  });

  console.log("   Priority Score:", priority.score.toFixed(1), "/ 100");
  console.log("   Coverage Gap:", (priority.factors.coverageGap * 100).toFixed(1) + "% (football has good coverage)");
  console.log("   Completeness:", (priority.factors.completeness * 100).toFixed(1) + "%");
  console.log("   Demand:", (priority.factors.demand * 100).toFixed(1) + "%");
  console.log("   Newness:", (priority.factors.newness * 100).toFixed(1) + "%");

  // Determine audience segments (pass array of listings)
  const segments = deriveAudienceSegments([listing], sportolokPack as any);
  console.log("\n👥 Target Audience Segments:", segments.length);
  segments.slice(0, 5).forEach((seg) => {
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
    console.log("   ✅ Ready for continued promotion");
  }
  if (!listing.pricing) {
    console.log("   💡 Consider adding pricing information (optional for sportolok)");
  }
  console.log("   💡 Consider expanding schedule with more specific times");
  console.log("   💡 Add contact information for direct inquiries");
}

function scenario2_UnpublishedListing() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 SCENARIO 2: Evaluate Unpublished Listing (Content Card)");
  console.log("=".repeat(80) + "\n");

  // Simulate a content card that needs evaluation
  const card: ContentCard = {
    id: "card-tennis-school-budapest-123",
    state: "REVIEW_READY",
    sourcePool: "web-scraper",
    listingId: "l-tennis-school-budapest-123",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: 0,
    rawPayload: {
      sourceText: "URL: https://example.com/tennis-school\n\nBudapest Tennis School offers tennis lessons for all ages. Short description here. Contact us for more info.",
      extractedData: {
        name: "Budapest Tennis School",
        category: "tennis",
        description: "Tennis lessons for all ages in Budapest.", // Too short!
        images: [], // No images!
        address: {
          locality: "Budapest",
          countryCode: "HU",
        },
      },
    },
  };

  console.log("✅ Found content card:", card.id);
  console.log("   State:", card.state);
  console.log("   Source:", card.sourcePool);
  console.log("   Created:", new Date(card.createdAt).toLocaleDateString());

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

  if (decision.evidence.flags && decision.evidence.flags.length > 0) {
    console.log("\n   ⚠️  Flags:", decision.evidence.flags.join(", "));
  }

  if (decision.evidence.missing && decision.evidence.missing.length > 0) {
    console.log("   ⚠️  Missing:", decision.evidence.missing.join(", "));
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
    console.log("   → Keep in REVIEW_READY state for staff");
  } else if (decision.decision === "remediate") {
    console.log("   🔧 REMEDIATE: Fixable issues identified");
    console.log("   → Send back for improvement (enrichment needed)");
    console.log("\n   💡 Improvement actions:");
    console.log("      1. Expand description to >150 characters with details about:");
    console.log("         - Training programs offered");
    console.log("         - Coach qualifications");
    console.log("         - Facilities and equipment");
    console.log("      2. Add at least 1 image showing:");
    console.log("         - Training facilities");
    console.log("         - Coaches in action");
    console.log("         - Tennis courts");
    console.log("      3. Add schedule information (required for sportolok)");
    console.log("      4. Add specific address (street, building number)");
    console.log("      5. Add geocode coordinates");
  }
}

function scenario3_FindNewOpportunity() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 SCENARIO 3: Find New Listing Opportunity (Coverage Gap)");
  console.log("=".repeat(80) + "\n");

  // Simulate existing catalog
  const existingCatalog = [
    { category: "football", count: 25 },
    { category: "basketball", count: 12 },
    { category: "tennis", count: 8 },
    { category: "swimming", count: 5 },
    { category: "martial-arts", count: 2 }, // UNDERSERVED!
  ];

  console.log("📊 Current Catalog Coverage:");
  existingCatalog.forEach((cat) => {
    const status = cat.count < 3 ? "⚠️  UNDERSERVED" : cat.count < 10 ? "⚙️  GROWING" : "✅ GOOD";
    console.log(`   ${cat.category}: ${cat.count} listings ${status}`);
  });

  console.log("\n🔍 Coverage Gap Analysis:");
  console.log("   ⚠️  martial-arts has only 2 listings (threshold: 3)");
  console.log("   💡 HIGH PRIORITY: New martial arts listings will get priority scoring\n");

  // Calculate priority for a new listing in gap category
  console.log("💡 Opportunity Score for New Martial Arts Listing:");

  const newListing: Listing = {
    id: "l-martial-arts-dojo-budapest",
    name: "Budapest Martial Arts Dojo",
    category: "martial-arts",
    description: "Professional martial arts training including judo, karate, and taekwondo. Our experienced instructors provide age-appropriate classes for children, teenagers, and adults. We focus on discipline, respect, and self-defense skills while building physical fitness and confidence. Classes available weekdays and weekends.",
    images: [
      { url: "https://example.com/dojo1.jpg", alt: "Training hall" },
      { url: "https://example.com/dojo2.jpg", alt: "Class in session" },
    ],
    geocode: { lat: 47.5, lng: 19.05 },
    address: {
      addressLine1: "Harcművészet utca 5",
      locality: "Budapest",
      countryCode: "HU",
    },
    schedule: {
      freeform: "Hétfő, Szerda, Péntek: 17:00-20:00",
    },
    vertical: "sportolok",
    lifecycleState: "REVIEW_READY",
    sourcePool: "research",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Simulate existing martial arts listings (only 2)
  const existingMartialArts: Listing[] = [
    { ...newListing, id: "l-existing-ma-1", createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { ...newListing, id: "l-existing-ma-2", createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  ];

  // Build coverage gap map - martial arts is VERY underserved
  const coverageGaps = new Map<string, number>();
  coverageGaps.set("martial-arts", 0.95); // Only 2 listings = huge gap!

  // Build demand signals map
  const demandSignals = new Map<string, number>();
  demandSignals.set("martial-arts", 0.5); // Moderate demand

  const priority = calculateDeliveryPriority(newListing, {
    config: sovereignConfig,
    coverageGaps,
    demandSignals,
    publishedAt: new Date(newListing.createdAt),
  });

  console.log("   Priority Score:", priority.score.toFixed(1), "/ 100");
  console.log("   Coverage Gap:", (priority.factors.coverageGap * 100).toFixed(1) + "% ⭐ (45% weight)");
  console.log("   Completeness:", (priority.factors.completeness * 100).toFixed(1) + "% (25% weight)");
  console.log("   Demand:", (priority.factors.demand * 100).toFixed(1) + "% (20% weight)");
  console.log("   Newness:", (priority.factors.newness * 100).toFixed(1) + "% (10% weight)");

  console.log("\n   ⭐ HIGH PRIORITY due to coverage gap!");
  console.log("   → This listing fills an underserved category");
  console.log("   → Will be promoted ahead of redundant content");

  // Evaluate quality
  const decision = evaluateListing(newListing, sovereignConfig);
  console.log("\n🤖 Quality Evaluation:");
  console.log("   Decision:", decision.decision.toUpperCase());
  console.log("   Confidence:", (decision.confidence * 100).toFixed(1) + "%");

  if (decision.decision === "approve") {
    console.log("\n   ✅ READY FOR PUBLICATION");
    console.log("   ✅ Meets all quality gates");
    console.log("   ✅ Fills coverage gap");
    console.log("   ✅ High priority score");
    console.log("\n   💡 Action: Publish immediately and promote heavily");
  }

  console.log("\n📈 Recommendation:");
  console.log("   🔍 Search for more martial-arts listings:");
  console.log("      - Judo schools");
  console.log("      - Karate dojos");
  console.log("      - Taekwondo clubs");
  console.log("      - Mixed martial arts gyms");
  console.log("      - Self-defense classes");
  console.log("   🎯 Target: Bring martial-arts to 10+ listings for balanced coverage");
}

function main() {
  console.log("🚀 Sovereign Content System - Demo with Simulated Scenarios");
  console.log("================================================\n");
  
  console.log("Vertical: sportolok (Hungarian Sport Directory)");
  console.log("Sovereign Agent: ENABLED");
  console.log("Autonomy Threshold: 95%");
  console.log("Allowed Decisions: quality-gate, delivery-priority, content-enrichment, etc.\n");

  scenario1_ExistingPublishedListing();
  scenario2_UnpublishedListing();
  scenario3_FindNewOpportunity();

  console.log("\n" + "=".repeat(80));
  console.log("✅ ALL DEMO SCENARIOS COMPLETE");
  console.log("=".repeat(80) + "\n");

  console.log("📊 Summary:");
  console.log("   1. ✅ Evaluated existing published listing for improvements");
  console.log("      → High quality, meets standards, moderate priority");
  console.log("\n   2. ✅ Assessed unpublished content card");
  console.log("      → Needs remediation (description too short, no images, no schedule)");
  console.log("\n   3. ✅ Identified coverage gap and new opportunity");
  console.log("      → Martial arts UNDERSERVED (only 2 listings)");
  console.log("      → New listings get HIGH PRIORITY (coverage gap factor 45%)");

  console.log("\n💡 Key Insights:");
  console.log("   • Sovereign agent enforces consistent quality standards");
  console.log("   • Delivery optimizer prioritizes coverage gaps (45% weight)");
  console.log("   • Remediate decision provides actionable improvement guidance");
  console.log("   • High-quality gap-filling content gets fastest promotion");
  console.log("   • System learns from staff overrides to improve over time\n");

  console.log("🔧 Next Steps:");
  console.log("   1. Deploy to staging environment");
  console.log("   2. Connect to real MongoDB database");
  console.log("   3. Run with actual sportolok content");
  console.log("   4. Monitor decisions and collect training data");
  console.log("   5. Fine-tune thresholds based on operator feedback\n");
}

main();
