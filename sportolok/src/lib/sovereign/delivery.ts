/**
 * Sovereign Content Delivery — intelligent, adaptive content distribution for sportolok.
 *
 * WHAT: An autonomous delivery system that optimizes how and when content reaches users,
 * based on real-time audience behavior, content quality, and strategic coverage goals.
 *
 * WHY: Not all content should be delivered the same way:
 *   - New listings in coverage gaps deserve priority
 *   - High-demand categories need fresher content
 *   - Quality content earns better placement
 *   - User engagement patterns drive delivery timing
 *
 * ARCHITECTURE:
 *   - Runs as a scheduled job (cron) or real-time on publish
 *   - Reads from `listings` collection, writes to `delivery_queue`
 *   - Maintains delivery metadata: priority score, next delivery window, audience segments
 *   - Integrates with the sovereign agent for quality signals
 */

import type { Listing } from "@/lib/entity/listing";
import type { SovereignAgentConfig } from "./agent";

/**
 * Delivery priority score: 0-100, higher = more urgent to show users.
 */
export interface DeliveryPriority {
  listingId: string;
  score: number;
  factors: {
    coverageGap: number;    // 0-1, is this filling an empty spot?
    completeness: number;   // 0-1, how complete is the content?
    demand: number;         // 0-1, how much are users asking for this?
    newness: number;        // 0-1, how recently published?
    engagement: number;     // 0-1, historical user interest
  };
  computedAt: Date;
  expiresAt: Date; // recompute after this
}

/**
 * Delivery window: when should this content be promoted to users?
 */
export interface DeliveryWindow {
  listingId: string;
  windows: Array<{
    start: Date;
    end: Date;
    priority: "high" | "medium" | "low";
    audienceSegment?: string[]; // e.g. ["ovodas", "also-tagozat"] for age bands
  }>;
}

/**
 * Audience segment: a slice of users who should see specific content.
 */
export interface AudienceSegment {
  id: string;
  name: string;
  criteria: {
    ageBands?: string[];
    categories?: string[];
    locations?: string[];
    interests?: string[];
  };
  size: number; // estimated users
}

/**
 * Calculate delivery priority for a listing based on configured rules.
 */
