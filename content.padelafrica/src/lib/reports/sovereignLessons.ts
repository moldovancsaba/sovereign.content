/**
 * Sovereign Lesson schema (sportolok adoption P2).
 *
 * Lessons are structured learning hints derived from override / quality evidence.
 * Effects are suggest-only — they never silently mutate pack blockers or thresholds.
 *
 * | effect            | Meaning                                                                 |
 * | ----------------- | ----------------------------------------------------------------------- |
 * | suggest-config    | Staff should review a pack / ops config change (human accepts)          |
 * | soften-required   | Suggest moving a completeness field required→soft for an activity       |
 * | none              | Observe only — family must never be softened (safety / territory / geo) |
 */
import { createHash } from "node:crypto";
import { z } from "zod";

export const LESSON_EFFECTS = ["suggest-config", "soften-required", "none"] as const;
export type LessonEffect = (typeof LESSON_EFFECTS)[number];

export const LESSON_SOURCES = ["override-waiver", "quality-encode"] as const;
export type LessonSource = (typeof LESSON_SOURCES)[number];

/** Gate families that must never receive a soften-required effect. */
export const NEVER_SOFTEN_FAMILIES = new Set([
  "real-address",
  "territory",
  "safety",
  "knowledge",
  "age-safety",
]);

export const SovereignLessonSchema = z.object({
  id: z.string().min(1),
  source: z.enum(LESSON_SOURCES),
  family: z.string().min(1),
  activitySlug: z.string().min(1).nullable(),
  count: z.number().int().min(1),
  effect: z.enum(LESSON_EFFECTS),
  /** Staff-facing suggestion — never applied automatically. */
  suggestion: z.string().min(1).max(1000),
  createdAt: z.string().datetime(),
});
export type SovereignLesson = z.infer<typeof SovereignLessonSchema>;

/**
 * Effect rules — pure. Completeness / media may suggest softening required→soft;
 * identity suggests config review; geo/safety/territory/knowledge are none (observe + remediate).
 */
export function lessonEffectFor(family: string): LessonEffect {
  const key = family.trim().toLowerCase();
  if (NEVER_SOFTEN_FAMILIES.has(key)) return "none";
  if (key === "completeness" || key === "media-readiness") return "soften-required";
  if (key === "provider-identity") return "suggest-config";
  return "suggest-config";
}

export function sovereignLessonId(source: LessonSource, family: string, activitySlug: string | null): string {
  const digest = createHash("sha1")
    .update(`${source}|${family}|${activitySlug ?? ""}`)
    .digest("hex")
    .slice(0, 12);
  return `sl_${digest}`;
}

/** Attach effect + stable id to an override-insight row. Never invents % thresholds. */
export function lessonFromOverrideRow(input: {
  family: string;
  activitySlug: string | null;
  count: number;
  suggestion: string;
  createdAt?: string;
}): SovereignLesson {
  const effect = lessonEffectFor(input.family);
  const suggestion =
    effect === "none"
      ? `${input.suggestion} Effect=none — do not soften this family; remediate via catalog:hygiene / review.`
      : effect === "soften-required"
        ? `${input.suggestion} Effect=soften-required — propose required→soft on the activity profile; human accepts pack PR.`
        : `${input.suggestion} Effect=suggest-config — human reviews before any pack change.`;
  return SovereignLessonSchema.parse({
    id: sovereignLessonId("override-waiver", input.family, input.activitySlug),
    source: "override-waiver",
    family: input.family,
    activitySlug: input.activitySlug,
    count: input.count,
    effect,
    suggestion,
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}

export function renderSovereignLessons(lessons: SovereignLesson[]): string {
  const lines = ["Sovereign lessons (suggest-only — never auto-mutate blockers)", ""];
  if (lessons.length === 0) {
    lines.push("No lessons in this window.");
    return lines.join("\n");
  }
  for (const lesson of lessons) {
    lines.push(
      `- [${lesson.effect}] ${lesson.family}${lesson.activitySlug ? ` / ${lesson.activitySlug}` : ""} ×${lesson.count} (${lesson.id})`,
    );
    lines.push(`  ${lesson.suggestion}`);
  }
  lines.push("", "Humans accept config PRs. Lessons never silently remove safety / territory / real-address blockers.");
  return lines.join("\n");
}
