/**
 * Sovereign Agent — autonomous content delivery and management intelligence for sportolok.
 *
 * WHAT: An agentic system that autonomously manages content lifecycle decisions, delivery
 * optimization, and quality control without human intervention. Each vertical instance can
 * configure its own sovereign agent with custom policies, thresholds, and decision rules.
 *
 * WHY: sportolok (and other verticals) need autonomous content management that can:
 *   - Evaluate content quality and completeness in real-time
 *   - Make publication decisions based on configurable quality gates
 *   - Optimize content delivery based on audience and performance metrics
 *   - Auto-remediate common content issues (missing descriptions, poor images, etc.)
 *   - Learn from operator overrides to improve decision-making
 *
 * ARCHITECTURE:
 *   - Each vertical can declare `sovereignAgent?: SovereignAgentConfig` in its pack
 *   - The agent runs as part of the content pipeline (cycle.ts)
 *   - Decisions are logged to `sovereign_decisions` collection for audit/learning
 *   - Machine learning models can be trained from historical decisions
 *
 * RULE: The agent SUGGESTS, staff DECIDES until confidence threshold is reached.
 * Only when the agent has 95%+ agreement with staff overrides does it gain autonomy
 * for that decision type.
 */

import type { Listing } from "@/lib/entity/listing";
import type { ContentCard } from "@/lib/pipeline/cards";
import { scoreDescriptionQuality } from "@/lib/catalogHygiene/descriptionQuality";

/**
 * Decision types the sovereign agent can make autonomously.
 * Each type tracks its own confidence and learning history.
 */
export type DecisionType =
  | "publish-approval"      // Should this content be published?
  | "quality-gate"          // Does this meet quality standards?
  | "content-enrichment"    // What enrichments are needed?
  | "delivery-priority"     // How urgent is this content?
  | "audience-targeting"    // Who should see this?
  | "image-selection"       // Which image is best?
  | "description-quality"   // Is this description adequate?
  | "pricing-completeness"  // Is pricing info sufficient?
  | "schedule-validation"   // Are schedule details correct?
  | "geo-accuracy";         // Is location data accurate?

/**
 * A decision the sovereign agent made, with full audit trail.
 */
export interface SovereignDecision {
  id: string;
  timestamp: Date;
  vertical: string;
  decisionType: DecisionType;
  
  /** The content being decided on */
  subjectId: string;
  subjectType: "listing" | "card" | "image" | "description";
  
  /** The agent's decision */
  decision: "approve" | "reject" | "escalate" | "remediate";
  confidence: number; // 0-1, how confident is the agent
  reasoning: string[];
  
  /** Evidence that led to this decision */
  evidence: {
    factorScores: Record<string, number>;
    thresholds: Record<string, number>;
    flags: string[];
  };
  
  /** Human override, if any */
  override?: {
    staffEmail: string;
    overrideDecision: "approve" | "reject";
    overrideReason: string;
    overrideTimestamp: Date;
  };
  
  /** Learning: did this decision prove correct? */
  outcome?: {
    wasCorrect: boolean;
    feedbackTimestamp: Date;
    feedbackSource: "staff-override" | "user-engagement" | "automated-metric";
  };
}

/**
 * Configuration for the sovereign agent, declared in a Vertical Pack.
 */
export interface SovereignAgentConfig {
  /** Is the agent enabled for this vertical? */
  enabled: boolean;
  
  /** Decision types this agent is allowed to make */
  allowedDecisions: DecisionType[];
  
  /** Minimum confidence to act autonomously (0-1). Below this, escalate to staff. */
  autonomyThreshold: number;
  
  /** Quality gates and thresholds */
  qualityGates: {
    minDescriptionLength: number;
    minImageCount: number;
    requiresSchedule: boolean;
    requiresPricing: boolean;
    requiresGeocode: boolean;
  };
  
  /** Delivery optimization rules */
  deliveryRules: {
    priorityFactors: Array<{
      factor: "newness" | "completeness" | "demand" | "coverage-gap";
      weight: number;
    }>;
    maxPublishRate: number; // listings per hour, to prevent flood
  };
  
  /** Learning configuration */
  learning: {
    enabled: boolean;
    minSampleSize: number; // minimum decisions before learning kicks in
    retrainingFrequency: "daily" | "weekly" | "monthly";
  };
}

/**
 * The default sovereign agent configuration — conservative, staff-assisted.
 * sportolok (or any vertical) can override this in their pack.
 */
export const DEFAULT_SOVEREIGN_CONFIG: SovereignAgentConfig = {
  enabled: false,
  allowedDecisions: ["quality-gate", "content-enrichment"],
  autonomyThreshold: 0.95,
  qualityGates: {
    minDescriptionLength: 100,
    minImageCount: 1,
    requiresSchedule: true,
    requiresPricing: false,
    requiresGeocode: true,
  },
  deliveryRules: {
    priorityFactors: [
      { factor: "coverage-gap", weight: 0.4 },
      { factor: "completeness", weight: 0.3 },
      { factor: "demand", weight: 0.2 },
      { factor: "newness", weight: 0.1 },
    ],
    maxPublishRate: 50,
  },
  learning: {
    enabled: true,
    minSampleSize: 100,
    retrainingFrequency: "weekly",
  },
};

