/**
 * Self-heal smart delivery policy — auto vs HitL (owner review).
 *
 * Posture: Human-on-the-Loop. Forever may deliver evidence-only heal actions that
 * cannot invent facts or change public visibility. Anything that hides, quarantines,
 * invents contacts/addresses, publishes new finds, or changes product policy waits
 * for the owner.
 *
 * Binding: evidence over invent · never paste operator notes into About.
 */

/** @typedef {"auto" | "hitl_review"} DeliveryLane */

/**
 * Closed catalog of heal/delivery kinds the controller understands.
 * Unknown kinds default to hitl_review (fail closed).
 */
const DELIVERY_KINDS = Object.freeze({
  ABOUT_CHROME_STRIP: "about_chrome_strip",
  ABOUT_COMPOSE_FROM_FACTS: "about_compose_from_facts",
  CONTACT_FROM_OFFICIAL_PAGE: "contact_from_official_page",
  CONTACT_NO_EVIDENCE_RESEARCH: "contact_no_evidence_research",
  QUALITY_IMPROVE_EVIDENCE: "quality_improve_evidence",
  FEEDBACK_INTAKE_OPEN_REC: "feedback_intake_open_rec",
  SEED_PAUSE_TIER_A: "seed_pause_tier_a",
  GEO_FROM_EXISTING_STREET: "geo_from_existing_street",
  SERVING_RECONCILE: "serving_reconcile",
  DEFER_FIND: "defer_find",
  HIDE_OR_QUARANTINE: "hide_or_quarantine",
  DUPLICATE_TWIN_HIDE: "duplicate_twin_hide",
  ADDRESS_INVENT_OR_GUESS: "address_invent_or_guess",
  ADDRESS_DEAD_END_DECISION: "address_dead_end_decision",
  NEW_FIND_PUBLISH: "new_find_publish",
  UNTIL_FOUND_SEED: "until_found_seed",
  MEDIA_POLICY_CHANGE: "media_policy_change",
  OPERATOR_NOTE_INTO_ABOUT: "operator_note_into_about",
  PROCESS_LESSON_CONFIG: "process_lesson_config",
  BULK_ABOVE_LIMIT: "bulk_above_limit",
});

/**
 * Policy table — lane + why (shown in smart reports).
 * @type {Record<string, { lane: DeliveryLane, why: string, risk: string, ownerQuestion?: string }>}
 */
