/**
 * Smart self-heal report — reasoned, broken-down delivery plan (not a KPI dump).
 *
 * Reads status + open recommendations + recent events and writes a markdown brief
 * an agent (or the owner) can act on: verdict, evidence, auto vs HitL queues,
 * owner questions, and next prove steps.
 */
const fs = require("fs");
const path = require("path");
const { DATA_DIR, ensureDir, FEEDBACK_DIR } = require("./paths.cjs");
const { loadRecommendations, openRecommendations } = require("./recommendationStore.cjs");
const { classifyBriefs, deliveryQueues } = require("./selfHealDeliveryPolicy.cjs");
const { readEventsSince } = require("./events.cjs");

const REPORT_DIR =
  process.env.CATALOG_SELF_HEAL_REPORT_DIR || path.join(DATA_DIR, "self-heal-reports");

function gapHistogram(openRecs) {
  const hist = {};
  for (const r of openRecs || []) {
    for (const g of r.gaps || []) hist[g] = (hist[g] || 0) + 1;
  }
  return Object.entries(hist)
    .sort((a, b) => b[1] - a[1])
    .map(([gap, n]) => ({ gap, n }));
}

function exhaustedAddressIds(allRecs) {
  return (allRecs || [])
    .filter(
      (r) =>
        r &&
        (r.status === "exhausted" || (r.status === "open" && (r.attempts || 0) >= 4)) &&
        Array.isArray(r.gaps) &&
        r.gaps.includes("bad_address")
    )
    .map((r) => r.providerId)
    .filter(Boolean);
}

function sampleOpen(openRecs, gap, limit = 5) {
  return (openRecs || [])
    .filter((r) => Array.isArray(r.gaps) && (!gap || r.gaps.includes(gap)))
    .slice(0, limit)
    .map((r) => ({
      id: r.providerId,
      name: r.name || null,
      gaps: r.gaps || [],
      attempts: r.attempts || 0,
      source: r.source || "audit",
      researchDebt: r.researchDebt || null,
      operatorNote: r.operatorNote ? String(r.operatorNote).slice(0, 160) : null,
    }));
}

function recentSignal(hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const events = readEventsSince(since, 20_000);
  const counts = {};
  for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1;
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([type, n]) => ({ type, n }));
  return {
    hours,
    eventCount: events.length,
    top,
    improveApplied: counts.improve_apply || 0,
    improveReject: counts.improve_reject || 0,
    findPublish: counts.find_publish || 0,
    findSkip: counts.find_skip || 0,
    findDeferred: counts.find_deferred_self_heal || 0,
    operatorFeedback: counts.operator_feedback || 0,
    contactApplied: counts.contact_enrich_applied || 0,
    contactNoEvidence: counts.contact_enrich_no_evidence || 0,
  };
}

function pendingFeedbackFiles() {
  try {
    return fs
      .readdirSync(FEEDBACK_DIR)
      .filter((f) => f.endsWith(".json") && !f.startsWith("."))
      .slice(0, 20);
  } catch {
    return [];
  }
}

/**
 * Build a reasoned verdict from status + context (not a template with blank slots).
 * @param {object} status
 * @param {{ gaps: {gap:string,n:number}[], recent: object, exhaustedN: number }} ctx
 */
