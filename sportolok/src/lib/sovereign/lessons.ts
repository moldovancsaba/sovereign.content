/**
 * Quality lessons and recommendations — learned patterns from catalog jobs.
 *
 * SSOT contract: https://sovereigncontent.messmass.com/jobs#catalogquality-loop
 *
 * This module defines:
 *   - QualityLesson: Learned patterns from quality-loop scoring (e.g., "TOO_SHORT appears in 20% of listings")
 *   - QualityRecommendation: Actionable tasks created from feedback/lessons/overrides (e.g., "Improve description for listing X")
 *
 * The self-healing loop:
 *   1. Jobs collect feedback (card_feedback, sovereign_decisions, quality verdicts)
 *   2. Processing jobs create recommendations (quality_recommendations)
 *   3. Execution jobs apply recommendations (catalog:quality-loop, catalog:about-curate)
 *   4. Outcomes are recorded → lessons are learned (quality_lessons)
 *   5. Trusted lessons (successRate > 0.8, appliedCount > 20) become automatic rules
 */

/**
 * A learned pattern from quality scoring — what issue appears frequently, and how to fix it.
 */
export interface QualityLesson {
  lessonId: string;
  createdAt: Date;
  vertical: string;

  lessonType: "description-pattern" | "media-pattern" | "geo-pattern" | "contact-pattern" | "schedule-pattern";

  pattern: {
    /** Quality flag that triggered this lesson (e.g., "TOO_SHORT", "INLINE_URL", "ARCHITECTURE_FLUFF") */
    flag: string;
    /** How many times this pattern was observed in one quality-loop run */
    occurrences: number;
    /** Sample listings showing this issue */
    samples: Array<{
      listingId: string;
      name: string;
      context: string; // Snippet showing the issue
    }>;
  };

  /** Human-readable fix (e.g., "Strip phone from description, move to venue.contact.phone") */
  recommendation: string;

  /** Learning metrics — track how well this lesson works */
  appliedCount: number; // How many times this lesson was used
  successCount: number; // How many times it improved quality
  failureCount: number; // How many times it made things worse
  successRate: number; // successCount / appliedCount (0-1)

  /** Status lifecycle: learning → trusted → deprecated */
  status: "learning" | "trusted" | "deprecated";
  promotedAt?: Date; // When promoted to "trusted" (successRate > 0.8, appliedCount > 20)
  deprecatedAt?: Date; // When marked "deprecated" (successRate < 0.3)
  deprecationReason?: string;
}

/**
 * An actionable task created from feedback, lessons, overrides, or errors.
 * These flow into execution jobs (quality-loop, about-curate, etc.) for application.
 */
export interface QualityRecommendation {
  recommendationId: string;
  createdAt: Date;
  vertical: string;

  /** Recommendation lifecycle */
  status: "open" | "in-progress" | "applied" | "rejected" | "expired";
  /** Priority for execution (critical = block publishing, high = next tick, medium = when available, low = best effort) */
  priority: "critical" | "high" | "medium" | "low";

  /** Where this recommendation came from */
  source: "operator-feedback" | "quality-loop" | "override-learning" | "error-pattern" | "source-discovery";
  sourceId?: string; // Link to originating feedback/decision/error

  /** What this recommendation applies to */
  target: {
    type: "listing" | "card" | "config" | "global";
    ids?: string[]; // Specific listings/cards, or undefined for global
  };

  /** What action to take */
  action: {
    type: "improve-description" | "update-config" | "retry-extraction" | "add-source" | "enrich-media" | "fix-geo";
    details: Record<string, unknown>;
    estimatedEffort: "low" | "medium" | "high"; // For prioritization
  };

  /** Execution tracking */
  appliedAt?: Date;
  appliedBy?: "cloud-agent" | string; // Staff email if manual
  outcome?: "success" | "failed" | "partial";
  outcomeDetail?: string;