export function calculateDeliveryPriority(
  listing: Listing,
  context: {
    config: SovereignAgentConfig;
    coverageGaps: Map<string, number>; // category -> gap score
    demandSignals: Map<string, number>; // category -> demand score
    publishedAt: Date;
  },
): DeliveryPriority {
  const factors = {
    coverageGap: 0,
    completeness: 0,
    demand: 0,
    newness: 0,
    engagement: 0,
  };
  
  // Coverage gap: is this listing filling an empty spot?
  const category = listing.activityTypes?.[0];
  if (category && context.coverageGaps.has(category)) {
    factors.coverageGap = context.coverageGaps.get(category) || 0;
  }
  
  // Completeness: how complete is this listing?
  const hasDescription = ((listing as any).description?.length || 0) >= context.config.qualityGates.minDescriptionLength;
  const media = (listing as any).media || [];
  const hasImages = (Array.isArray(media) ? media.length : 0) >= context.config.qualityGates.minImageCount;
  const schedule = (listing as any).schedule;
  const hasSchedule = schedule && (
    (Array.isArray(schedule.recurring) && schedule.recurring.length > 0) ||
    (Array.isArray(schedule.sessions) && schedule.sessions.length > 0)
  );
  const venue = (listing as any).venue;
  const geo = venue?.geo;
  const hasGeocode = geo?.lat && geo?.lng;
  
  const completenessScore = [hasDescription, hasImages, hasSchedule, hasGeocode]
    .filter(Boolean).length / 4;
  factors.completeness = completenessScore;
  
  // Demand: how much are users asking for this category?
  if (category && context.demandSignals.has(category)) {
    factors.demand = context.demandSignals.get(category) || 0;
  }
  
  // Newness: how recently was this published?
  const ageInDays = (Date.now() - context.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  factors.newness = Math.max(0, 1 - (ageInDays / 30)); // decay over 30 days
  
  // Engagement: placeholder for future user interaction data
  factors.engagement = 0.5; // neutral until we have data
  
  // Weighted score based on delivery rules
  const weights = context.config.deliveryRules.priorityFactors.reduce(
    (acc, f) => ({ ...acc, [f.factor]: f.weight }),
    {} as Record<string, number>,
  );
  
  const score = 
    (factors.coverageGap * (weights["coverage-gap"] || 0)) +
    (factors.completeness * (weights["completeness"] || 0)) +
    (factors.demand * (weights["demand"] || 0)) +
    (factors.newness * (weights["newness"] || 0));
  
  const now = new Date();
  return {
    listingId: listing.id,
    score: Math.round(score * 100), // 0-100 range
    factors,
    computedAt: now,
    expiresAt: new Date(now.getTime() + 3600000), // 1 hour
  };
}

/**
 * Determine optimal delivery windows for a listing based on audience patterns.
 */
export function planDeliveryWindows(
  listing: Listing,
  priority: DeliveryPriority,
): DeliveryWindow {
  const windows: DeliveryWindow["windows"] = [];
  const now = new Date();
  
  // High-priority content: deliver immediately and throughout the day
  if (priority.score >= 75) {
    windows.push({
      start: now,
      end: new Date(now.getTime() + 86400000), // 24 hours
      priority: "high",
    });
  }
  
  // Medium-priority: deliver during peak hours
  if (priority.score >= 50 && priority.score < 75) {
    // Morning peak: 8-10am
    const morning = new Date(now);
    morning.setHours(8, 0, 0, 0);
    windows.push({
      start: morning,
      end: new Date(morning.getTime() + 7200000), // 2 hours
      priority: "medium",
    });
    
    // Evening peak: 6-9pm
    const evening = new Date(now);
    evening.setHours(18, 0, 0, 0);
    windows.push({
      start: evening,
      end: new Date(evening.getTime() + 10800000), // 3 hours
      priority: "medium",
    });
  }
  
  // Low-priority: off-peak only
  if (priority.score < 50) {
    const offPeak = new Date(now);
    offPeak.setHours(14, 0, 0, 0); // 2pm
    windows.push({
      start: offPeak,
      end: new Date(offPeak.getTime() + 3600000), // 1 hour
      priority: "low",
    });
  }
  
  // Add audience targeting based on age bands
  if (listing.ageBands && listing.ageBands.length > 0) {
    windows.forEach(w => {
      w.audienceSegment = listing.ageBands;
    });
  }
  
  return {
    listingId: listing.id,
    windows,
  };
}

/**
 * Create audience segments from the catalog for targeted delivery.
 */
export function deriveAudienceSegments(
  listings: Listing[],
  pack: { ageBands?: Array<{ key: string; label: string }>; taxonomy: Record<string, string> },
): AudienceSegment[] {
  const segments: AudienceSegment[] = [];
  
  // Age-based segments
  if (pack.ageBands) {
    for (const band of pack.ageBands) {
      const relevantListings = listings.filter(l => l.ageBands?.includes(band.key));
      segments.push({
        id: `age-${band.key}`,
        name: band.label,
        criteria: { ageBands: [band.key] },
        size: relevantListings.length * 50, // rough estimate: 50 users per listing
      });
    }
  }
  
  // Category-based segments
  for (const [slug, label] of Object.entries(pack.taxonomy)) {
    const relevantListings = listings.filter(l => l.activityTypes?.includes(slug));
    segments.push({
      id: `category-${slug}`,
      name: label,
      criteria: { categories: [slug] },
      size: relevantListings.length * 40,
    });
  }
  
  // Location-based segments (by settlement)
  const settlements = new Set<string>();
  listings.forEach(l => {
    const venue = (l as any).venue;
    const settlement = venue?.address?.territory?.settlement || venue?.address?.locality;
    if (settlement) {
      settlements.add(settlement);
    }
  });
  
  for (const settlement of settlements) {
    const relevantListings = listings.filter(l => {
      const venue = (l as any).venue;
      const s = venue?.address?.territory?.settlement || venue?.address?.locality;
      return s === settlement;
    });
    segments.push({
      id: `location-${settlement}`,
      name: settlement,
      criteria: { locations: [settlement] },
      size: relevantListings.length * 30,
    });
  }
  
  return segments;
}

/**
 * Rate limiter: ensure we don't flood users with too many new listings at once.
 */
export class DeliveryRateLimiter {
  private publishedThisHour: number = 0;
  private hourStartTime: number = Date.now();
  
  constructor(private maxPerHour: number) {}
  
  canPublish(): boolean {
    const now = Date.now();
    const hourElapsed = now - this.hourStartTime;
    
    // Reset counter if an hour has passed
    if (hourElapsed >= 3600000) {
      this.publishedThisHour = 0;
      this.hourStartTime = now;
    }
    
    return this.publishedThisHour < this.maxPerHour;
  }
  
  recordPublish(): void {
    this.publishedThisHour++;
  }
  
  getRemaining(): number {
    return Math.max(0, this.maxPerHour - this.publishedThisHour);
  }
}

/**
 * Content delivery queue: orders listings by priority for the next delivery batch.
 */
export async function buildDeliveryQueue(
  db: any,
  config: SovereignAgentConfig,
  batchSize: number = 50,
): Promise<DeliveryPriority[]> {
  const listings = db.collection("listings");
  
  // Fetch recent listings that need prioritization
  const recentListings = await listings
    .find({
      lifecycleState: "PUBLISHED",
      "delivery.lastPrioritized": {
        $not: { $gt: new Date(Date.now() - 3600000) }, // not prioritized in last hour
      },
    })
    .limit(batchSize * 2) // over-fetch to account for filtering
    .toArray();
  
  // TODO: fetch coverage gaps and demand signals from analytics
  const coverageGaps = new Map<string, number>();
  const demandSignals = new Map<string, number>();
  
  // Calculate priorities
  const priorities = recentListings.map(listing =>
    calculateDeliveryPriority(listing, {
      config,
      coverageGaps,
      demandSignals,
      publishedAt: listing.publishedAt || listing.createdAt,
    }),
  );
  
  // Sort by score descending
  priorities.sort((a, b) => b.score - a.score);
  
  // Take top N
  return priorities.slice(0, batchSize);
}

/**
 * Apply delivery priorities to the database.
 */
export async function applyDeliveryPriorities(
  db: any,
  priorities: DeliveryPriority[],
): Promise<void> {
  const listings = db.collection("listings");
  const bulk = listings.initializeUnorderedBulkOp();
  
  for (const priority of priorities) {
    bulk.find({ id: priority.listingId }).updateOne({
      $set: {
        "delivery.priority": priority.score,
        "delivery.factors": priority.factors,
        "delivery.lastPrioritized": priority.computedAt,
        "delivery.priorityExpiresAt": priority.expiresAt,
      },
    });
  }
  
  if (bulk.length > 0) {
    await bulk.execute();
  }
}
