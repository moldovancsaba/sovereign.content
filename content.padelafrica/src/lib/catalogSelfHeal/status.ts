/**
 * Aggregate self-heal status for operators and Cloud Agent ticks.
 */
import type { ListingQualityStore } from "@/lib/listingQuality/store";
import type { QualityKind, QualityRecommendation } from "@/lib/listingQuality/types";
import { ABOUT_IMPROVE_KINDS, RESEARCH_DEBT_KINDS, type SelfHealStatus } from "./types";
import { decideFindBind } from "./findBind";
import { steerTacticsFromLessons } from "./lessonSteer";
import { loadProcessLessons } from "./processLessons";
import { buildResearchGapBrief } from "./researchBrief";

export async function buildSelfHealStatus(
  store: ListingQualityStore,
  opts: { processPath?: string } = {},
): Promise<SelfHealStatus> {
  const open = await store.listOpenRecommendations(200);
  const statuses = await store.countByStatus();
  const lessons = await store.listLessons(100);
  const processLessons = loadProcessLessons(opts.processPath).slice(0, 20);

  const byKind: Record<string, number> = {};
  let openAbout = 0;
  let openResearch = 0;
  let openOperatorFeedback = 0;
  for (const rec of open) {
    byKind[rec.kind] = (byKind[rec.kind] ?? 0) + 1;
    if (ABOUT_IMPROVE_KINDS.has(rec.kind)) openAbout += 1;
    if (RESEARCH_DEBT_KINDS.has(rec.kind)) openResearch += 1;
    if (rec.kind === "operator_feedback") openOperatorFeedback += 1;
  }

  const find = decideFindBind({ openAbout, openResearch });
  const nextResearch = await pickNextResearchBrief(store, open);

  const instructions: string[] = [
    "1) If find.mode is defer_heal_first — run healFirst commands before catalog:find --until-found.",
    "2) Open About debt → catalog:about-curate then catalog:quality-loop.",
    "3) Open research debt → execute nextResearchBrief with WebSearch; never invent contacts.",
    "4) When debt is clear — catalog:find --until-found seeds the next opportunity.",
    "5) Encoded listing lessons bias improve tactics; process lessons record ops residue.",
  ];
  if (openOperatorFeedback > 0) {
    instructions.splice(
      2,
      0,
      `2b) Open operator_feedback (${openOperatorFeedback}) from /stats card notes → catalog:quality-loop (score+improve); never paste the note into About.`,
    );
  }

  return {
    job: "catalog:self-heal",
    mode: "status",
    recommendations: {
      openAbout,
      openResearch,
      openOperatorFeedback,
      openTotal: open.length,
      byKind,
      byStatus: Object.fromEntries(
        Object.entries(statuses).map(([k, v]) => [k, v ?? 0]),
      ) as Record<string, number>,
    },
    lessons: {
      encoded: lessons.length,
      tacticSteer: steerTacticsFromLessons(lessons),
    },
    find,
    processLessons,
    nextResearchBrief: nextResearch,
    instructions,
  };
}

async function pickNextResearchBrief(
  store: ListingQualityStore,
  open: QualityRecommendation[],
) {
  const research = open.find(
    (r) => r.kind === "research_needed" || r.kind === "contact_gap" || r.kind === "media_thin" || r.kind === "geo_weak",
  );
  if (!research) return null;
  const snap = await store.getSnapshot(research.listingId);
  if (!snap) return null;
  return buildResearchGapBrief(snap, research.kind as QualityKind);
}
