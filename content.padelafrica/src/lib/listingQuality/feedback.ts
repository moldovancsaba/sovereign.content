/**
 * Bridge `/stats` card_feedback into the listing quality loop.
 *
 * Operator notes are never pasted into About prose (that would invent claims).
 * They open `operator_feedback` recommendations so improve can re-run curated /
 * compose About — the same safe tactics used for thin/template cards.
 */
import {
  feedbackRecommendationId,
  type OperatorFeedbackHint,
  type QualityListingSnapshot,
  type QualityRecommendation,
} from "./types";
import { scoreAboutQuality } from "./score";

export function recommendationFromOperatorFeedback(
  listing: QualityListingSnapshot,
  hint: OperatorFeedbackHint,
  now: string,
): QualityRecommendation {
  const report = scoreAboutQuality(listing.description, listing.locality);
  const snippet = hint.message.trim().replace(/\s+/g, " ").slice(0, 160);
  return {
    id: feedbackRecommendationId(listing.id, hint.feedbackId),
    listingId: listing.id,
    kind: "operator_feedback",
    severity: hint.sentiment === "negative" ? "high" : report.score < 70 ? "medium" : "low",
    scoreBefore: report.score,
    message: `${listing.name}: operator ${hint.sentiment} — revisit About (score ${report.score})`,
    evidence: [
      `feedback:${hint.feedbackId}`,
      `sentiment:${hint.sentiment}`,
      snippet ? `note:${snippet}` : "note:(empty)",
      ...report.evidence.slice(0, 4),
    ],
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
}
