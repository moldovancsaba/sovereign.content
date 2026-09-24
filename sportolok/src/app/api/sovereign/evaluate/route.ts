/**
 * POST /api/sovereign/evaluate — evaluate content through the sovereign agent.
 *
 * WHAT: Submit a listing or content card for autonomous evaluation and decision-making.
 * The agent will assess quality, completeness, and suitability for publication.
 *
 * WHY: Enables external systems (pipeline, cron jobs, admin tools) to leverage the
 * sovereign agent's decision-making capabilities.
 *
 * REQUEST BODY:
 *   {
 *     subjectType: "listing" | "card",
 *     subjectId: string,
 *     decisionType: "publish-approval" | "quality-gate" | ...,
 *     context?: {...}  // optional additional context
 *   }
 *
 * RESPONSE:
 *   {
 *     decision: "approve" | "reject" | "escalate" | "remediate",
 *     confidence: 0-1,
 *     reasoning: string[],
 *     evidence: {...},
 *     shouldAutonomize: boolean  // can this decision be made autonomously?
 *   }
 *
 * Requires: SSO machine token with `management:ingest.write` scope
 */

import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireIngestKey } from "@/lib/requireIngestKey";
import { SCOPE_INGEST_WRITE } from "@/lib/auth/machineToken";
import { getVertical } from "@/lib/vertical/resolve";
import {
  evaluateCard,
  evaluateListing,
  recordDecision,
  DEFAULT_SOVEREIGN_CONFIG,
  type DecisionType,
} from "@/lib/sovereign/agent";

export const dynamic = "force-dynamic";

interface EvaluateRequest {
  subjectType: "listing" | "card";
  subjectId: string;
  decisionType: DecisionType;
  context?: Record<string, any>;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { denied } = await requireIngestKey(req, SCOPE_INGEST_WRITE);
  if (denied) return denied;

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const { pack } = getVertical();
  
  // Get sovereign config from pack, fall back to default
  const sovereignConfig = (pack as any).sovereignAgent || DEFAULT_SOVEREIGN_CONFIG;
  
  if (!sovereignConfig.enabled) {
    return NextResponse.json(
      {
        error: "Sovereign agent not enabled for this vertical",
        vertical: pack.slug,
      },
      { status: 400 },
    );
  }

  // Parse request body
  let body: EvaluateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { subjectType, subjectId, decisionType } = body;

  // Validate decision type is allowed
  if (!sovereignConfig.allowedDecisions.includes(decisionType)) {
    return NextResponse.json(
      {
        error: `Decision type '${decisionType}' not allowed for this vertical`,
        allowedTypes: sovereignConfig.allowedDecisions,
      },
      { status: 400 },
    );
  }

  // Fetch the subject
  let subject: any;
  if (subjectType === "listing") {
    const listingsCollection = db.collection("listings");
    subject = await listingsCollection.findOne({ id: subjectId });
    if (!subject) {
      return NextResponse.json(
        { error: `Listing ${subjectId} not found` },
        { status: 404 },
      );
    }
  } else if (subjectType === "card") {
    const cardsCollection = db.collection("content_cards");
    subject = await cardsCollection.findOne({ id: subjectId });
    if (!subject) {
      return NextResponse.json(
        { error: `Content card ${subjectId} not found` },
        { status: 404 },
      );
    }
  } else {
    return NextResponse.json(
      { error: `Invalid subjectType: ${subjectType}` },
      { status: 400 },
    );
  }

  // Evaluate through the sovereign agent
  const decision = subjectType === "listing"
    ? evaluateListing(subject, sovereignConfig)
    : evaluateCard(subject, sovereignConfig);

  // Record the decision for learning
  await recordDecision(db, decision);

  // Determine if this decision type can be autonomized
  // (Check if we have enough historical data with high agreement)
  const decisionsCollection = db.collection("sovereign_decisions");
  const historicalCount = await decisionsCollection.countDocuments({
    vertical: pack.slug,
    decisionType,
  });

  const shouldAutonomize =
    historicalCount >= sovereignConfig.learning.minSampleSize &&
    decision.confidence >= sovereignConfig.autonomyThreshold;

  return NextResponse.json({
    decisionId: decision.id,
    subjectId: decision.subjectId,
    subjectType: decision.subjectType,
    decisionType: decision.decisionType,
    decision: decision.decision,
    confidence: decision.confidence,
    reasoning: decision.reasoning,
    evidence: decision.evidence,
    timestamp: decision.timestamp.toISOString(),
    shouldAutonomize,
    metadata: {
      vertical: pack.slug,
      historicalDecisions: historicalCount,
      autonomyThreshold: sovereignConfig.autonomyThreshold,
      learningEnabled: sovereignConfig.learning.enabled,
    },
  });
}