  /** Auto-expire if not applied within 30 days */
  expiresAt?: Date;
}

/**
 * MongoDB collection names
 */
export const QUALITY_LESSONS_COLLECTION = "quality_lessons";
export const QUALITY_RECOMMENDATIONS_COLLECTION = "quality_recommendations";

/**
 * Helper: Infer lesson type from quality flag.
 */
export function inferLessonType(flag: string): QualityLesson["lessonType"] {
  const upper = flag.toUpperCase();

  if (
    upper.includes("SHORT") ||
    upper.includes("FLUFF") ||
    upper.includes("CHROME") ||
    upper.includes("URL") ||
    upper.includes("PHONE") ||
    upper.includes("EMAIL")
  ) {
    return "description-pattern";
  }

  if (upper.includes("MEDIA") || upper.includes("IMAGE")) {
    return "media-pattern";
  }

  if (upper.includes("GEO") || upper.includes("ADDRESS") || upper.includes("LOCATION")) {
    return "geo-pattern";
  }

  if (upper.includes("CONTACT")) {
    return "contact-pattern";
  }

  if (upper.includes("SCHEDULE") || upper.includes("HOURS") || upper.includes("OPEN")) {
    return "schedule-pattern";
  }

  return "description-pattern"; // default
}

/**
 * Helper: Generate human-readable recommendation from quality flag.
 */
export function generateRecommendation(flag: string): string {
  const recommendations: Record<string, string> = {
    TOO_SHORT: "Expand description to 100+ chars with visitor-focused details (hours, amenities, activities)",
    INLINE_URL: "Remove URLs from description; ensure website field is filled",
    INLINE_PHONE: "Remove phone from description; move to venue.contact.phone",
    INLINE_EMAIL: "Remove email from description; move to venue.contact.email",
    ARCHITECTURE_FLUFF: "Replace architecture awards with visitor experience details (what to do, what to expect)",
    CHROME: "Remove navigation/cookie/form chrome from description",
    TOO_GENERIC: "Add specific details about this venue (not template text)",
    MISSING_SCHEDULE: "Add opening hours from venue website or contact info",
    WEAK_GEO: "Verify address and upgrade geocoding precision",
    NO_MEDIA: "Add images from venue website or OG tags",
    MISSING_PRICE: "Extract pricing info from description or website",
    CONTACT_LEAK: "Move contact details out of About prose into structured fields",
  };

  return recommendations[flag] || `Review and address ${flag} quality issue`;
}

/**
 * Helper: Determine priority for a new recommendation.
 */
export function determinePriority(source: QualityRecommendation["source"], sentiment?: string): QualityRecommendation["priority"] {
  // Operator instructions are high priority
  if (source === "operator-feedback" && sentiment === "instruction") {
    return "high";
  }

  // Negative operator feedback is medium
  if (source === "operator-feedback" && sentiment === "negative") {
    return "medium";
  }

  // Override learning (agent is wrong) is high
  if (source === "override-learning") {
    return "high";
  }

  // Error patterns (jobs failing) are critical
  if (source === "error-pattern") {
    return "critical";
  }

  // Quality-loop patterns are medium
  if (source === "quality-loop") {
    return "medium";
  }

  // Source discovery (nice to have) is low
  if (source === "source-discovery") {
    return "low";
  }

  return "medium"; // default
}

/**
 * Autonomy levels for intelligent execution boundaries.
 * Determines what Cloud Agent can execute immediately vs what needs human review.
 */
export type AutonomyLevel = "AUTO_SAFE" | "AUTO_REVIEWABLE" | "HUMAN_CONFIRM" | "HUMAN_DECIDE";

/**
 * A task with its autonomy classification.
 * Used by catalog:self-heal to decide what to execute vs escalate.
 */
export interface TaskClassification {
  taskId: string;
  taskType: string;
  description: string;

  autonomyLevel: AutonomyLevel;
  reasoning: string; // Why this autonomy level was chosen

