/**
 * Improve pass — consumes open About recommendations and applies safe deterministic upgrades.
 * Never invents contacts or media. After an About apply, sibling open recs for the same listing
 * (including research kinds) are marked skipped — a known honesty gap vs “research stays open for
 * briefs”; see docs/padel-africa-self-heal-feedback-audit-2026-09-24.md.
 */
import { ABOUT_IMPROVE_KINDS, preferredTacticOrder } from "@/lib/catalogSelfHeal";
import { correctPublicDescription, validatePublicDescription } from "@/lib/catalogHygiene/descriptionQuality";
import { composeAbout, type ComposeAboutOptions } from "./composeAbout";
import { scoreAboutQuality } from "./score";
import type { ListingQualityStore } from "./store";
import {
  ABOUT_QUALITY_TARGET,
  DEFAULT_QUALITY_IMPROVE_LIMIT,
  type QualityRecommendation,
  type QualityTactic,
} from "./types";

export interface ImproveOptions extends ComposeAboutOptions {
  maxPerRun?: number;
  dryRun?: boolean;
  /** Called after a successful description write so the caller can refresh listings_serving. */
  onDescriptionApplied?: (listingId: string, description: string) => Promise<void>;
}

export interface ImproveSummary {
  considered: number;
  applied: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
  /** Tactic preference from encoded lessons (self-heal steer). */
  tacticOrder?: QualityTactic[];
  deferredResearch?: number;
  results: Array<{
    recommendationId: string;
    listingId: string;
    kind: string;
    status: "applied" | "skipped" | "failed";
    tactic?: QualityTactic;
    scoreBefore: number;
    scoreAfter?: number;
    error?: string;
  }>;
}

