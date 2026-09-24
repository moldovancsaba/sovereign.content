/**
 * Override learning hints (sportolok A6) — digests force-publish waivers from the audit log into
 * human-readable suggestions keyed by gate family and, when evidence allows, activity slug.
 *
 * Suggestions never auto-mutate pack profiles or `autonomyThreshold` floats. Operators accept config
 * changes by hand after reading the digest. Rows also project into `SovereignLesson` with effect
 * rules (`suggest-config` | `soften-required` | `none`) — never silent blocker mutation.
 */
import type { Db } from "mongodb";
import { lessonFromOverrideRow, type SovereignLesson } from "@/lib/reports/sovereignLessons";

const MAX_AUDIT = 2000;
const MIN_COUNT_FOR_HINT = 2;

export interface OverrideInsightRow {
  family: string;
  activitySlug: string | null;
  count: number;
  /** Staff-facing suggestion — never applied automatically. */
  suggestion: string;
}

export interface OverrideInsightsDigest {
  generatedAt: string;
  windowHours: number;
  since: string;
  waivedPublishCount: number;
  byFamily: OverrideInsightRow[];
  /** Structured lessons with effect tags — same evidence as byFamily, suggest-only. */
  lessons: SovereignLesson[];
}

function suggestionFor(family: string, activitySlug: string | null, count: number): string {
  const activityBit = activitySlug ? ` for activity “${activitySlug}”` : "";
  switch (family) {
    case "real-address":
      return `${count} force-publishes waived real-address${activityBit}. Prefer Nominatim geo after a street-level line1 (catalog:hygiene); do not soften territory/safety.`;
    case "completeness":
      return `${count} force-publishes waived completeness${activityBit}. Review activityCompleteness required vs soft for that slug — human accepts pack edits; no auto float.`;
    case "media-readiness":
      return `${count} force-publishes waived media-readiness${activityBit}. Consider catalog:media-curate or marking media soft on that activity profile.`;
    case "provider-identity":
      return `${count} force-publishes waived provider-identity${activityBit}. Check name/source identity before widening soft blockers.`;
    default:
      return `${count} force-publishes waived “${family}”${activityBit}. Inspect justifications before changing forcePublishSoftBlockers.`;
  }
}

/**
 * Reads applied publish audits that recorded `waivedFamilies`, optionally joining the card's
 * completeness evidence for an activity slug. Bounded; empty when nothing was waived in the window.
 */
export async function overrideInsights(
  db: Db,
  windowHours = 168,
  now = new Date(),
): Promise<OverrideInsightsDigest> {
  const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000).toISOString();
  const audits = await db
    .collection<{
      action: string;
      status?: string;
      waivedFamilies?: string[];
      targetId?: string;
      at: string;
    }>("admin_audit_log")
    .find(
      { at: { $gte: since }, action: "publish", status: "applied", waivedFamilies: { $exists: true, $ne: [] } },
      { projection: { _id: 0, action: 1, status: 1, waivedFamilies: 1, targetId: 1, at: 1 } },
    )
    .sort({ at: -1 })
    .limit(MAX_AUDIT)
    .toArray();

  const cardIds = [...new Set(audits.map((a) => a.targetId).filter((id): id is string => Boolean(id)))];
  const activityByCard = new Map<string, string | null>();
  if (cardIds.length > 0) {
    const cards = await db
      .collection("content_cards")
      .find({ id: { $in: cardIds } }, { projection: { _id: 0, id: 1, verdicts: 1, operatorForcePublish: 1 } })
      .limit(cardIds.length)
      .toArray();
    for (const c of cards) {
      const verdicts = (c.verdicts as Array<{ family?: string; evidence?: string }> | undefined) ?? [];
      const completeness = verdicts.find((v) => v.family === "completeness");
      const m = completeness?.evidence?.match(/(?:^|;)\s*activity=([^;]+)/i);
      activityByCard.set(c.id as string, m?.[1]?.trim() || null);
    }
  }

  const counts = new Map<string, { family: string; activitySlug: string | null; count: number }>();
  let waivedPublishCount = 0;
  for (const a of audits) {
    const families = a.waivedFamilies ?? [];
    if (families.length === 0) continue;
    waivedPublishCount += 1;
    const activitySlug = a.targetId ? (activityByCard.get(a.targetId) ?? null) : null;
    for (const family of families) {
      const key = `${family}\0${activitySlug ?? ""}`;
      const prev = counts.get(key);
      if (prev) prev.count += 1;
      else counts.set(key, { family, activitySlug, count: 1 });
    }
  }

  const byFamily: OverrideInsightRow[] = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family))
    .filter((row) => row.count >= MIN_COUNT_FOR_HINT)
    .map((row) => ({
      ...row,
      suggestion: suggestionFor(row.family, row.activitySlug, row.count),
    }));

  const generatedAt = now.toISOString();
  const lessons: SovereignLesson[] = byFamily.map((row) =>
    lessonFromOverrideRow({
      family: row.family,
      activitySlug: row.activitySlug,
      count: row.count,
      suggestion: row.suggestion,
      createdAt: generatedAt,
    }),
  );

  return {
    generatedAt,
    windowHours,
    since,
    waivedPublishCount,
    byFamily,
    lessons,
  };
}

export function renderOverrideInsights(d: OverrideInsightsDigest): string {
  const lines = [
    `Override insights — last ${d.windowHours}h (since ${d.since})`,
    `Force-publishes with waivers: ${d.waivedPublishCount}`,
    "",
  ];
  if (d.byFamily.length === 0) {
    lines.push("No repeated waiver patterns (≥2) in this window.");
  } else {
    for (const row of d.byFamily) {
      lines.push(`- ${row.family}${row.activitySlug ? ` / ${row.activitySlug}` : ""} ×${row.count}`);
      lines.push(`  ${row.suggestion}`);
    }
  }
  if (d.lessons.length > 0) {
    lines.push("", "Lessons (effect-tagged, suggest-only):");
    for (const lesson of d.lessons) {
      lines.push(`- [${lesson.effect}] ${lesson.family}${lesson.activitySlug ? ` / ${lesson.activitySlug}` : ""} ×${lesson.count}`);
    }
  }
  lines.push("", "Suggestions are hints only — do not auto-apply pack or threshold changes.");
  return lines.join("\n");
}