const POLICY = Object.freeze({
  [DELIVERY_KINDS.ABOUT_CHROME_STRIP]: {
    lane: "auto",
    why: "Strip storefront / meta / chatbot chrome from About using closed detectors — no new facts invented.",
    risk: "low — may leave a shorter About that still needs compose; never invents tone.",
  },
  [DELIVERY_KINDS.ABOUT_COMPOSE_FROM_FACTS]: {
    lane: "auto",
    why: "Rewrite About from listing facts + official sourceText only; soft-below-target stays in queue.",
    risk: "low–medium — bounded compose; quality bar (~75) still gates pass.",
  },
  [DELIVERY_KINDS.CONTACT_FROM_OFFICIAL_PAGE]: {
    lane: "auto",
    why: "Fill phone/website/email only when extractHardContacts finds them on the official homepage.",
    risk: "low — placeholder/contaminated contacts rejected; no OSM invent.",
  },
  [DELIVERY_KINDS.CONTACT_NO_EVIDENCE_RESEARCH]: {
    lane: "hitl_review",
    why: "No page evidence — opening research debt must not invent a phone or email.",
    risk: "high if auto-filled — owner or agent must supply a first-party URL.",
    ownerQuestion: "Approve a research brief (or supply the official contact URL) for these listings?",
  },
  [DELIVERY_KINDS.QUALITY_IMPROVE_EVIDENCE]: {
    lane: "auto",
    why: "Improve lanes that only patch when official-page extractors return evidence.",
    risk: "low — ingest schema + false-positive filters still gate writes.",
  },
  [DELIVERY_KINDS.FEEDBACK_INTAKE_OPEN_REC]: {
    lane: "auto",
    why: "Operator notes open improve recommendations and lessons — never paste into About.",
    risk: "low — structured gaps only; note stays on the rec.",
  },
  [DELIVERY_KINDS.SEED_PAUSE_TIER_A]: {
    lane: "auto",
    why: "Repeated host+skip signatures pause seeds so Find stops thrashing the same failure.",
    risk: "low — reversible by unpausing a seed; no catalog hide.",
  },
  [DELIVERY_KINDS.GEO_FROM_EXISTING_STREET]: {
    lane: "auto",
    why: "Geocode when a usable street line already exists — does not invent the street.",
    risk: "low — Nominatim/paid tier still bounded.",
  },
  [DELIVERY_KINDS.SERVING_RECONCILE]: {
    lane: "auto",
    why: "Refresh public serving projection after content already written in Mongo.",
    risk: "low — projection only; no catalog fact invent.",
  },
  [DELIVERY_KINDS.DEFER_FIND]: {
    lane: "auto",
    why: "Pause Find while heal debt is hot — growth waits for quality.",
    risk: "low — override with CATALOG_SELF_HEAL_FORCE_FIND=1.",
  },
  [DELIVERY_KINDS.HIDE_OR_QUARANTINE]: {
    lane: "hitl_review",
    why: "Taking a listing off the public surface is a product decision, not an evidence extract.",
    risk: "high — parents lose a card; needs owner intent.",
    ownerQuestion: "Hide or quarantine these listings? (tag: not_public_worthy / weak About quarantine)",
  },
  [DELIVERY_KINDS.DUPLICATE_TWIN_HIDE]: {
    lane: "hitl_review",
    why: "Strong-identity duplicate hide picks a survivor — wrong pick costs a real venue.",
    risk: "high — confirm which twin stays public.",
    ownerQuestion: "Which twin should stay public (same phone+street)?",
  },
  [DELIVERY_KINDS.ADDRESS_INVENT_OR_GUESS]: {
    lane: "hitl_review",
    why: "Street lines must come from official pages — never invent or Maps-guess.",
    risk: "high — wrong pin misleads parents.",
    ownerQuestion: "Supply an official URL with a street, or accept research zero-result?",
  },
  [DELIVERY_KINDS.ADDRESS_DEAD_END_DECISION]: {
    lane: "hitl_review",
    why: "Improve exhausted address attempts — auto-retry burns cycles without new evidence.",
    risk: "medium–high — choose research brief, quarantine, or leave inventory-only.",
    ownerQuestion: "For exhausted bad_address rows: research pack, quarantine, or leave as-is?",
  },
  [DELIVERY_KINDS.NEW_FIND_PUBLISH]: {
    lane: "hitl_review",
    why: "Publishing a new listing changes the public catalog — owner reviews sparse/new-city finds.",
    risk: "high — forever Find stays product-default auto only when seed queue + gates already allow it.",
    ownerQuestion: "Approve this until-found / new-city seed for publish?",
  },
  [DELIVERY_KINDS.UNTIL_FOUND_SEED]: {
    lane: "hitl_review",
    why: "Sparse until-found campaigns need agent research + owner confirmation on first seed.",
    risk: "high — evidence bar must be human-checked on first market entry.",
    ownerQuestion: "Accept the first evidence-grade seed from this campaign?",
  },
  [DELIVERY_KINDS.MEDIA_POLICY_CHANGE]: {
    lane: "hitl_review",
    why: "Switching off generated_art_only to scrape venue photos is a product policy change.",
    risk: "high — brand / rights / parent expectation.",
    ownerQuestion: "Keep generated_art_only, or enable own-photo / OG scrape?",
  },
  [DELIVERY_KINDS.OPERATOR_NOTE_INTO_ABOUT]: {
    lane: "hitl_review",
    why: "Operator prose is instruction — pasting it into About invents recommendation tone.",
    risk: "high — forbidden by SC / ClassScout binding.",
    ownerQuestion: "Rewrite About from official evidence instead? (note stays on the rec)",
  },
  [DELIVERY_KINDS.PROCESS_LESSON_CONFIG]: {
    lane: "hitl_review",
    why: "Extractor / config / pack changes are durable process edits — owner accepts.",
    risk: "medium — wrong soften breaks gates.",
    ownerQuestion: "Accept this process lesson as a config/extractor change?",
  },
  [DELIVERY_KINDS.BULK_ABOVE_LIMIT]: {
    lane: "hitl_review",
    why: "Large auto batches can cascade wrong — owner raises the limit deliberately.",
    risk: "medium — blast radius.",
    ownerQuestion: "Raise the auto batch limit for this heal tick?",
  },
});

function autoBatchLimit() {
  return Math.max(1, Number(process.env.CATALOG_SELF_HEAL_AUTO_BATCH_LIMIT || 40));
}

