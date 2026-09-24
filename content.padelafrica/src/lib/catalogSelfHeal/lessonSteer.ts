/**
 * Bias improve tactics from encoded listing_quality_lessons (positive delta wins).
 */
import type { QualityLesson, QualityTactic } from "@/lib/listingQuality/types";
import type { TacticSteer } from "./types";

const DEFAULT_ORDER: QualityTactic[] = ["curated_about", "strip_chrome", "compose_about"];

export function steerTacticsFromLessons(lessons: QualityLesson[]): TacticSteer[] {
  const byTactic = new Map<QualityTactic, { sum: number; n: number; wins: number }>();
  for (const lesson of lessons) {
    const row = byTactic.get(lesson.tactic) ?? { sum: 0, n: 0, wins: 0 };
    row.sum += lesson.delta;
    row.n += 1;
    if (lesson.delta > 0) row.wins += 1;
    byTactic.set(lesson.tactic, row);
  }
  const steered: TacticSteer[] = [...byTactic.entries()].map(([tactic, row]) => ({
    tactic,
    samples: row.n,
    avgDelta: row.n ? row.sum / row.n : 0,
    wins: row.wins,
  }));
  steered.sort((a, b) => b.avgDelta - a.avgDelta || b.wins - a.wins || b.samples - a.samples);
  return steered;
}

/** Preferred tactic try-order for About improve (curated still wins when present). */
export function preferredTacticOrder(lessons: QualityLesson[]): QualityTactic[] {
  const steered = steerTacticsFromLessons(lessons);
  if (!steered.length) return [...DEFAULT_ORDER];
  const ranked = steered.map((s) => s.tactic);
  for (const t of DEFAULT_ORDER) {
    if (!ranked.includes(t)) ranked.push(t);
  }
  return ranked;
}