export async function runListingQualityImprove(
  store: ListingQualityStore,
  options: ImproveOptions = {},
): Promise<ImproveSummary> {
  const maxPerRun = Math.max(0, options.maxPerRun ?? DEFAULT_QUALITY_IMPROVE_LIMIT);
  const dryRun = Boolean(options.dryRun);
  const lessons = await store.listLessons(100);
  const tacticOrder = preferredTacticOrder(lessons);
  const summary: ImproveSummary = {
    considered: 0,
    applied: 0,
    skipped: 0,
    failed: 0,
    dryRun,
    tacticOrder,
    deferredResearch: 0,
    results: [],
  };
  if (maxPerRun === 0) return summary;

  const openAll = await store.listOpenRecommendations(Math.max(maxPerRun * 3, 60));
  const deferredResearch = openAll.filter((r) => !ABOUT_IMPROVE_KINDS.has(r.kind)).length;
  summary.deferredResearch = deferredResearch;
  const open = openAll.filter((r) => ABOUT_IMPROVE_KINDS.has(r.kind));
  // One improve per listing per run (highest-severity open row wins)
  const seen = new Set<string>();
  const batch: QualityRecommendation[] = [];
  for (const rec of open) {
    if (seen.has(rec.listingId)) continue;
    seen.add(rec.listingId);
    batch.push(rec);
    if (batch.length >= maxPerRun) break;
  }

  const now = new Date().toISOString();
  for (const rec of batch) {
    summary.considered += 1;
    const listing = await store.getSnapshot(rec.listingId);
    if (!listing) {
      summary.failed += 1;
      summary.results.push({
        recommendationId: rec.id,
        listingId: rec.listingId,
        kind: rec.kind,
        status: "failed",
        scoreBefore: rec.scoreBefore,
        error: "listing not found or not published",
      });
      if (!dryRun) {
        await store.markRecommendation(rec.id, { status: "failed", error: "listing not found or not published", updatedAt: now });
      }
      continue;
    }

    const current = scoreAboutQuality(listing.description, listing.locality);
    if (
      rec.kind !== "operator_feedback" &&
      current.score >= ABOUT_QUALITY_TARGET &&
      current.kinds.length === 0
    ) {
      summary.skipped += 1;
      summary.results.push({
        recommendationId: rec.id,
        listingId: rec.listingId,
        kind: rec.kind,
        status: "skipped",
        scoreBefore: rec.scoreBefore,
        scoreAfter: current.score,
      });
      if (!dryRun) {
        await store.markRecommendation(rec.id, {
          status: "skipped",
          resultScore: current.score,
          updatedAt: now,
          message: `${rec.message} — already at target`,
        });
      }
      continue;
    }

    let nextDescription = listing.description;
    let tactic: QualityTactic = "compose_about";

    if (rec.kind === "about_chrome" || rec.kind === "about_url" || rec.kind === "about_contact_leak") {
      const corrected = correctPublicDescription(listing.description, "en");
      const stripped = corrected.text;
      if (stripped !== listing.description && !validatePublicDescription(stripped, "description")) {
        nextDescription = stripped;
        tactic = "strip_chrome";
      }
    }

    const stillWeak = scoreAboutQuality(nextDescription, listing.locality);
    const forceCompose =
      rec.kind === "operator_feedback" ||
      stillWeak.score < ABOUT_QUALITY_TARGET ||
      stillWeak.kinds.length > 0 ||
      nextDescription === listing.description;
    if (forceCompose) {
      const composed = composeAbout({ ...listing, description: nextDescription }, options);
      // Prefer curated/composed rewrite for operator feedback even when current prose already scores well.
      if (rec.kind === "operator_feedback" || composed.description !== nextDescription || stillWeak.score < ABOUT_QUALITY_TARGET) {
        nextDescription = composed.description;
        tactic = composed.tactic;
      }
    }

    const after = scoreAboutQuality(nextDescription, listing.locality);
    const gate = validatePublicDescription(nextDescription, "description");
    if (gate || nextDescription.length < 40) {
      summary.failed += 1;
      summary.results.push({
        recommendationId: rec.id,
        listingId: rec.listingId,
        kind: rec.kind,
        status: "failed",
        tactic,
        scoreBefore: rec.scoreBefore,
        error: gate || "composed About too short",
      });
      if (!dryRun) {
        await store.markRecommendation(rec.id, {
          status: "failed",
          error: gate || "composed About too short",
          proposedDescription: nextDescription.slice(0, 2000),
          tactic,
          updatedAt: now,
        });
      }
      continue;
    }

    if (nextDescription === listing.description) {
      summary.skipped += 1;
      summary.results.push({
        recommendationId: rec.id,
        listingId: rec.listingId,
        kind: rec.kind,
        status: "skipped",
        tactic,
        scoreBefore: rec.scoreBefore,
        scoreAfter: after.score,
      });
      if (!dryRun) {
        await store.markRecommendation(rec.id, { status: "skipped", resultScore: after.score, tactic, updatedAt: now });
      }
      continue;
    }

    summary.applied += 1;
    summary.results.push({
      recommendationId: rec.id,
      listingId: rec.listingId,
      kind: rec.kind,
      status: "applied",
      tactic,
      scoreBefore: rec.scoreBefore,
      scoreAfter: after.score,
    });

    if (!dryRun) {
      await store.writeListingDescription(rec.listingId, nextDescription, now);
      if (options.onDescriptionApplied) await options.onDescriptionApplied(rec.listingId, nextDescription);
      await store.markRecommendation(rec.id, {
        status: "applied",
        appliedAt: now,
        resultScore: after.score,
        proposedDescription: nextDescription.slice(0, 2000),
        tactic,
        updatedAt: now,
      });
      // Close sibling open recs for the same listing
      const siblings = (await store.listOpenRecommendations(200)).filter((r) => r.listingId === rec.listingId && r.id !== rec.id);
      for (const sib of siblings) {
        await store.markRecommendation(sib.id, {
          status: "skipped",
          resultScore: after.score,
          updatedAt: now,
          message: `${sib.message} — closed after ${rec.id} applied`,
        });
      }
    }
  }

  return summary;
}
