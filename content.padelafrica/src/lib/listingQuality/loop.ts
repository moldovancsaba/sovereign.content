/**
 * Orchestrates score → improve → encode for one quality-loop tick.
 */
import { recommendationsForListing } from "./score";
import { recommendationFromOperatorFeedback } from "./feedback";
import { runListingQualityImprove, type ImproveOptions, type ImproveSummary } from "./improve";
import { runListingQualityEncode, type EncodeSummary } from "./encode";
import type { ListingQualityStore } from "./store";
import { DEFAULT_QUALITY_IMPROVE_LIMIT, DEFAULT_QUALITY_SCORE_LIMIT, type QualityRecommendation } from "./types";

export interface ScoreSummary {
  scanned: number;
  openWritten: number;
  alreadyGood: number;
  fromFeedback: number;
  recommendations: QualityRecommendation[];
}

export interface LoopSummary {
  score: ScoreSummary;
  improve: ImproveSummary;
  encode: EncodeSummary;
  statuses: Awaited<ReturnType<ListingQualityStore["countByStatus"]>>;
}

export async function runListingQualityScore(
  store: ListingQualityStore,
  options: { maxPerRun?: number; dryRun?: boolean } = {},
): Promise<ScoreSummary> {
  const maxPerRun = Math.max(0, options.maxPerRun ?? DEFAULT_QUALITY_SCORE_LIMIT);
  const dryRun = Boolean(options.dryRun);
  const now = new Date().toISOString();
  const snapshots = await store.listPublishedSnapshots(maxPerRun);
  const recommendations: QualityRecommendation[] = [];
  let alreadyGood = 0;

  for (const snap of snapshots) {
    const recs = recommendationsForListing(snap, now);
    if (recs.length === 0) {
      alreadyGood += 1;
      continue;
    }
    recommendations.push(...recs);
  }

  // Operator `/stats` feedback → open recommendations (never invent About from the note text).
  let fromFeedback = 0;
  const hints = await store.listActionableOperatorFeedback(Math.min(50, maxPerRun || 50));
  for (const hint of hints) {
    const snap = await store.getSnapshot(hint.listingId);
    if (!snap) continue;
    recommendations.push(recommendationFromOperatorFeedback(snap, hint, now));
    fromFeedback += 1;
  }

  let openWritten = 0;
  if (!dryRun && recommendations.length) {
    const appliedIds = new Set((await store.listAppliedRecommendations(500)).map((r) => r.id));
    const toWrite = recommendations.filter((r) => !appliedIds.has(r.id));
    openWritten = toWrite.length;
    await store.upsertRecommendations(toWrite);
  } else if (dryRun) {
    openWritten = recommendations.length;
  }

  return {
    scanned: snapshots.length,
    openWritten,
    alreadyGood,
    fromFeedback,
    recommendations,
  };
}

export async function runListingQualityLoop(
  store: ListingQualityStore,
  options: ImproveOptions & { scoreLimit?: number; improveLimit?: number; dryRun?: boolean } = {},
): Promise<LoopSummary> {
  const dryRun = Boolean(options.dryRun);
  const score = await runListingQualityScore(store, {
    maxPerRun: options.scoreLimit ?? DEFAULT_QUALITY_SCORE_LIMIT,
    dryRun,
  });

  const improve = await runListingQualityImprove(store, {
    ...options,
    maxPerRun: options.improveLimit ?? DEFAULT_QUALITY_IMPROVE_LIMIT,
    dryRun,
  });
  const encode = await runListingQualityEncode(store, {
    maxPerRun: options.improveLimit ?? DEFAULT_QUALITY_IMPROVE_LIMIT,
    dryRun,
  });
  const statuses = await store.countByStatus();
  return { score, improve, encode, statuses };
}

export function describeListingQualityLoop(summary: LoopSummary): string {
  return (
    `quality-loop score scanned=${summary.score.scanned} open=${summary.score.openWritten} good=${summary.score.alreadyGood} feedback=${summary.score.fromFeedback}; ` +
    `improve applied=${summary.improve.applied} skipped=${summary.improve.skipped} failed=${summary.improve.failed}; ` +
    `encode lessons=${summary.encode.encoded}`
  );
}