function composeVerdict(status, ctx) {
  const parts = [];
  if (!status.debtHot) {
    parts.push(
      `Debt is cool under current thresholds (priority open ${status.priorityOpen}/${status.priorityDebtThreshold}, ` +
        `weak About ${status.weakAboutOpen}/${status.weakAboutThreshold}, contact ${status.contactDebtOpen}/${status.contactDebtThreshold}). ` +
        `Find may continue — but cool thresholds do not mean the catalog is finished.`
    );
  } else {
    const hot = [];
    if (status.aboutDebtHot) hot.push("About");
    if (status.priorityDebtHot) hot.push("priority Improve");
    if (status.contactDebtHot) hot.push("contact");
    if (status.operatorFeedbackHot) hot.push("operator feedback");
    if (status.researchDebtHot) hot.push("research");
    parts.push(
      `Heal-first: ${hot.join(" + ")} debt is hot — Find should defer until auto deliveries clear and HitL items are decided.`
    );
  }

  const topGap = ctx.gaps[0];
  if (topGap) {
    parts.push(
      `The open queue is dominated by \`${topGap.gap}\` (${topGap.n} of ${status.openRecommendations} open). ` +
        (topGap.gap === "bad_address"
          ? "Address gaps need official-page streets — auto Improve only helps when evidence exists; exhausted rows need your decision, not more blind retries."
          : topGap.gap === "weak_description"
            ? "About debt should run chrome-strip + fact compose on auto; soft locality-only copy must not clear the quality bar."
            : "Soft blanks (trial/sessions/price) can wait behind priority gaps — do not invent them.")
    );
  }

  if (ctx.exhaustedN > 0) {
    parts.push(
      `${ctx.exhaustedN} address row(s) are exhausted or near max attempts — these are HitL, not forever thrash.`
    );
  }

  if (ctx.recent.operatorFeedback === 0 && status.pendingFeedbackFiles === 0) {
    parts.push(
      "Operator feedback channel is idle (no drop-folder files, no operator_feedback events in the recent window). Stats card notes still live in a separate Lite store until the bridge lands."
    );
  }

  if (ctx.recent.improveApplied === 0 && ctx.recent.eventCount > 0) {
    parts.push(
      `Last ${ctx.recent.hours}h: Improve applied ${ctx.recent.improveApplied} patches while Find published ${ctx.recent.findPublish} — growth may be outrunning lasting heal.`
    );
  }

  return parts.join(" ");
}

/**
 * @param {object} status evaluateSelfHeal output
 * @param {{ openRecs?: object[], allRecs?: object[], writeFiles?: boolean }} [opts]
 */