  risk: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH";
  reversible: boolean;
  blastRadius: number; // % of listings affected (0-1)

  estimatedTime: string; // Human-readable (e.g., "3 minutes", "1 hour")
  estimatedSuccess: number; // 0-1 (based on lesson successRate or heuristic)

  affectedListings?: string[]; // IDs of listings that will change
  dryRunResults?: unknown; // Results from dry-run if available
}

/**
 * Catalog state for autonomy classification.
 */
export interface CatalogState {
  totalListings: number;
  publishedListings: number;
  emptyMedia: number;
  emptyMediaWithWebsite: number;
  thinDescription: number;
  unprocessedFeedback: number;
}

/**
 * Classify a task's autonomy level using intelligent decision tree.
 *
 * Decision criteria:
 * 1. Config changes → HUMAN_CONFIRM
 * 2. Strategic decisions → HUMAN_DECIDE
 * 3. Unproven patterns (appliedCount < 10) → HUMAN_CONFIRM
 * 4. Low success rate (< 0.7) → HUMAN_CONFIRM
 * 5. Irreversible → HUMAN_CONFIRM
 * 6. Bulk changes (> 20% of listings) → HUMAN_CONFIRM
 * 7. Semantic + proven + reversible + small blast → AUTO_REVIEWABLE
 * 8. Everything else → AUTO_SAFE
 *
 * @param task - The task to classify
 * @param catalogState - Current catalog state (for blast radius calculation)
 * @param lessons - Quality lessons (to check if pattern is proven)
 * @returns TaskClassification with autonomy level and reasoning
 */
