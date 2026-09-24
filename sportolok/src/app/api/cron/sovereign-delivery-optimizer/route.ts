/**
 * Cron Job: Sovereign Delivery Optimizer — autonomous content priority and delivery scheduling.
 *
 * WHAT: Runs every hour to recalculate delivery priorities for published listings based on
 * coverage gaps, demand signals, content completeness, and engagement patterns.
 *
 * WHY: Content delivery should be intelligent and adaptive:
 *   - New listings in coverage gaps deserve higher priority
 *   - High-demand categories need fresher content rotation
 *   - Complete, quality content earns better placement
 *   - User engagement patterns inform delivery timing
 *
 * SCHEDULE: Hourly (0 * * * *) — frequent enough to respond to new content and demand shifts,
 * infrequent enough to avoid churning priorities constantly.
 *
 * MECHANISM:
 *   1. Fetch published listings that need reprioritization (> 1 hour since last)
 *   2. Calculate priority scores using sovereign agent's delivery rules
 *   3. Plan delivery windows based on audience patterns
 *   4. Write priority metadata to listings collection
 *   5. Record metrics to sovereign_delivery_metrics collection
 *
 * SAFETY: Read-only on listings content, writes only delivery metadata (priority, windows).
 * Rate limited by maxPublishRate config to prevent overwhelming users.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getVertical } from "@/lib/vertical/resolve";
import {
  buildDeliveryQueue,
  applyDeliveryPriorities,
  deriveAudienceSegments,
} from "@/lib/sovereign/delivery";
import { DEFAULT_SOVEREIGN_CONFIG } from "@/lib/sovereign/agent";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  const db = await getDb();
  if (!db) {
    return NextResponse.json(
      { error: "database unavailable" },
      { status: 503 },
    );
  }

  const { pack } = getVertical();
  
  // Get sovereign config from pack
  const sovereignConfig = (pack as any).sovereignAgent || DEFAULT_SOVEREIGN_CONFIG;
  
  if (!sovereignConfig.enabled) {
    return NextResponse.json({
      skipped: true,
      reason: "Sovereign agent not enabled for this vertical",
      vertical: pack.slug,
    });
  }

  try {
    // Build delivery queue with current priorities
    const batchSize = 100; // Process 100 listings per run
    const priorities = await buildDeliveryQueue(db, sovereignConfig, batchSize);
    
    // Apply priorities to database
    await applyDeliveryPriorities(db, priorities);
    
    // Derive audience segments for targeting
    const listingsCollection = db.collection("listings");
    const recentListings = await listingsCollection
      .find({ lifecycleState: "PUBLISHED" })
      .limit(500)
      .toArray();
    
    const segments = deriveAudienceSegments(recentListings as any, pack as any);
    
    // Record metrics
    const metricsCollection = db.collection("sovereign_delivery_metrics");
    await metricsCollection.insertOne({
      vertical: pack.slug,
      timestamp: new Date(),
      executionTimeMs: Date.now() - startTime,
      listingsProcessed: priorities.length,
      priorityDistribution: {
        high: priorities.filter(p => p.score >= 75).length,
        medium: priorities.filter(p => p.score >= 50 && p.score < 75).length,
        low: priorities.filter(p => p.score < 50).length,
      },
      avgPriority: priorities.reduce((sum, p) => sum + p.score, 0) / priorities.length,
      maxPriority: Math.max(...priorities.map(p => p.score)),
      minPriority: Math.min(...priorities.map(p => p.score)),
      audienceSegments: segments.length,
      config: {
        batchSize,
        maxPublishRate: sovereignConfig.deliveryRules.maxPublishRate,
      },
    });
    
    // Calculate coverage gaps for next run
    const coverageGaps = new Map<string, number>();
    for (const [slug, label] of Object.entries(pack.taxonomy)) {
      const categoryCount = recentListings.filter(l => 
        l.activityTypes?.includes(slug),
      ).length;
      
      // Gap score: inversely proportional to supply
      // 0 listings = 1.0 gap, 10+ listings = 0.0 gap
      const gapScore = Math.max(0, 1 - (categoryCount / 10));
      if (gapScore > 0) {
        coverageGaps.set(slug, gapScore);
      }
    }
    
    return NextResponse.json({
      success: true,
      vertical: pack.slug,
      timestamp: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime,
      results: {
        listingsProcessed: priorities.length,
        priorityDistribution: {
          high: priorities.filter(p => p.score >= 75).length,
          medium: priorities.filter(p => p.score >= 50 && p.score < 75).length,
          low: priorities.filter(p => p.score < 50).length,
        },
        avgPriority: Math.round(
          priorities.reduce((sum, p) => sum + p.score, 0) / priorities.length,
        ),
        audienceSegments: segments.length,
        coverageGaps: Object.fromEntries(coverageGaps),
      },
    });
  } catch (error) {
    console.error("[sovereign-delivery-optimizer] Error:", error);
    return NextResponse.json(
      {
        error: "Sovereign delivery optimizer failed",
        message: error instanceof Error ? error.message : String(error),
        vertical: pack.slug,
      },
      { status: 500 },
    );
  }
}