/**
 * Evaluate a content card through the sovereign agent's decision framework.
 * Pure function: takes config and card, returns decision with reasoning.
 */
export function evaluateCard(
  card: ContentCard,
  config: SovereignAgentConfig,
): SovereignDecision {
  const factors: Record<string, number> = {};
  const flags: string[] = [];
  const reasoning: string[] = [];
  
  // Extract data from rawPayload (ContentCard doesn't have extractedText/extractedImages/venue)
  const payload = card.rawPayload as any;
  
  // Quality gate evaluation (length + visitor usefulness)
  const description = payload?.description || payload?.extractedText?.description || "";
  const about = scoreDescriptionQuality(description);
  if (description.length < config.qualityGates.minDescriptionLength) {
    factors.descriptionLength = description.length / config.qualityGates.minDescriptionLength;
    flags.push("short-description");
    reasoning.push(`Description ${description.length} chars, below ${config.qualityGates.minDescriptionLength} minimum`);
  } else {
    factors.descriptionLength = about.score;
  }
  for (const flag of about.flags) {
    if (!flags.includes(flag)) flags.push(flag);
  }
  if (!about.ok) reasoning.push(...about.reasons);
  
  // Image quality
  const images = payload?.images || payload?.extractedImages || payload?.media || [];
  const imageCount = Array.isArray(images) ? images.length : 0;
  if (imageCount < config.qualityGates.minImageCount) {
    factors.imageCount = imageCount / config.qualityGates.minImageCount;
    flags.push("insufficient-images");
    reasoning.push(`Only ${imageCount} images, need ${config.qualityGates.minImageCount}`);
  } else {
    factors.imageCount = 1.0;
  }
  
  // Schedule requirement
  if (config.qualityGates.requiresSchedule) {
    const schedule = payload?.schedule || payload?.extractedText?.schedule || [];
    const hasSchedule = Array.isArray(schedule) && schedule.length > 0;
    factors.schedule = hasSchedule ? 1.0 : 0.0;
    if (!hasSchedule) {
      flags.push("missing-schedule");
      reasoning.push("No schedule information found");
    }
  }
  
  // Geocoding requirement
  if (config.qualityGates.requiresGeocode) {
    const venue = payload?.venue;
    const geo = venue?.geo || venue?.geocode || payload?.geo || payload?.geocode;
    const hasGeocode = geo?.lat && geo?.lng;
    factors.geocode = hasGeocode ? 1.0 : 0.0;
    if (!hasGeocode) {
      flags.push("missing-geocode");
      reasoning.push("No geographic coordinates");
    }
  }
  
  // Calculate overall confidence score (average of all factors)
  const confidence = Object.values(factors).reduce((sum, v) => sum + v, 0) / Object.keys(factors).length;
  
  // Make decision based on confidence vs threshold
  let decision: "approve" | "reject" | "escalate" | "remediate";
  
  if (confidence >= config.autonomyThreshold) {
    decision = "approve";
    reasoning.push(`Confidence ${confidence.toFixed(2)} meets threshold ${config.autonomyThreshold}`);
  } else if (confidence < 0.5) {
    decision = "reject";
    reasoning.push(`Confidence ${confidence.toFixed(2)} too low, below 0.5 hard floor`);
  } else if (flags.length > 0 && flags.every(f => f !== "missing-geocode")) {
    decision = "remediate";
    reasoning.push(`Fixable issues detected: ${flags.join(", ")}`);
  } else {
    decision = "escalate";
    reasoning.push(`Confidence ${confidence.toFixed(2)} below threshold, needs staff review`);
  }
  
  return {
    id: `sovereign-${card.id}-${Date.now()}`,
    timestamp: new Date(),
    vertical: "sportolok", // TODO: get from context
    decisionType: "quality-gate",
    subjectId: card.id,
    subjectType: "card",
    decision,
    confidence,
    reasoning,
    evidence: {
      factorScores: factors,
      thresholds: {
        autonomy: config.autonomyThreshold,
        hardFloor: 0.5,
      },
      flags,
    },
  };
}

/**
 * Evaluate a published listing for ongoing quality monitoring.
 */
