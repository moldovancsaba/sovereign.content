/**
 * HiTL delivery policy for self-heal / self-improve.
 *
 * Smart delivery classifies each proposed action:
 * - auto: safe deterministic CLI the agent may run without asking the operator
 * - agent_execute: agent judgment + evidence bar, no operator approval if honesty holds
 * - hitl_review: must surface a detailed report and wait for operator review
 */
export type DeliveryClass = "auto" | "agent_execute" | "hitl_review";

export type DeliveryRisk = "low" | "medium" | "high";

export type DeliveryDecision = {
  delivery: DeliveryClass;
  risk: DeliveryRisk;
  why: string;
  operatorPrompt?: string;
};

/** Action keys used by digest / status — keep stable for timers. */
export type DeliveryActionKey =
  | "quality_loop_about"
  | "about_curate_facts"
  | "media_curate_evidence"
  | "contact_enrich_evidence"
  | "serving_reconcile"
  | "hygiene_geo_nominatim"
  | "find_record_zero_result"
  | "find_seed_evidence"
  | "self_heal_brief_research"
  | "operator_feedback_about"
  | "ssot_contract_draft"
  | "process_doctrine_change"
  | "threshold_or_policy_change"
  | "engine_merge_or_forever"
  | "invent_facts"
  | "thin_single_source_seed";

const TABLE: Record<
  DeliveryActionKey,
  Omit<DeliveryDecision, "operatorPrompt"> & { operatorPrompt?: string }
> = {
  quality_loop_about: {
    delivery: "auto",
    risk: "low",
    why: "Deterministic About score/improve/encode; never invents amenities; chrome strip + curated facts only.",
  },
  about_curate_facts: {
    delivery: "auto",
    risk: "low",
    why: "Drafts from listing facts + research sourceText already on the listing; Mongo curated only.",
  },
  media_curate_evidence: {
    delivery: "auto",
    risk: "low",
    why: "Rehosts website OG / listing OG when present; empty skip is success; no invented photos.",
  },
  contact_enrich_evidence: {
    delivery: "auto",
    risk: "low",
    why: "Fills blank phone/website/email only from card headers or promotable sourceUrl; no_evidence stays a gap.",
  },
  serving_reconcile: {
    delivery: "auto",
    risk: "low",
    why: "Projection refresh of already-written Mongo; no content invention.",
  },
  hygiene_geo_nominatim: {
    delivery: "auto",
    risk: "low",
    why: "Nominatim upgrade for street-level lines only; unresolved stays unresolved.",
  },
  find_record_zero_result: {
    delivery: "auto",
    risk: "low",
    why: "Honest cooldown after a completed evidence search; never invents a venue to avoid zero-result.",
  },
  find_seed_evidence: {
    delivery: "agent_execute",
    risk: "medium",
    why: "Agent must clear the evidence bar (named venue, pin, contact/URL, prefer two sources). No HiTL if bar is met.",
    operatorPrompt:
      "Review only if the seed is single-source, launching-only, or contact was inferred rather than printed.",
  },
  self_heal_brief_research: {
    delivery: "agent_execute",
    risk: "medium",
    why: "WebSearch to close contact/media/geo evidence walls; apply only printed facts.",
  },
  operator_feedback_about: {
    delivery: "hitl_review",
    risk: "medium",
    why: "Operator notes must not be pasted into About. Quality-loop may strip chrome / prefer curated; product-intent notes need review.",
    operatorPrompt: "Confirm whether the /stats note is chrome/debt vs a product copy change you want published.",
  },
  ssot_contract_draft: {
    delivery: "hitl_review",
    risk: "high",
    why: "Portable Jobs/Cursor/Doctrine contracts affect every vertical. Draft OK; merge to SSOT main needs your accept.",
    operatorPrompt: "Accept, revise, or reject the draft portable contract before it lands on sovereign.content main.",
  },
  process_doctrine_change: {
    delivery: "hitl_review",
    risk: "high",
    why: "Changes honesty bar, autonomy model, or publish authority — operator-owned.",
    operatorPrompt: "Review doctrine impact before any SSOT or engine change.",
  },
  threshold_or_policy_change: {
    delivery: "hitl_review",
    risk: "high",
    why: "ABOUT_QUALITY_TARGET, FIND defer thresholds, media policy defaults, HiTL table itself.",
    operatorPrompt: "Approve the new threshold/policy and the reason it should become portable.",
  },
  engine_merge_or_forever: {
    delivery: "hitl_review",
    risk: "high",
    why: "Do not merge ClassScout forever Find with padel until-found without an explicit product decision.",
    operatorPrompt: "Confirm twin posture (keep forever vs adopt until-found complement only).",
  },
  invent_facts: {
    delivery: "hitl_review",
    risk: "high",
    why: "Forbidden path — phones/emails/ages/court counts/venues without a public evidence page.",
    operatorPrompt: "Do not approve invention. Point the agent at evidence or leave the gap.",
  },
  thin_single_source_seed: {
    delivery: "hitl_review",
    risk: "medium",
    why: "Evidence bar prefers two sources; single directory scrapes and hotel amenity mentions need your call.",
    operatorPrompt: "Approve seed, ask for a second source, or record zero-result.",
  },
};

export function classifyDelivery(action: DeliveryActionKey): DeliveryDecision {
  const row = TABLE[action];
  return {
    delivery: row.delivery,
    risk: row.risk,
    why: row.why,
    ...(row.operatorPrompt ? { operatorPrompt: row.operatorPrompt } : {}),
  };
}

/** Map a quality recommendation kind to a delivery action. */
export function deliveryActionForQualityKind(kind: string): DeliveryActionKey {
  switch (kind) {
    case "about_thin":
    case "about_chrome":
    case "about_template":
    case "about_url":
    case "about_contact_leak":
      return "quality_loop_about";
    case "operator_feedback":
      return "operator_feedback_about";
    case "contact_gap":
    case "research_needed":
    case "media_thin":
    case "geo_weak":
      return "self_heal_brief_research";
    default:
      return "self_heal_brief_research";
  }
}
