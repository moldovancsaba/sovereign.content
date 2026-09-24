/**
 * Listing quality loop — engine-native self-improvement for published cards.
 *
 * Score published listings → record recommendations → apply safe deterministic
 * improvements (especially About) → encode lessons so later scores learn.
 *
 * Distinct from ClassScout's unported `catalog-loop` Find→Improve discovery pipeline
 * (`docs/engine-parity-tracker.md` #221): this loop improves EXISTING published listings'
 * visitor-facing quality, with About prose as the primary target. Deterministic by default
 * (no LLM required); optional curated About overrides load from disk when present.
 */
import { createHash } from "node:crypto";
import { z } from "zod";

export const LISTING_QUALITY_RECOMMENDATIONS = "listing_quality_recommendations";
export const LISTING_QUALITY_LESSONS = "listing_quality_lessons";

export const QUALITY_KINDS = [
  "about_thin",
  "about_chrome",
  "about_template",
  "about_url",
  "about_contact_leak",
  "operator_feedback",
  /** Evidence gaps — open by self-heal debt intake; improve does not invent contacts. */
  "contact_gap",
  "media_thin",
  "geo_weak",
  "research_needed",
] as const;
export type QualityKind = (typeof QUALITY_KINDS)[number];

export const QUALITY_STATUSES = ["open", "applied", "skipped", "failed"] as const;
export type QualityStatus = (typeof QUALITY_STATUSES)[number];

export const QUALITY_TACTICS = ["curated_about", "compose_about", "strip_chrome"] as const;
export type QualityTactic = (typeof QUALITY_TACTICS)[number];

export const QualityRecommendationSchema = z.object({
  id: z.string().min(1),
  listingId: z.string().min(1),
  kind: z.enum(QUALITY_KINDS),
  severity: z.enum(["high", "medium", "low"]),
  scoreBefore: z.number().min(0).max(100),
  message: z.string().min(1).max(500),
  evidence: z.array(z.string().min(1)).max(12).default([]),
  status: z.enum(QUALITY_STATUSES),
  proposedDescription: z.string().min(1).max(2000).optional(),
  tactic: z.enum(QUALITY_TACTICS).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  appliedAt: z.string().datetime().optional(),
  resultScore: z.number().min(0).max(100).optional(),
  error: z.string().max(500).optional(),
});
export type QualityRecommendation = z.infer<typeof QualityRecommendationSchema>;

export const QualityLessonSchema = z.object({
  id: z.string().min(1),
  listingId: z.string().min(1),
  recommendationId: z.string().min(1),
  kind: z.enum(QUALITY_KINDS),
  tactic: z.enum(QUALITY_TACTICS),
  scoreBefore: z.number().min(0).max(100),
  scoreAfter: z.number().min(0).max(100),
  delta: z.number(),
  createdAt: z.string().datetime(),
});
export type QualityLesson = z.infer<typeof QualityLessonSchema>;

/** Snapshot the scorer/improver need from a stored listing — no full Listing parse required. */
export interface QualityListingSnapshot {
  id: string;
  name: string;
  description: string;
  website?: string;
  phone?: string;
  venueModel?: string;
  locality?: string;
  region?: string;
  countryCode?: string;
  line1?: string;
  seasonNote?: string;
  activityTypes?: string[];
  updatedAt: string;
}

/** Soft Abouts that only clear 70 via a locality name-drop stay below this bar. */
export const ABOUT_QUALITY_TARGET = 75;
export const DEFAULT_QUALITY_SCORE_LIMIT = 200;
export const DEFAULT_QUALITY_IMPROVE_LIMIT = 50;

export function recommendationId(listingId: string, kind: QualityKind): string {
  const digest = createHash("sha1").update(`${listingId}|${kind}`).digest("hex").slice(0, 12);
  return `lqr_${digest}`;
}

/** One recommendation per operator feedback row — never reopen after applied/failed. */
export function feedbackRecommendationId(listingId: string, feedbackId: string): string {
  const digest = createHash("sha1").update(`${listingId}|operator_feedback|${feedbackId}`).digest("hex").slice(0, 12);
  return `lqr_${digest}`;
}

/** Actionable `/stats` card feedback the score pass can open as work. */
export interface OperatorFeedbackHint {
  feedbackId: string;
  listingId: string;
  message: string;
  sentiment: "instruction" | "negative";
  createdAt: string;
}

export function lessonId(recommendationId: string, appliedAt: string): string {
  const digest = createHash("sha1").update(`${recommendationId}|${appliedAt}`).digest("hex").slice(0, 12);
  return `lql_${digest}`;
}
