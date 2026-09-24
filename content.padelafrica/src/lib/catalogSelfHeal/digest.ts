/**
 * Smart self-improve digest — agent-quality report, not a mechanical counter dump.
 *
 * Each item must carry situation → evidence → analysis → recommendation → delivery class.
 */
import type { QualityLesson, QualityRecommendation } from "@/lib/listingQuality/types";
import { loadProcessLessons } from "./processLessons";
import {
  classifyDelivery,
  deliveryActionForQualityKind,
  type DeliveryActionKey,
  type DeliveryClass,
  type DeliveryDecision,
  type DeliveryRisk,
} from "./hitlDelivery";
import { RESEARCH_DEBT_KINDS, type FindBindDecision, type ProcessLesson } from "./types";
import { decideFindBind } from "./findBind";
import { steerTacticsFromLessons } from "./lessonSteer";

export type DigestItem = {
  id: string;
  lane: "listing" | "process" | "contracts" | "find";
  title: string;
  /** What is happening — one tight paragraph. */
  situation: string;
  evidence: string[];
  /** Well-thought breakdown: why it matters, options, trade-offs. */
  analysis: string;
  recommendation: string;
  delivery: DeliveryClass;
  risk: DeliveryRisk;
  whyDelivery: string;
  operatorPrompt?: string;
  commands: string[];
};

export type SelfImproveDigest = {
  job: "catalog:self-improve";
  mode: "digest";
  generatedAt: string;
  since: string;
  summary: {
    openAbout: number;
    openResearch: number;
    openOperatorFeedback: number;
    processLessonsSeen: number;
    autoCount: number;
    agentExecuteCount: number;
    hitlReviewCount: number;
  };
  find: FindBindDecision;
  /** Narrative verdict a Cloud Agent should put at the top of its report to the operator. */
  executiveBrief: string;
  /** Ordered work: auto first, then agent_execute, then hitl_review. */
  items: DigestItem[];
  autoCommands: string[];
  hitlQueue: DigestItem[];
  instructions: string[];
};

export type DigestInputs = {
  recommendations: QualityRecommendation[];
  lessons?: QualityLesson[];
  processPath?: string;
  since?: string;
  now?: string;
};

function decisionFields(action: DeliveryActionKey): Pick<
  DigestItem,
  "delivery" | "risk" | "whyDelivery" | "operatorPrompt"
> {
  const d: DeliveryDecision = classifyDelivery(action);
  return {
    delivery: d.delivery,
    risk: d.risk,
    whyDelivery: d.why,
    ...(d.operatorPrompt ? { operatorPrompt: d.operatorPrompt } : {}),
  };
}

function itemFromRecommendation(rec: QualityRecommendation, now: string): DigestItem {
  const action = deliveryActionForQualityKind(rec.kind);
  const isResearch = RESEARCH_DEBT_KINDS.has(rec.kind as never);
  const fields = decisionFields(action);
  const commands =
    action === "quality_loop_about" || action === "operator_feedback_about"
      ? [
          "npm run catalog:about-curate -- --limit 15",
          "npm run catalog:quality-loop -- --score-limit 100 --improve-limit 40",
        ]
      : ["npm run catalog:self-heal -- --brief"];

  return {
    id: `rec:${rec.id}`,
    lane: "listing",
    title: `${rec.kind} on ${rec.listingId}`,
    situation: rec.message,
    evidence: rec.evidence?.length ? rec.evidence : [`kind:${rec.kind}`, `status:${rec.status}`],
    analysis: isResearch
      ? `This is research debt, not an About compose problem. Improve must not invent contacts or media. The next honest step is an agent WebSearch brief against public pages; if nothing prints, leave the gap and keep FIND parallel.`
      : action === "operator_feedback_about"
        ? `Operator /stats notes must never be pasted into About. Treat chrome/debt mechanically via quality-loop; treat product-intent copy as HiTL so the operator confirms the note's meaning.`
        : `About defect is in the deterministic quality-loop lane. Prefer curated About when encoded lessons show positive delta; strip chrome before composing. Empty alreadyGood ticks mean settle and grow with FIND.`,
    recommendation: isResearch
      ? `Run research brief for ${rec.listingId}; apply only evidence printed on a public page.`
      : action === "operator_feedback_about"
        ? `Hold product-intent notes for operator review; run quality-loop only for chrome/debt treatment.`
        : `Run about-curate then quality-loop; reconcile serving if About writes land.`,
    ...fields,
    commands,
  };
}

