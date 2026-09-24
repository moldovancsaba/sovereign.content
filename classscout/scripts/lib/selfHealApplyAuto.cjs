/**
 * Execute only auto-lane self-heal deliveries (evidence-only, no HitL).
 * HitL items are written to the review packet and never executed here.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const { buildSmartReport } = require("./selfHealSmartReport.cjs");

const ROOT = path.resolve(__dirname, "../../..");

function runNode(relScript, args = [], env = {}) {
  const script = path.join(ROOT, relScript);
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  return { ok: r.status === 0, status: r.status };
}

function runNpm(script, extraArgs = []) {
  const r = spawnSync("npm", ["run", script, "--", ...extraArgs], {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
  });
  return { ok: r.status === 0, status: r.status };
}

/**
 * @param {object} status
 * @param {{ dryRun?: boolean, openRecs?: object[] }} [opts]
 */
function applyAutoDeliveries(status, opts = {}) {
  const dry = opts.dryRun === true || process.env.CATALOG_LOOP_DRY_RUN === "1";
  const report = buildSmartReport(status, {
    openRecs: opts.openRecs,
    writeFiles: true,
  });
  const kinds = new Set(report.delivery.auto.map((d) => d.kind));
  const executed = [];
  const skippedHitl = report.delivery.hitlReview.map((d) => ({
    kind: d.kind,
    reason: "hitl_review",
    ownerQuestion: d.ownerQuestion,
    count: d.count,
  }));

  function note(kind, result) {
    executed.push({ kind, dryRun: dry, ...result });
  }

  if (kinds.has("feedback_intake_open_rec") || status.pendingFeedbackFiles > 0) {
    note(
      "feedback_intake_open_rec",
      dry
        ? { ok: true, skipped: "dry-run", command: "feedback-intake.cjs" }
        : runNode("scripts/catalog-loop/feedback-intake.cjs")
    );
  }

  if (kinds.has("about_chrome_strip") || kinds.has("about_compose_from_facts") || status.aboutDebtHot) {
    const args = ["--limit", String(process.env.CATALOG_DESC_REPAIR_LIMIT || 25)];
    if (dry) args.push("--dry-run");
    note("about_curate", runNpm("catalog:about-curate", args));
  }

  if (kinds.has("quality_improve_evidence") || status.priorityDebtHot) {
    const args = dry ? ["--dry-run"] : [];
    note("quality_loop", runNpm("catalog:quality-loop", args));
  }

  if (kinds.has("contact_from_official_page") || status.contactDebtHot) {
    const args = ["--passes", "contact", "--limit", String(process.env.CATALOG_CONTACT_ENRICH_LIMIT || 15)];
    if (dry) args.push("--dry-run");
    note("contact_enrich", runNpm("catalog:hygiene", args));
  }

  if (kinds.has("serving_reconcile")) {
    const args = ["--limit", String(process.env.CATALOG_SERVING_RECONCILE_LIMIT || 200)];
    if (!dry && process.env.CATALOG_SERVING_RECONCILE_APPLY === "1") args.push("--apply");
    note(
      "serving_reconcile",
      dry
        ? { ok: true, skipped: "dry-run-default", command: "serving:reconcile" }
        : runNpm("serving:reconcile", args)
    );
  }

  return {
    dryRun: dry,
    deferFind: status.deferFind,
    executed,
    skippedHitl,
    reportPaths: report.paths,
    ownerQuestions: report.ownerQuestions,
    verdict: report.verdict,
  };
}

module.exports = {
  applyAutoDeliveries,
};
