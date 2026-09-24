/**
 * Sovereign self-heal — closes detect → recommend → apply → encode → discover
 * so the catalogue improves itself without inventing facts.
 */

import { createHash } from "node:crypto";
import type { QualityKind, QualityTactic } from "@/lib/listingQuality/types";

/** Kinds improve can rewrite About for. Everything else needs agent research. */
export const ABOUT_IMPROVE_KINDS = new Set<QualityKind>([
  "about_thin",
  "about_chrome",
  "about_template",
  "about_url",
  "about_contact_leak",
  "operator_feedback",
]);

/** Debt kinds that stay open until evidence is found (agent brief), not compose-About. */
export const RESEARCH_DEBT_KINDS = new Set<QualityKind>([
  "contact_gap",
  "media_thin",
  "geo_weak",
  "research_needed",
]);

export const DEFAULT_FIND_DEFER_OPEN_ABOUT = 3;
/** Research debt is surfaced via briefs; it does not block FIND (see findBind). */
export const DEFAULT_FIND_DEFER_OPEN_RESEARCH = Number.POSITIVE_INFINITY;

export type FindHealMode = "until-found" | "defer_heal_first";

export type FindBindDecision = {
  mode: FindHealMode;
  reason: string;
  openAbout: number;
  openResearch: number;
  openTotal: number;
  healFirst: string[];
};

export type TacticSteer = {
  tactic: QualityTactic;
  samples: number;
  avgDelta: number;
  wins: number;
};

export type ProcessLessonKind =
  | "tactic_bias"
  | "evidence_wall"
  | "zero_result_pattern"
  | "ops_block"
  | "success"
  | "defer_find";

export type ProcessLesson = {
  id: string;
  job: string;
  kind: ProcessLessonKind;
  message: string;
  evidence: string[];
  createdAt: string;
};

export type ResearchGapBrief = {
  job: "catalog:self-heal";
  mode: "research-brief";
  agentRequired: true;
  listingId: string;
  kind: QualityKind;
  name?: string;
  locality?: string;
  countryCode?: string;
  searchQueries: string[];
  evidenceBar: string[];
  steps: string[];
  neverInvent: string[];
};

export type SelfHealStatus = {
  job: "catalog:self-heal";
  mode: "status";
  recommendations: {
    openAbout: number;
    openResearch: number;
    /** Open `/stats` card_feedback rows bridged as operator_feedback — heal via quality-loop. */
    openOperatorFeedback: number;
    openTotal: number;
    byKind: Record<string, number>;
    byStatus: Record<string, number>;
  };
  lessons: {
    encoded: number;
    tacticSteer: TacticSteer[];
  };
  find: FindBindDecision;
  processLessons: ProcessLesson[];
  nextResearchBrief: ResearchGapBrief | null;
  instructions: string[];
};

export function processLessonId(job: string, kind: string, key: string): string {
  const digest = createHash("sha1").update(`${job}|${kind}|${key}`).digest("hex").slice(0, 12);
  return `cpl_${digest}`;
}