export function classifyTaskAutonomy(
  task: {
    type: string;
    affectedCount: number;
    affectsConfig?: boolean;
    isStrategic?: boolean;
    reversible?: boolean;
    changesSemantic?: boolean;
    pattern?: string;
  },
  catalogState: CatalogState,
  lessons: QualityLesson[]
): TaskClassification {
  const blastRadius = task.affectedCount / catalogState.totalListings;

  // 1. Config changes always need approval
  if (task.affectsConfig) {
    return {
      taskId: `task-${Date.now()}`,
      taskType: task.type,
      description: `Config change affecting ${task.affectedCount} listings`,
      autonomyLevel: "HUMAN_CONFIRM",
      reasoning: "Config changes require human approval to prevent unintended side effects",
      risk: "MEDIUM",
      reversible: false, // Config changes are hard to revert
      blastRadius,
      estimatedTime: "1 minute to apply",
      estimatedSuccess: 1.0,
    };
  }

  // 2. Strategic decisions need human input
  if (task.isStrategic) {
    return {
      taskId: `task-${Date.now()}`,
      taskType: task.type,
      description: `Strategic decision: ${task.type}`,
      autonomyLevel: "HUMAN_DECIDE",
      reasoning: "Strategic decisions require human judgment and preference",
      risk: "HIGH",
      reversible: false,
      blastRadius,
      estimatedTime: "30 minutes to decide + implement",
      estimatedSuccess: 0.5, // Unknown
    };
  }

  // 3. Check if pattern is proven
  let lesson: QualityLesson | undefined;
  let isProven = false;
  let successRate = 0;

  if (task.pattern) {
    lesson = lessons.find((l) => l.pattern.flag === task.pattern);
    if (lesson) {
      isProven = lesson.appliedCount >= 10;
      successRate = lesson.successRate;
    }
  }

  // 4. Unproven patterns need approval
  if (task.pattern && !isProven) {
    return {
      taskId: `task-${Date.now()}`,
      taskType: task.type,
      description: `Unproven pattern: ${task.pattern}`,
      autonomyLevel: "HUMAN_CONFIRM",
      reasoning: "Pattern has not been applied enough times (< 10) to trust automatic execution",
      risk: "MEDIUM",
      reversible: task.reversible ?? false,
      blastRadius,
      estimatedTime: "2 minutes per listing",
      estimatedSuccess: 0.5, // Unknown
    };
  }

  // 5. Low success rate needs approval
  if (lesson && successRate < 0.7) {
    return {
      taskId: `task-${Date.now()}`,
      taskType: task.type,
      description: `Risky pattern: ${task.pattern} (${Math.round(successRate * 100)}% success)`,
      autonomyLevel: "HUMAN_CONFIRM",
      reasoning: `Pattern success rate is ${Math.round(successRate * 100)}% (threshold: 70%)`,
      risk: "HIGH",
      reversible: task.reversible ?? false,
      blastRadius,
      estimatedTime: "2 minutes per listing",
      estimatedSuccess: successRate,
    };
  }

  // 6. Irreversible changes need approval
  if (task.reversible === false) {
    return {
      taskId: `task-${Date.now()}`,
      taskType: task.type,
      description: `Irreversible change to ${task.affectedCount} listings`,
      autonomyLevel: "HUMAN_CONFIRM",
      reasoning: "Irreversible changes require human approval to prevent data loss",
      risk: "HIGH",
      reversible: false,
      blastRadius,
      estimatedTime: "1 minute per listing",
      estimatedSuccess: successRate || 0.8,
    };
  }

  // 7. Bulk changes (> 20%) need approval
  if (blastRadius > 0.2) {
    return {
      taskId: `task-${Date.now()}`,
      taskType: task.type,
      description: `Bulk change to ${task.affectedCount} listings (${Math.round(blastRadius * 100)}%)`,
      autonomyLevel: "HUMAN_CONFIRM",
      reasoning: `Affects ${Math.round(blastRadius * 100)}% of listings (threshold: 20%)`,
      risk: "MEDIUM",
      reversible: task.reversible ?? true,
      blastRadius,
      estimatedTime: `${Math.ceil(task.affectedCount / 20)} minutes`,
      estimatedSuccess: successRate || 0.8,
    };
  }

  // 8. Semantic changes: AUTO_REVIEWABLE if proven + reversible + small blast
  if (task.changesSemantic) {
    if (lesson && successRate > 0.8 && task.reversible && task.affectedCount < 50) {
      return {
        taskId: `task-${Date.now()}`,
        taskType: task.type,
        description: `Semantic improvement to ${task.affectedCount} listings`,
        autonomyLevel: "AUTO_REVIEWABLE",
        reasoning: `Proven pattern (${Math.round(successRate * 100)}% success, ${lesson.appliedCount} applications), reversible, small blast radius`,
        risk: "LOW",
        reversible: true,
        blastRadius,
        estimatedTime: `${Math.ceil(task.affectedCount / 10)} minutes`,
        estimatedSuccess: successRate,
      };
    } else {
      return {
        taskId: `task-${Date.now()}`,
        taskType: task.type,
        description: `Semantic change to ${task.affectedCount} listings`,
        autonomyLevel: "HUMAN_CONFIRM",
        reasoning: "Semantic changes need approval unless proven pattern (>80% success, reversible, <50 listings)",
        risk: "MEDIUM",
        reversible: task.reversible ?? true,
        blastRadius,
        estimatedTime: `${Math.ceil(task.affectedCount / 10)} minutes`,
        estimatedSuccess: successRate || 0.7,
      };
    }
  }

  // 9. Everything else is AUTO_SAFE (deterministic, reversible, non-semantic)
  return {
    taskId: `task-${Date.now()}`,
    taskType: task.type,
    description: `Safe operation on ${task.affectedCount} listings`,
    autonomyLevel: "AUTO_SAFE",
    reasoning: "Deterministic, reversible, non-semantic change with no risk",
    risk: "VERY_LOW",
    reversible: true,
    blastRadius,
    estimatedTime: `${Math.ceil(task.affectedCount / 20)} minutes`,
    estimatedSuccess: 0.95, // High confidence for safe operations
  };
}
