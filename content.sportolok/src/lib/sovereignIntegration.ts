/**
 * Sovereign Agent Pipeline Integration — autonomous decision-making in the content cycle.
 *
 * WHAT: Integrates the sovereign agent's decision framework into the pipeline cycle,
 * enabling autonomous quality evaluation and publication decisions for verticals that
 * configure it.
 *
 * WHY: The pipeline needs intelligent, consistent quality gates that can:
 *   - Evaluate content automatically against quality standards
 *   - Make publication decisions with confidence scoring
 *   - Learn from staff overrides to improve accuracy
 *   - Escalate uncertain decisions to human review
 *
 * INTEGRATION POINTS:
 *   1. After extraction (EXTRACTED state) — evaluate content quality
 *   2. After publish gate (PUBLISH_PREFLIGHT_READY) — make publication decision
 *   3. Before REVIEW_READY — record escalation decisions
 *
 * SAFETY: The sovereign agent is:
 *   - Optional per vertical (enabled via pack.sovereignAgent)
 *   - Conservative by default (escalate when uncertain)
 *   - Audited completely (every decision logged)
 *   - Staff-supervised (overrides recorded and learned from)
 */

import type { Db } from "mongodb";
import type { ContentCard } from "./cards";
import type { VerticalPack } from "@/lib/vertical/pack";
import {
  evaluateCard,
  recordDecision,
  type SovereignAgentConfig,
  type SovereignDecision,
} from "@/lib/sovereign/agent";

/**
 * Check if the sovereign agent is enabled for this vertical.
 */
export function isSovereignAgentEnabled(pack: VerticalPack): boolean {
  const config = (pack as any).sovereignAgent as SovereignAgentConfig | undefined;
  return config?.enabled === true;
}

/**
 * Get the sovereign agent configuration for this vertical.
 * Returns undefined if not configured.
 */
export function getSovereignConfig(pack: VerticalPack): SovereignAgentConfig | undefined {
  if (!isSovereignAgentEnabled(pack)) return undefined;
  return (pack as any).sovereignAgent as SovereignAgentConfig;
}

/**
 * Evaluate a content card through the sovereign agent.
 * Returns the decision or undefined if sovereign agent is disabled.
 */
export async function evaluateThroughSovereign(
  db: Db,
  card: ContentCard,
  pack: VerticalPack,
): Promise<SovereignDecision | undefined> {
  const config = getSovereignConfig(pack);
  if (!config) return undefined;

  // Check if quality-gate decision is allowed
  if (!config.allowedDecisions.includes("quality-gate")) {
    return undefined;
  }

  // Evaluate the card
  const decision = evaluateCard(card, config);

  // Record the decision for audit and learning
  await recordDecision(db, decision);

  return decision;
}

/**
 * Determine if a card should be auto-published based on sovereign agent decision.
 *
 * Returns:
 *   - true: Auto-publish (agent approved with high confidence)
 *   - false: Send to REVIEW_READY (escalate, remediate, or reject)
 *   - undefined: No sovereign agent decision (fall through to normal flow)
 */
export function shouldAutoPublish(decision: SovereignDecision | undefined): boolean | undefined {
  if (!decision) return undefined;

  // Only "approve" with high confidence auto-publishes
  if (decision.decision === "approve" && decision.confidence >= 0.95) {
    return true;
  }

  // Everything else goes to review:
  // - "reject": Staff should confirm rejection
  // - "escalate": Needs human decision
  // - "remediate": Needs human to fix or approve as-is
  return false;
}

/**
 * Get the reason string for a sovereign agent decision routing.
 */
export function sovereignDecisionReason(decision: SovereignDecision): string {
  if (decision.decision === "approve") {
    return `sovereign: approved (confidence ${decision.confidence.toFixed(2)})`;
  }

  if (decision.decision === "reject") {
    const flags = decision.evidence.flags.join(", ");
    return `sovereign: rejected (${flags})`;
  }

  if (decision.decision === "escalate") {
    return `sovereign: escalated for review (confidence ${decision.confidence.toFixed(2)})`;
  }

  if (decision.decision === "remediate") {
    const flags = decision.evidence.flags.join(", ");
    return `sovereign: fixable issues (${flags})`;
  }

  return `sovereign: ${decision.decision}`;
}

/**
 * Pipeline integration: Evaluate card and determine routing.
 *
 * Call this after extraction and before the normal publish-gate flow.
 * Returns an object indicating how to route the card:
 *
 * - shouldPublish: true if sovereign agent approved for auto-publish
 * - shouldReview: true if sovereign agent escalated to human review
 * - reason: Human-readable reason for the routing decision
 * - decision: The full sovereign decision object
 *
 * If sovereign agent is disabled or not configured, returns undefined.
 */
export async function evaluateAndRoute(
  db: Db,
  card: ContentCard,
  pack: VerticalPack,
): Promise<
  | {
      shouldPublish: boolean;
      shouldReview: boolean;
      reason: string;
      decision: SovereignDecision;
    }
  | undefined
> {
  const decision = await evaluateThroughSovereign(db, card, pack);
  if (!decision) return undefined;

  const autoPublish = shouldAutoPublish(decision);

  return {
    shouldPublish: autoPublish === true,
    shouldReview: autoPublish === false,
    reason: sovereignDecisionReason(decision),
    decision,
  };
}

/**
 * Check if a decision type is allowed for this vertical.
 */
export function isDecisionTypeAllowed(
  pack: VerticalPack,
  decisionType: string,
): boolean {
  const config = getSovereignConfig(pack);
  if (!config) return false;
  return config.allowedDecisions.includes(decisionType as any);
}

/**
 * Get statistics about sovereign agent usage for monitoring.
 */
export async function getSovereignStats(
  db: Db,
  vertical: string,
  hours: number = 24,
): Promise<{
  totalDecisions: number;
  approved: number;
  rejected: number;
  escalated: number;
  remediated: number;
  avgConfidence: number;
}> {
  const cutoff = new Date(Date.now() - hours * 3600000);

  const decisions = await db
    .collection("sovereign_decisions")
    .find({
      vertical,
      timestamp: { $gte: cutoff },
    })
    .toArray();

  if (decisions.length === 0) {
    return {
      totalDecisions: 0,
      approved: 0,
      rejected: 0,
      escalated: 0,
      remediated: 0,
      avgConfidence: 0,
    };
  }

  const approved = decisions.filter((d) => d.decision === "approve").length;
  const rejected = decisions.filter((d) => d.decision === "reject").length;
  const escalated = decisions.filter((d) => d.decision === "escalate").length;
  const remediated = decisions.filter((d) => d.decision === "remediate").length;

  const totalConfidence = decisions.reduce(
    (sum, d) => sum + (d.confidence || 0),
    0,
  );
  const avgConfidence = totalConfidence / decisions.length;

  return {
    totalDecisions: decisions.length,
    approved,
    rejected,
    escalated,
    remediated,
    avgConfidence,
  };
}
