/**
 * Self-heal status for the catalog loop (Sovereign Content catalog:self-heal twin).
 *
 * When About / priority Improve / operator-feedback / contact debt is hot, FIND
 * should defer and heal first — empty quality ticks with a growing Find queue is
 * the wrong order.
 */
const fs = require("fs");
const {
  DATA_DIR,
  ensureDir,
  RECOMMENDATIONS_PATH,
  FEEDBACK_DIR,
  EVENTS_PATH,
} = require("./paths.cjs");
const { loadRecommendations, openRecommendations } = require("./recommendationStore.cjs");
const { ABOUT_QUALITY_TARGET } = require("./aboutQualityScore.cjs");
const { priorityGapsOf } = require("./listingQualityGaps.cjs");

const SELF_HEAL_STATUS_PATH =
  process.env.CATALOG_SELF_HEAL_STATUS || `${DATA_DIR}/self-heal-status.json`;

function weakAboutThreshold() {
  return Math.max(1, Number(process.env.CATALOG_SELF_HEAL_WEAK_ABOUT_THRESHOLD || 25));
}

function priorityDebtThreshold() {
  return Math.max(1, Number(process.env.CATALOG_SELF_HEAL_PRIORITY_THRESHOLD || 40));
}

function contactDebtThreshold() {
  return Math.max(1, Number(process.env.CATALOG_SELF_HEAL_CONTACT_THRESHOLD || 30));
}

function operatorFeedbackThreshold() {
  return Math.max(1, Number(process.env.CATALOG_SELF_HEAL_OPERATOR_FEEDBACK_THRESHOLD || 1));
}

function countPendingOperatorFeedbackFiles() {
  try {
    return fs
      .readdirSync(FEEDBACK_DIR)
      .filter((f) => f.endsWith(".json") && !f.startsWith("."))
      .length;
  } catch {
    return 0;
  }
}

/** Open recommendations that came from operator /stats feedback (never paste notes into About). */
function countOpenOperatorFeedbackRecs(openRecs) {
  return openRecs.filter((r) => r && r.source === "operator_feedback" && r.status === "open").length;
}

function countContactDebt(openRecs) {
  return openRecs.filter(
    (r) =>
      Array.isArray(r.gaps) &&
      (r.gaps.includes("blank_contacts") || r.gaps.includes("blank_email") || r.gaps.includes("missing_website"))
  ).length;
}

/**
 * @param {{
 *   openRecs?: object[],
 *   softAboutCount?: number,
 *   contactBlankCount?: number,
 *   researchDebtCount?: number,
 *   pendingFeedbackFiles?: number,
 *   forceFind?: boolean,
 * }} input
 */