export function evaluateListing(
  listing: Listing,
  config: SovereignAgentConfig,
): SovereignDecision {
  const factors: Record<string, number> = {};
  const flags: string[] = [];
  const reasoning: string[] = [];
  
  // Check description quality (length + visitor usefulness — not architecture fluff)
  const descLength = listing.description?.length || 0;
  const about = scoreDescriptionQuality(listing.description);
  factors.descriptionQuality = Math.min(
    1.0,
    Math.min(descLength / config.qualityGates.minDescriptionLength, about.score),
  );

  if (descLength < config.qualityGates.minDescriptionLength) {
    flags.push("short-description");
    reasoning.push(`Description only ${descLength} chars`);
  }
  for (const flag of about.flags) {
    if (!flags.includes(flag)) flags.push(flag);
  }
  if (!about.ok) {
    reasoning.push(...about.reasons);
  }
  
  // Check image quality (Listing has media array, not images)
  const media = (listing as any).media || [];
  const imageCount = Array.isArray(media) ? media.length : 0;
  factors.imageQuality = Math.min(1.0, imageCount / config.qualityGates.minImageCount);
  
  if (imageCount < config.qualityGates.minImageCount) {
    flags.push("insufficient-images");
    reasoning.push(`Only ${imageCount} images`);
  }
  
  // Check schedule completeness (schedule is an object, not an array)
  const schedule = (listing as any).schedule;
  const hasSchedule = schedule && (
    (Array.isArray(schedule.recurring) && schedule.recurring.length > 0) ||
    (Array.isArray(schedule.sessions) && schedule.sessions.length > 0)
  );
  factors.scheduleCompleteness = hasSchedule ? 1.0 : 0.5; // partial credit if missing
  
  // Check geocode accuracy (venue.geo, not venue.geocode)
  const venue = (listing as any).venue;
  const geo = venue?.geo;
  const hasGeocode = geo?.lat && geo?.lng;
  factors.geoAccuracy = hasGeocode ? 1.0 : 0.0;
  
  if (!hasGeocode) {
    flags.push("missing-geocode");
    reasoning.push("No coordinates");
  }
  
  const confidence = Object.values(factors).reduce((sum, v) => sum + v, 0) / Object.keys(factors).length;
  
  let decision: "approve" | "reject" | "escalate" | "remediate";
  
  if (flags.length === 0) {
    decision = "approve";
    reasoning.push("All quality checks passed");
  } else if (flags.includes("missing-geocode")) {
    decision = "escalate";
    reasoning.push("Critical issue: missing location data");
  } else {
    decision = "remediate";
    reasoning.push(`Fixable quality issues: ${flags.join(", ")}`);
  }
  
  return {
    id: `sovereign-${listing.id}-${Date.now()}`,
    timestamp: new Date(),
    vertical: "sportolok", // TODO: get from context
    decisionType: "quality-gate",
    subjectId: listing.id,
    subjectType: "listing",
    decision,
    confidence,
    reasoning,
    evidence: {
      factorScores: factors,
      thresholds: {
        autonomy: config.autonomyThreshold,
      },
      flags,
    },
  };
}

/**
 * Record a sovereign decision to the audit log (MongoDB collection: sovereign_decisions).
 * This builds the training dataset for the learning system.
 */
export async function recordDecision(
  db: any, // TODO: type properly as Db
  decision: SovereignDecision,
): Promise<void> {
  const collection = db.collection("sovereign_decisions");
  await collection.insertOne({
    ...decision,
    _createdAt: new Date(),
  });
}

/**
 * Record a staff override of an agent decision.
 * This is critical learning signal: when staff disagrees, the agent needs to learn why.
 */
export async function recordOverride(
  db: any,
  decisionId: string,
  override: SovereignDecision["override"],
): Promise<void> {
  const collection = db.collection("sovereign_decisions");
  await collection.updateOne(
    { id: decisionId },
    {
      $set: {
        override,
        _overrideAt: new Date(),
      },
    },
  );
}

/**
 * Calculate the agent's accuracy for a given decision type.
 * Returns confidence metrics: agreement rate, false positive rate, etc.
 */
export async function calculateAccuracy(
  db: any,
  vertical: string,
  decisionType: DecisionType,
  minSamples: number = 100,
): Promise<{
  sampleSize: number;
  agreementRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  canAutonomize: boolean;
}> {
  const collection = db.collection("sovereign_decisions");
  
  const decisions = await collection
    .find({
      vertical,
      decisionType,
      override: { $exists: true },
    })
    .toArray();
  
  if (decisions.length < minSamples) {
    return {
      sampleSize: decisions.length,
      agreementRate: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      canAutonomize: false,
    };
  }
  
  let agreements = 0;
  let falsePositives = 0; // agent approved, staff rejected
  let falseNegatives = 0; // agent rejected, staff approved
  
  for (const d of decisions) {
    const agentApproved = d.decision === "approve";
    const staffApproved = d.override.overrideDecision === "approve";
    
    if (agentApproved === staffApproved) {
      agreements++;
    } else if (agentApproved && !staffApproved) {
      falsePositives++;
    } else if (!agentApproved && staffApproved) {
      falseNegatives++;
    }
  }
  
  const agreementRate = agreements / decisions.length;
  const falsePositiveRate = falsePositives / decisions.length;
  const falseNegativeRate = falseNegatives / decisions.length;
  
  return {
    sampleSize: decisions.length,
    agreementRate,
    falsePositiveRate,
    falseNegativeRate,
    canAutonomize: agreementRate >= 0.95, // 95% agreement threshold
  };
}