/**
 * Map a self-heal brief reason → delivery kind(s).
 * @param {{ action?: string, reason?: string }} brief
 * @returns {string[]}
 */
function kindsForBrief(brief) {
  const reason = String((brief && brief.reason) || "");
  const action = String((brief && brief.action) || "");
  if (reason === "operator_feedback" || action.includes("feedback")) {
    return [DELIVERY_KINDS.FEEDBACK_INTAKE_OPEN_REC];
  }
  if (reason === "weak_about_debt" || action.includes("about-curate")) {
    return [DELIVERY_KINDS.ABOUT_CHROME_STRIP, DELIVERY_KINDS.ABOUT_COMPOSE_FROM_FACTS];
  }
  if (reason === "priority_improve_debt" || action.includes("quality-loop")) {
    return [DELIVERY_KINDS.QUALITY_IMPROVE_EVIDENCE, DELIVERY_KINDS.ADDRESS_DEAD_END_DECISION];
  }
  if (reason === "contact_research_debt" || action.includes("contact")) {
    return [DELIVERY_KINDS.CONTACT_FROM_OFFICIAL_PAGE, DELIVERY_KINDS.CONTACT_NO_EVIDENCE_RESEARCH];
  }
  return [DELIVERY_KINDS.PROCESS_LESSON_CONFIG];
}

/**
 * @param {string} kind
 */
function classifyKind(kind) {
  const row = POLICY[kind];
  if (!row) {
    return {
      kind,
      lane: /** @type {DeliveryLane} */ ("hitl_review"),
      why: "Unknown heal kind — fail closed to owner review.",
      risk: "unknown",
      ownerQuestion: "Is this action safe to automate under evidence-only rules?",
    };
  }
  return { kind, ...row };
}

/**
 * Classify a proposed delivery unit.
 * @param {{
 *   kind: string,
 *   providerIds?: string[],
 *   count?: number,
 *   hasOfficialEvidence?: boolean,
 *   wouldChangeVisibility?: boolean,
 *   wouldInventFacts?: boolean,
 *   fromOperatorNote?: boolean,
 * }} unit
 */
function classifyDelivery(unit) {
  const base = classifyKind(unit.kind);
  const count = Number(unit.count || (unit.providerIds && unit.providerIds.length) || 0);
  const notes = [];

  let lane = base.lane;
  let ownerQuestion = base.ownerQuestion || null;

  if (unit.wouldInventFacts === true) {
    lane = "hitl_review";
    notes.push("flagged wouldInventFacts — cannot auto-deliver");
    ownerQuestion = ownerQuestion || "How should we obtain first-party evidence instead of inventing?";
  }
  if (unit.wouldChangeVisibility === true) {
    lane = "hitl_review";
    notes.push("visibility / quarantine change requires owner");
  }
  if (unit.fromOperatorNote === true && unit.kind === DELIVERY_KINDS.ABOUT_COMPOSE_FROM_FACTS) {
    lane = "hitl_review";
    notes.push("operator note must not drive About paste — evidence compose only after review");
    ownerQuestion = POLICY[DELIVERY_KINDS.OPERATOR_NOTE_INTO_ABOUT].ownerQuestion;
  }
  if (
    unit.kind === DELIVERY_KINDS.CONTACT_FROM_OFFICIAL_PAGE &&
    unit.hasOfficialEvidence === false
  ) {
    lane = "hitl_review";
    notes.push("no official-page evidence — escalate to research");
  }
  if (count > autoBatchLimit() && lane === "auto") {
    lane = "hitl_review";
    notes.push(`batch ${count} exceeds auto limit ${autoBatchLimit()}`);
    ownerQuestion = POLICY[DELIVERY_KINDS.BULK_ABOVE_LIMIT].ownerQuestion;
  }

  return {
    ...base,
    lane,
    count,
    providerIds: unit.providerIds || [],
    notes,
    ownerQuestion,
    autoBatchLimit: autoBatchLimit(),
  };
}

/**
 * Attach delivery classification to each self-heal brief.
 * @param {object[]} briefs
 * @param {{ openRecs?: object[], exhaustedAddressIds?: string[] }} [ctx]
 */