function itemFromProcessLesson(lesson: ProcessLesson): DigestItem {
  if (lesson.kind === "success") {
    return {
      id: `proc:${lesson.id}`,
      lane: "find",
      title: `success — ${lesson.job}`,
      situation: lesson.message,
      evidence: lesson.evidence?.length ? lesson.evidence : [`job:${lesson.job}`, `at:${lesson.createdAt}`],
      analysis:
        "A prior FIND/heal success. Keep it as yield memory for future briefs — do not re-seed the same venue, and do not treat success as permission to invent the next city.",
      recommendation: "No action required unless encoding source-yield memory for the planner.",
      delivery: "auto",
      risk: "low",
      whyDelivery: "Informational success residue — acknowledge only; no write required.",
      commands: [],
    };
  }
  const action: DeliveryActionKey =
    lesson.kind === "ops_block"
      ? "threshold_or_policy_change"
      : lesson.kind === "defer_find"
        ? "quality_loop_about"
        : lesson.kind === "evidence_wall"
          ? "self_heal_brief_research"
          : "ssot_contract_draft";
  const fields = decisionFields(action);
  return {
    id: `proc:${lesson.id}`,
    lane: "process",
    title: `${lesson.kind} — ${lesson.job}`,
    situation: lesson.message,
    evidence: lesson.evidence?.length ? lesson.evidence : [`job:${lesson.job}`, `at:${lesson.createdAt}`],
    analysis:
      lesson.kind === "evidence_wall"
        ? `Contact/media enrich hit a wall. The system should open or keep research debt and brief an agent — not guess phones from OSM or Maps.`
        : lesson.kind === "defer_find"
          ? `FIND was correctly paused for About debt. Heal About first; research debt alone must not block FIND.`
          : `Process residue may imply a portable contract (Jobs/Cursor). Draft for SSOT only after pattern repeats; never auto-merge doctrine.`,
    recommendation:
      fields.delivery === "hitl_review"
        ? `Draft a portable recommendation for operator review; do not merge SSOT main yet.`
        : `Follow healFirst / brief commands; record outcomes with --record-process when useful.`,
    ...fields,
    commands:
      fields.delivery === "auto"
        ? ["npm run catalog:about-curate -- --limit 15", "npm run catalog:quality-loop -- --score-limit 100 --improve-limit 40"]
        : fields.delivery === "agent_execute"
          ? ["npm run catalog:self-heal -- --brief"]
          : [],
  };
}

function deliveryRank(d: DeliveryClass): number {
  if (d === "auto") return 0;
  if (d === "agent_execute") return 1;
  return 2;
}

export function buildSelfImproveDigest(input: DigestInputs): SelfImproveDigest {
  const now = input.now ?? new Date().toISOString();
  const since = input.since ?? new Date(0).toISOString();
  const open = input.recommendations.filter((r) => r.status === "open");
  let openAbout = 0;
  let openResearch = 0;
  let openOperatorFeedback = 0;
  for (const rec of open) {
    if (rec.kind === "operator_feedback") openOperatorFeedback += 1;
    else if (RESEARCH_DEBT_KINDS.has(rec.kind as never)) openResearch += 1;
    else openAbout += 1;
  }

  const find = decideFindBind({ openAbout, openResearch });
  const processLessons = loadProcessLessons(input.processPath).filter((l) => l.createdAt >= since);
  const items: DigestItem[] = [
    ...open.map((r) => itemFromRecommendation(r, now)),
    ...processLessons.slice(0, 15).map(itemFromProcessLesson),
  ];

  if (find.mode === "defer_heal_first") {
    items.unshift({
      id: "find:defer",
      lane: "find",
      title: "FIND deferred — heal About first",
      situation: find.reason,
      evidence: [`openAbout:${find.openAbout}`, `openResearch:${find.openResearch}`],
      analysis:
        "Until-found growth pauses while About debt is hot so the agent does not starve quality for coverage. Research gaps stay parallel via --brief; they do not themselves block FIND.",
      recommendation: "Run healFirst commands, then re-check self-heal status before --until-found.",
      ...decisionFields("quality_loop_about"),
      commands: find.healFirst,
    });
  }

  items.sort((a, b) => deliveryRank(a.delivery) - deliveryRank(b.delivery));

  const autoCommands = [...new Set(items.filter((i) => i.delivery === "auto").flatMap((i) => i.commands))];
  const hitlQueue = items.filter((i) => i.delivery === "hitl_review");
  const autoCount = items.filter((i) => i.delivery === "auto").length;
  const agentExecuteCount = items.filter((i) => i.delivery === "agent_execute").length;
  const hitlReviewCount = hitlQueue.length;

  const steer = steerTacticsFromLessons(input.lessons ?? []);

  const executiveBrief =
    items.length === 0
      ? `Settled catalogue as of ${now.slice(0, 19)}Z: no open listing debt in this digest window. Prefer FIND --until-found for growth; leave the single catalog orchestrator timer subscribed (empty about/quality/media/autopilot steps inside that wake are OK). No HiTL items.`
      : [
          `Digest ${now.slice(0, 19)}Z — ${items.length} actionable item(s): ${autoCount} auto, ${agentExecuteCount} agent-execute, ${hitlReviewCount} need your review.`,
          find.mode === "defer_heal_first"
            ? `FIND is deferred (${find.reason}).`
            : `FIND until-found is allowed.`,
          hitlReviewCount > 0
            ? `Do not auto-merge HiTL items (SSOT contracts, operator product notes, thin seeds, policy changes).`
            : `No HiTL blockers in this window.`,
          steer[0] ? `Encoded About lessons still bias toward ${steer[0].tactic} (avgΔ ${steer[0].avgDelta}).` : "",
        ]
          .filter(Boolean)
          .join(" ");

  const instructions = [
    "Report with executiveBrief first, then a per-item breakdown (situation → evidence → analysis → recommendation → delivery). Do not send a counter-only summary.",
    "Run autoCommands without asking when delivery=auto.",
    "For agent_execute: clear the evidence bar; never invent; stop FIND campaign on first seed.",
    "For hitl_review: present hitlQueue with operatorPrompt and wait — draft SSOT only, do not merge main.",
    "After About/media writes: npm run serving:reconcile -- --limit 200 when pack load works.",
  ];

  return {
    job: "catalog:self-improve",
    mode: "digest",
    generatedAt: now,
    since,
    summary: {
      openAbout,
      openResearch,
      openOperatorFeedback,
      processLessonsSeen: processLessons.length,
      autoCount,
      agentExecuteCount,
      hitlReviewCount,
    },
    find,
    executiveBrief,
    items,
    autoCommands,
    hitlQueue,
    instructions,
  };
}
