/**
 * GET /api/sovereign/status — sovereign agent status and metrics for this vertical.
 *
 * Returns the current state of the sovereign content management system:
 *   - Agent configuration and autonomy levels
 *   - Decision accuracy metrics
 *   - Delivery queue status
 *   - Learning progress
 *
 * Requires: SSO machine token with `management:catalog.read` scope
 */

import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireIngestKey } from "@/lib/requireIngestKey";
import { SCOPE_CATALOG_READ } from "@/lib/auth/machineToken";
import { getVertical } from "@/lib/vertical/resolve";
import { calculateAccuracy, type DecisionType } from "@/lib/sovereign/agent";

export const dynamic = "force-dynamic";

const DECISION_TYPES: DecisionType[] = [
  "publish-approval",
  "quality-gate",
  "content-enrichment",
  "delivery-priority",
  "audience-targeting",
  "image-selection",
  "description-quality",
  "pricing-completeness",
  "schedule-validation",
  "geo-accuracy",
];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { denied } = await requireIngestKey(req, SCOPE_CATALOG_READ);
  if (denied) return denied;

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const { pack } = getVertical();
  
  // Get sovereign agent config from the pack
  const sovereignConfig = (pack as any).sovereignAgent || null;
  
  if (!sovereignConfig || !sovereignConfig.enabled) {
    return NextResponse.json({
      enabled: false,
      message: "Sovereign agent not configured for this vertical",
      vertical: pack.slug,
    });
  }

  // Calculate accuracy metrics for each decision type
  const accuracyMetrics: Record<string, any> = {};
  
  for (const decisionType of DECISION_TYPES) {
    if (sovereignConfig.allowedDecisions.includes(decisionType)) {
      const metrics = await calculateAccuracy(
        db,
        pack.slug,
        decisionType,
        sovereignConfig.learning.minSampleSize,
      );
      accuracyMetrics[decisionType] = metrics;
    }
  }

  // Get recent decisions
  const decisionsCollection = db.collection("sovereign_decisions");
  const recentDecisions = await decisionsCollection
    .find({ vertical: pack.slug })
    .sort({ timestamp: -1 })
    .limit(10)
    .project({
      _id: 0,
      id: 1,
      timestamp: 1,
      decisionType: 1,
      decision: 1,
      confidence: 1,
      override: 1,
    })
    .toArray();

  // Decision counts by type
  const decisionCounts = await decisionsCollection
    .aggregate([
      { $match: { vertical: pack.slug } },
      { $group: { _id: "$decisionType", count: { $sum: 1 } } },
    ])
    .toArray();

  // Override rate (how often staff disagrees with agent)
  const totalDecisions = await decisionsCollection.countDocuments({
    vertical: pack.slug,
  });
  const overriddenDecisions = await decisionsCollection.countDocuments({
    vertical: pack.slug,
    override: { $exists: true },
  });
  const overrideRate = totalDecisions > 0 ? overriddenDecisions / totalDecisions : 0;

  // Delivery queue status
  const listings = db.collection("listings");
  const deliveryStats = await listings
    .aggregate([
      {
        $match: {
          lifecycleState: "PUBLISHED",
          "delivery.priority": { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          avgPriority: { $avg: "$delivery.priority" },
          maxPriority: { $max: "$delivery.priority" },
          minPriority: { $min: "$delivery.priority" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const deliveryQueueStatus = deliveryStats[0] || {
    avgPriority: 0,
    maxPriority: 0,
    minPriority: 0,
    count: 0,
  };

  return NextResponse.json({
    enabled: true,
    vertical: pack.slug,
    generatedAt: new Date().toISOString(),
    configuration: {
      allowedDecisions: sovereignConfig.allowedDecisions,
      autonomyThreshold: sovereignConfig.autonomyThreshold,
      qualityGates: sovereignConfig.qualityGates,
      deliveryRules: sovereignConfig.deliveryRules,
      learning: sovereignConfig.learning,
    },
    metrics: {
      totalDecisions,
      overrideRate,
      accuracyByType: accuracyMetrics,
      decisionCounts: Object.fromEntries(
        decisionCounts.map(d => [d._id, d.count]),
      ),
    },
    recentDecisions,
    deliveryQueue: {
      itemsQueued: deliveryQueueStatus.count,
      avgPriority: Math.round(deliveryQueueStatus.avgPriority || 0),
      priorityRange: {
        min: deliveryQueueStatus.minPriority || 0,
        max: deliveryQueueStatus.maxPriority || 0,
      },
    },
  });
}