function buildSmartReport(status, opts = {}) {
  const recDoc = opts.allRecs
    ? { recommendations: opts.allRecs }
    : loadRecommendations();
  const allRecs = recDoc.recommendations || [];
  const openRecs = opts.openRecs || openRecommendations(recDoc);
  const gaps = gapHistogram(openRecs);
  const exhausted = exhaustedAddressIds(allRecs);
  const recent = recentSignal(24);
  const pendingFiles = pendingFeedbackFiles();

  const briefsIn = (status.briefs || []).map((b) => ({
    ...b,
    softAboutHint: status.softAboutCount,
    pendingHint: status.pendingFeedbackFiles,
  }));
  const classifiedBriefs = classifyBriefs(briefsIn, {
    openRecs,
    exhaustedAddressIds: exhausted,
  });
  const queues = deliveryQueues(classifiedBriefs);

  // Always surface structural HitL items even when debt is "cool"
  if (exhausted.length && !queues.hitlReview.some((d) => d.kind === "address_dead_end_decision")) {
    const { classifyDelivery, DELIVERY_KINDS } = require("./selfHealDeliveryPolicy.cjs");
    queues.hitlReview.push(
      classifyDelivery({
        kind: DELIVERY_KINDS.ADDRESS_DEAD_END_DECISION,
        providerIds: exhausted.slice(0, 20),
        count: exhausted.length,
      })
    );
    queues.hitlReview[queues.hitlReview.length - 1].fromBrief = "structural";
    queues.hitlReview[queues.hitlReview.length - 1].reason = "exhausted_address";
  }

  const verdict = composeVerdict(status, {
    gaps,
    recent,
    exhaustedN: exhausted.length,
  });

  const ownerQuestions = [
    ...new Set(
      queues.hitlReview
        .map((d) => d.ownerQuestion)
        .filter(Boolean)
    ),
  ];

  const report = {
    job: "catalog:self-heal",
    mode: "smart-report",
    at: new Date().toISOString(),
    verdict,
    posture: {
      humanOnTheLoop: true,
      evidenceOverInvent: true,
      neverPasteOperatorNotesIntoAbout: true,
      generatedArtOnlyDefault: true,
      foreverFindDefault: true,
    },
    debt: {
      debtHot: status.debtHot,
      deferFind: status.deferFind,
      aboutDebtHot: status.aboutDebtHot,
      priorityDebtHot: status.priorityDebtHot,
      contactDebtHot: status.contactDebtHot,
      operatorFeedbackHot: status.operatorFeedbackHot,
      researchDebtHot: status.researchDebtHot,
      openRecommendations: status.openRecommendations,
      weakAboutOpen: status.weakAboutOpen,
      softAboutCount: status.softAboutCount,
      priorityOpen: status.priorityOpen,
      contactDebtOpen: status.contactDebtOpen,
      researchDebtCount: status.researchDebtCount,
      operatorFeedbackOpen: status.operatorFeedbackOpen,
      pendingFeedbackFiles: status.pendingFeedbackFiles,
      thresholds: {
        weakAbout: status.weakAboutThreshold,
        priority: status.priorityDebtThreshold,
        contact: status.contactDebtThreshold,
        operatorFeedback: status.operatorFeedbackThreshold,
      },
    },
    openGapBreakdown: gaps,
    samples: {
      badAddress: sampleOpen(openRecs, "bad_address"),
      weakDescription: sampleOpen(openRecs, "weak_description"),
      blankContacts: sampleOpen(openRecs, "blank_contacts"),
      operatorFeedback: openRecs
        .filter((r) => r.source === "operator_feedback")
        .slice(0, 5)
        .map((r) => ({
          id: r.providerId,
          gaps: r.gaps,
          note: r.operatorNote ? String(r.operatorNote).slice(0, 200) : null,
        })),
      exhaustedAddress: exhausted.slice(0, 10),
      pendingFeedbackFiles: pendingFiles,
    },
    recent24h: recent,
    delivery: {
      auto: queues.auto,
      hitlReview: queues.hitlReview,
      summary: {
        autoKinds: queues.auto.length,
        hitlKinds: queues.hitlReview.length,
        autoProviderHint: queues.auto.reduce((n, d) => n + (d.count || 0), 0),
        hitlProviderHint: queues.hitlReview.reduce((n, d) => n + (d.count || 0), 0),
      },
    },
    classifiedBriefs,
    ownerQuestions,
    nextSteps: {
      autoCommands: buildAutoCommands(queues.auto, status),
      reviewPacketPath: null,
      prove: [
        "npm run catalog:self-heal -- --report",
        "npm run catalog:self-heal -- --apply-auto --dry-run",
        "npm run catalog:about-curate -- --dry-run --limit 10",
        "npm run catalog:hygiene -- --dry-run --passes contact --limit 10",
      ],
    },
  };

  report.markdown = renderMarkdown(report);

  if (opts.writeFiles !== false) {
    ensureDir(REPORT_DIR);
    const stamp = report.at.replace(/[:.]/g, "-");
    const mdPath = path.join(REPORT_DIR, `${stamp}.md`);
    const jsonPath = path.join(REPORT_DIR, `${stamp}.json`);
    const latestMd = path.join(REPORT_DIR, "latest.md");
    const latestJson = path.join(REPORT_DIR, "latest.json");
    const reviewPath = path.join(REPORT_DIR, "review-packet-latest.json");

    fs.writeFileSync(mdPath, report.markdown);
    fs.writeFileSync(jsonPath, `${JSON.stringify(omitMarkdown(report), null, 2)}\n`);
    fs.writeFileSync(latestMd, report.markdown);
    fs.writeFileSync(latestJson, `${JSON.stringify(omitMarkdown(report), null, 2)}\n`);
    fs.writeFileSync(
      reviewPath,
      `${JSON.stringify(
        {
          at: report.at,
          verdict: report.verdict,
          ownerQuestions: report.ownerQuestions,
          hitlReview: report.delivery.hitlReview,
          samples: report.samples,
        },
        null,
        2
      )}\n`
    );
    report.paths = { mdPath, jsonPath, latestMd, latestJson, reviewPath };
    report.nextSteps.reviewPacketPath = reviewPath;
  }

  return report;
}