function evaluateSelfHeal(input = {}) {
  const openRecs = input.openRecs || openRecommendations(loadRecommendations());
  const weakAboutOpen = openRecs.filter(
    (r) => Array.isArray(r.gaps) && r.gaps.includes("weak_description")
  ).length;
  const priorityOpen = openRecs.filter((r) => {
    const gaps = Array.isArray(r.gaps) ? r.gaps : [];
    const fromField = Array.isArray(r.priorityGaps) ? r.priorityGaps : [];
    return priorityGapsOf(gaps.length ? gaps : fromField).length > 0;
  }).length;
  const softAboutCount = Number(input.softAboutCount || 0);
  const contactDebtOpen = countContactDebt(openRecs);
  const contactBlankCount = Number(input.contactBlankCount || 0);
  const researchDebtCount = Number(input.researchDebtCount || 0);
  const operatorFeedbackOpen = countOpenOperatorFeedbackRecs(openRecs);
  const pendingFeedbackFiles =
    typeof input.pendingFeedbackFiles === "number"
      ? input.pendingFeedbackFiles
      : countPendingOperatorFeedbackFiles();

  const weakThreshold = weakAboutThreshold();
  const priorityThreshold = priorityDebtThreshold();
  const contactThreshold = contactDebtThreshold();
  const feedbackThreshold = operatorFeedbackThreshold();

  const aboutDebtHot =
    weakAboutOpen >= weakThreshold || softAboutCount >= weakThreshold;
  const priorityDebtHot = priorityOpen >= priorityThreshold;
  const contactDebtHot =
    contactDebtOpen >= contactThreshold || contactBlankCount >= contactThreshold;
  const operatorFeedbackHot =
    operatorFeedbackOpen >= feedbackThreshold || pendingFeedbackFiles >= feedbackThreshold;
  const researchDebtHot = researchDebtCount >= contactThreshold;

  const debtHot =
    aboutDebtHot || priorityDebtHot || contactDebtHot || operatorFeedbackHot || researchDebtHot;

  const forceFind =
    input.forceFind === true ||
    process.env.CATALOG_SELF_HEAL_FORCE_FIND === "1" ||
    process.env.CATALOG_SELF_HEAL_DEFER_FIND === "0";

  const deferFind = debtHot && !forceFind;

  const briefs = [];
  if (pendingFeedbackFiles > 0 || operatorFeedbackOpen > 0) {
    briefs.push({
      action: "catalog-loop:feedback",
      reason: "operator_feedback",
      detail: `pendingFiles=${pendingFeedbackFiles} openRecs=${operatorFeedbackOpen} — open improve recs; never paste notes into About`,
    });
  }
  if (aboutDebtHot) {
    briefs.push({
      action: "catalog:about-curate",
      reason: "weak_about_debt",
      detail: `weakAboutOpen=${weakAboutOpen} softAboutCount=${softAboutCount} threshold=${weakThreshold}`,
    });
  }
  if (priorityDebtHot || operatorFeedbackHot) {
    briefs.push({
      action: "catalog:quality-loop",
      reason: "priority_improve_debt",
      detail: `priorityOpen=${priorityOpen} operatorFeedbackOpen=${operatorFeedbackOpen}`,
    });
  }
  if (contactDebtHot || researchDebtHot) {
    briefs.push({
      action: "catalog:hygiene --passes contact",
      reason: "contact_research_debt",
      detail: `contactDebtOpen=${contactDebtOpen} contactBlankCount=${contactBlankCount} researchDebt=${researchDebtCount} — evidence only; never invent contacts`,
    });
  }

  return {
    at: new Date().toISOString(),
    aboutQualityTarget: ABOUT_QUALITY_TARGET,
    openRecommendations: openRecs.length,
    weakAboutOpen,
    priorityOpen,
    softAboutCount,
    contactDebtOpen,
    contactBlankCount,
    researchDebtCount,
    operatorFeedbackOpen,
    pendingFeedbackFiles,
    weakAboutThreshold: weakThreshold,
    priorityDebtThreshold: priorityThreshold,
    contactDebtThreshold: contactThreshold,
    operatorFeedbackThreshold: feedbackThreshold,
    aboutDebtHot,
    priorityDebtHot,
    contactDebtHot,
    operatorFeedbackHot,
    researchDebtHot,
    debtHot,
    deferFind,
    briefs,
    recommendationsPath: RECOMMENDATIONS_PATH,
    eventsPath: EVENTS_PATH,
    note:
      "Operator /stats feedback opens improve recommendations — never paste the note into About.",
  };
}

function writeSelfHealStatus(status) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(SELF_HEAL_STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);
  return SELF_HEAL_STATUS_PATH;
}

function readSelfHealStatus() {
  try {
    return JSON.parse(fs.readFileSync(SELF_HEAL_STATUS_PATH, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Whether Find should skip this cycle. Fresh evaluate when no status file / stale.
 * @param {{ maxAgeMs?: number }} [opts]
 */
function shouldDeferFind(opts = {}) {
  if (process.env.CATALOG_SELF_HEAL_FORCE_FIND === "1") return false;
  if (process.env.CATALOG_SELF_HEAL_DEFER_FIND === "0") return false;
  const maxAgeMs = opts.maxAgeMs ?? 30 * 60 * 1000;
  const status = readSelfHealStatus();
  if (status && status.at) {
    const age = Date.now() - Date.parse(status.at);
    if (Number.isFinite(age) && age >= 0 && age <= maxAgeMs && typeof status.deferFind === "boolean") {
      return status.deferFind === true;
    }
  }
  return evaluateSelfHeal().deferFind;
}

module.exports = {
  SELF_HEAL_STATUS_PATH,
  evaluateSelfHeal,
  writeSelfHealStatus,
  readSelfHealStatus,
  shouldDeferFind,
  weakAboutThreshold,
  priorityDebtThreshold,
  contactDebtThreshold,
  operatorFeedbackThreshold,
  countPendingOperatorFeedbackFiles,
  ABOUT_QUALITY_TARGET,
};