function classifyBriefs(briefs, ctx = {}) {
  const openRecs = ctx.openRecs || [];
  const exhaustedAddressIds = ctx.exhaustedAddressIds || [];
  const out = [];

  for (const brief of briefs || []) {
    const kinds = kindsForBrief(brief);
    const deliveries = kinds.map((kind) => {
      const unit = {
        kind,
        count: 0,
        providerIds: [],
        hasOfficialEvidence: undefined,
        wouldChangeVisibility: kind === DELIVERY_KINDS.HIDE_OR_QUARANTINE,
        wouldInventFacts: kind === DELIVERY_KINDS.ADDRESS_INVENT_OR_GUESS,
        fromOperatorNote: brief.reason === "operator_feedback",
      };

      if (kind === DELIVERY_KINDS.ADDRESS_DEAD_END_DECISION) {
        unit.providerIds = exhaustedAddressIds.slice(0, 20);
        unit.count = exhaustedAddressIds.length;
      } else if (kind === DELIVERY_KINDS.CONTACT_NO_EVIDENCE_RESEARCH) {
        const ids = openRecs
          .filter((r) => r && r.researchDebt === "no_evidence")
          .map((r) => r.providerId)
          .filter(Boolean);
        unit.providerIds = ids.slice(0, 20);
        unit.count = ids.length;
        unit.hasOfficialEvidence = false;
      } else if (kind === DELIVERY_KINDS.QUALITY_IMPROVE_EVIDENCE) {
        const ids = openRecs
          .filter((r) => r && r.status === "open")
          .map((r) => r.providerId)
          .filter(Boolean);
        unit.providerIds = ids.slice(0, 20);
        unit.count = ids.length;
        unit.hasOfficialEvidence = true;
      } else if (
        kind === DELIVERY_KINDS.ABOUT_CHROME_STRIP ||
        kind === DELIVERY_KINDS.ABOUT_COMPOSE_FROM_FACTS
      ) {
        const ids = openRecs
          .filter((r) => Array.isArray(r.gaps) && r.gaps.includes("weak_description"))
          .map((r) => r.providerId)
          .filter(Boolean);
        unit.providerIds = ids.slice(0, 20);
        unit.count = Math.max(ids.length, Number(brief.softAboutHint || 0));
      } else if (kind === DELIVERY_KINDS.CONTACT_FROM_OFFICIAL_PAGE) {
        const ids = openRecs
          .filter(
            (r) =>
              Array.isArray(r.gaps) &&
              (r.gaps.includes("blank_contacts") ||
                r.gaps.includes("blank_email") ||
                r.gaps.includes("missing_website")) &&
              r.researchDebt !== "no_evidence"
          )
          .map((r) => r.providerId)
          .filter(Boolean);
        unit.providerIds = ids.slice(0, 20);
        unit.count = ids.length;
        unit.hasOfficialEvidence = true;
      } else if (kind === DELIVERY_KINDS.FEEDBACK_INTAKE_OPEN_REC) {
        unit.count = Number(brief.pendingHint || 0);
      }

      return classifyDelivery(unit);
    });

    const auto = deliveries.filter((d) => d.lane === "auto");
    const hitl = deliveries.filter((d) => d.lane === "hitl_review");

    out.push({
      ...brief,
      delivery: {
        auto,
        hitlReview: hitl,
        canAutoDeliver: auto.length > 0,
        needsOwnerReview: hitl.length > 0,
      },
    });
  }

  return out;
}

/**
 * Flatten unique auto / hitl actions across classified briefs.
 * @param {ReturnType<typeof classifyBriefs>} classifiedBriefs
 */
function deliveryQueues(classifiedBriefs) {
  const auto = [];
  const hitlReview = [];
  const seenA = new Set();
  const seenH = new Set();
  for (const b of classifiedBriefs || []) {
    for (const d of (b.delivery && b.delivery.auto) || []) {
      const k = `${d.kind}:${(d.providerIds || []).slice(0, 3).join(",")}`;
      if (!seenA.has(k)) {
        seenA.add(k);
        auto.push({ ...d, fromBrief: b.action, reason: b.reason });
      }
    }
    for (const d of (b.delivery && b.delivery.hitlReview) || []) {
      const k = `${d.kind}:${(d.providerIds || []).slice(0, 3).join(",")}`;
      if (!seenH.has(k)) {
        seenH.add(k);
        hitlReview.push({ ...d, fromBrief: b.action, reason: b.reason });
      }
    }
  }
  return { auto, hitlReview };
}

module.exports = {
  DELIVERY_KINDS,
  POLICY,
  autoBatchLimit,
  kindsForBrief,
  classifyKind,
  classifyDelivery,
  classifyBriefs,
  deliveryQueues,
};