function omitMarkdown(report) {
  const { markdown: _markdown, ...rest } = report;
  return rest;
}

function buildAutoCommands(autoQueue, status) {
  const cmds = [];
  const kinds = new Set(autoQueue.map((d) => d.kind));
  if (kinds.has("feedback_intake_open_rec") || status.pendingFeedbackFiles > 0) {
    cmds.push("node scripts/catalog-loop/feedback-intake.cjs");
  }
  if (kinds.has("about_chrome_strip") || kinds.has("about_compose_from_facts") || status.aboutDebtHot) {
    cmds.push("npm run catalog:about-curate -- --limit 25");
  }
  if (kinds.has("quality_improve_evidence") || status.priorityDebtHot) {
    cmds.push("npm run catalog:quality-loop");
  }
  if (kinds.has("contact_from_official_page") || status.contactDebtHot) {
    cmds.push("npm run catalog:hygiene -- --passes contact --limit 15");
  }
  if (status.deferFind || kinds.has("defer_find")) {
    cmds.push("# Find deferred this cycle (find-cycle honors shouldDeferFind)");
  }
  if (kinds.has("serving_reconcile")) {
    cmds.push("npm run serving:reconcile -- --limit 200");
  }
  return cmds;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# Self-heal smart report`);
  lines.push("");
  lines.push(`_Generated ${report.at}_`);
  lines.push("");
  lines.push(`## Verdict`);
  lines.push("");
  lines.push(report.verdict);
  lines.push("");
  lines.push(`## Posture`);
  lines.push("");
  lines.push(
    `- Human-**on**-the-loop (auto evidence-only; you decide hides / invents / new publishes)`
  );
  lines.push(`- Evidence over invent · never paste operator notes into About`);
  lines.push(`- Keep forever Find + \`generated_art_only\` as product defaults`);
  lines.push("");
  lines.push(`## Debt (why Find would or would not defer)`);
  lines.push("");
  lines.push(
    `| Signal | Hot? | Count | Threshold |`,
    `| --- | --- | ---: | ---: |`,
    `| About | ${yn(report.debt.aboutDebtHot)} | ${report.debt.weakAboutOpen} open / ${report.debt.softAboutCount} soft | ${report.debt.thresholds.weakAbout} |`,
    `| Priority Improve | ${yn(report.debt.priorityDebtHot)} | ${report.debt.priorityOpen} | ${report.debt.thresholds.priority} |`,
    `| Contact | ${yn(report.debt.contactDebtHot)} | ${report.debt.contactDebtOpen} | ${report.debt.thresholds.contact} |`,
    `| Research (no_evidence) | ${yn(report.debt.researchDebtHot)} | ${report.debt.researchDebtCount} | ${report.debt.thresholds.contact} |`,
    `| Operator feedback | ${yn(report.debt.operatorFeedbackHot)} | ${report.debt.operatorFeedbackOpen} recs / ${report.debt.pendingFeedbackFiles} files | ${report.debt.thresholds.operatorFeedback} |`,
    `| **deferFind** | **${yn(report.debt.deferFind)}** | open recs ${report.debt.openRecommendations} | — |`
  );
  lines.push("");
  lines.push(`## Open gap breakdown`);
  lines.push("");
  if (!report.openGapBreakdown.length) {
    lines.push("_No open recommendations._");
  } else {
    for (const g of report.openGapBreakdown) {
      lines.push(`- \`${g.gap}\` — **${g.n}**`);
    }
  }
  lines.push("");
  lines.push(`## Auto-deliver (no HitL)`);
  lines.push("");
  if (!report.delivery.auto.length) {
    lines.push("_Nothing classified auto this tick — either debt is cool or only HitL items remain._");
  } else {
    for (const d of report.delivery.auto) {
      lines.push(`### \`${d.kind}\` (${d.count || 0} hinted)`);
      lines.push("");
      lines.push(`- **Why auto:** ${d.why}`);
      lines.push(`- **Risk:** ${d.risk}`);
      if (d.notes && d.notes.length) lines.push(`- **Notes:** ${d.notes.join("; ")}`);
      if (d.providerIds && d.providerIds.length) {
        lines.push(`- **Sample ids:** ${d.providerIds.slice(0, 8).join(", ")}`);
      }
      lines.push("");
    }
  }
  lines.push(`### Commands`);
  lines.push("");
  lines.push("```bash");
  for (const c of report.nextSteps.autoCommands) lines.push(c);
  if (!report.nextSteps.autoCommands.length) lines.push("# (none)");
  lines.push("```");
  lines.push("");
  lines.push(`## Needs your review (HitL)`);
  lines.push("");
  if (!report.delivery.hitlReview.length) {
    lines.push("_No HitL items this tick._");
  } else {
    for (const d of report.delivery.hitlReview) {
      lines.push(`### \`${d.kind}\` (${d.count || 0} hinted)`);
      lines.push("");
      lines.push(`- **Why not auto:** ${d.why}`);
      lines.push(`- **Risk:** ${d.risk}`);
      if (d.ownerQuestion) lines.push(`- **Owner question:** ${d.ownerQuestion}`);
      if (d.notes && d.notes.length) lines.push(`- **Notes:** ${d.notes.join("; ")}`);
      if (d.providerIds && d.providerIds.length) {
        lines.push(`- **Sample ids:** ${d.providerIds.slice(0, 8).join(", ")}`);
      }
      lines.push("");
    }
  }
  if (report.ownerQuestions.length) {
    lines.push(`### Decision checklist`);
    lines.push("");
    for (const q of report.ownerQuestions) lines.push(`- [ ] ${q}`);
    lines.push("");
  }
  lines.push(`## Samples (detail)`);
  lines.push("");
  lines.push(`### bad_address`);
  lines.push("");
  lines.push(codeJson(report.samples.badAddress));
  lines.push("");
  lines.push(`### blank_contacts`);
  lines.push("");
  lines.push(codeJson(report.samples.blankContacts));
  lines.push("");
  lines.push(`### Exhausted / near-max address`);
  lines.push("");
  lines.push(codeJson(report.samples.exhaustedAddress));
  lines.push("");
  lines.push(`## Recent 24h signal`);
  lines.push("");
  lines.push(
    `Events ${report.recent24h.eventCount} · improve_apply ${report.recent24h.improveApplied} · ` +
      `find_publish ${report.recent24h.findPublish} · find_skip ${report.recent24h.findSkip} · ` +
      `find_deferred ${report.recent24h.findDeferred} · operator_feedback ${report.recent24h.operatorFeedback} · ` +
      `contact_applied ${report.recent24h.contactApplied} / no_evidence ${report.recent24h.contactNoEvidence}`
  );
  lines.push("");
  if (report.recent24h.top.length) {
    lines.push(`Top event types:`);
    for (const t of report.recent24h.top) lines.push(`- \`${t.type}\` ${t.n}`);
    lines.push("");
  }
  lines.push(`## Prove`);
  lines.push("");
  lines.push("```bash");
  for (const c of report.nextSteps.prove) lines.push(c);
  lines.push("```");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function yn(v) {
  return v ? "yes" : "no";
}

function codeJson(obj) {
  return `\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\``;
}

module.exports = {
  REPORT_DIR,
  buildSmartReport,
  composeVerdict,
  gapHistogram,
  exhaustedAddressIds,
};
