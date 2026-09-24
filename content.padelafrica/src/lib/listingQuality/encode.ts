/**
 * Encode pass — turns applied improvements into lessons (score deltas + tactics)
 * so operators and future scorers can see what worked.
 *
 * Hygiene (2026-09-24 audit): do not encode zero-delta soft applies that never cleared
 * ABOUT_QUALITY_TARGET — those read as success lessons when they are not.
 * Contact/media/research debt kinds never become About lessons.
 */
import type { ListingQualityStore } from "./store";
import { ABOUT_QUALITY_TARGET, lessonId, type QualityKind, type QualityLesson } from "./types";

const ENCODABLE_KINDS = new Set<QualityKind>([
  "about_thin",
  "about_chrome",
  "about_template",
  "about_url",
  "about_contact_leak",
  "operator_feedback",
]);

export interface EncodeSummary {
  encoded: number;
  skipped: number;
  lessons: QualityLesson[];
}

/** True when an applied rec is worth remembering as a lesson. */
export function shouldEncodeLesson(scoreBefore: number, scoreAfter: number): boolean {
  const delta = scoreAfter - scoreBefore;
  return delta > 0 || scoreAfter >= ABOUT_QUALITY_TARGET;
}

/** Encode applied recommendations that do not yet have a lesson row. */
export async function runListingQualityEncode(
  store: ListingQualityStore,
  options: { maxPerRun?: number; dryRun?: boolean } = {},
): Promise<EncodeSummary> {
  const maxPerRun = Math.max(0, options.maxPerRun ?? 100);
  const dryRun = Boolean(options.dryRun);
  const applied = await store.listAppliedRecommendations(maxPerRun);
  const existing = new Set((await store.listLessons(500)).map((l) => l.recommendationId));
  const lessons: QualityLesson[] = [];
  let skipped = 0;

  for (const rec of applied) {
    if (existing.has(rec.id)) {
      skipped += 1;
      continue;
    }
    if (!ENCODABLE_KINDS.has(rec.kind)) {
      skipped += 1;
      continue;
    }
    if (rec.resultScore === undefined || !rec.tactic || !rec.appliedAt) {
      skipped += 1;
      continue;
    }
    if (!shouldEncodeLesson(rec.scoreBefore, rec.resultScore)) {
      skipped += 1;
      continue;
    }
    const lesson: QualityLesson = {
      id: lessonId(rec.id, rec.appliedAt),
      listingId: rec.listingId,
      recommendationId: rec.id,
      kind: rec.kind,
      tactic: rec.tactic,
      scoreBefore: rec.scoreBefore,
      scoreAfter: rec.resultScore,
      delta: rec.resultScore - rec.scoreBefore,
      createdAt: new Date().toISOString(),
    };
    lessons.push(lesson);
    if (!dryRun) await store.insertLesson(lesson);
  }

  return { encoded: lessons.length, skipped, lessons };
}
