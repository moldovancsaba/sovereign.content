#!/usr/bin/env node
/**
 * Sovereign Content job twin: catalog:self-heal
 *
 * Status for About + priority Improve + operator feedback + contact/research debt.
 * When debt is hot, Find should defer (heal-first).
 *
 * Smart delivery (Human-on-the-Loop):
 *   --report       reasoned markdown+JSON report (auto vs HitL queues, owner questions)
 *   --apply-auto   run only auto-lane deliveries; HitL stays in review-packet
 *   --brief        print heal-first brief lines
 *   --scan-mongo   count soft Abouts + contact blanks live
 *   --status       default JSON status (still writes self-heal-status.json)
 *
 * Binding: evidence over invent · never paste operator notes into About.
 */
require("./_productRoot.cjs").loadProductEnv();
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const { migrateTmpStateIfNeeded, ensureDir, DATA_DIR } = require("./lib/paths.cjs");
const { isWeakListingCopy } = require("./lib/composeListingCopy.cjs");
const { isSoftBelowAboutTarget, ABOUT_QUALITY_TARGET } = require("./lib/aboutQualityScore.cjs");
const {
  evaluateSelfHeal,
  writeSelfHealStatus,
  SELF_HEAL_STATUS_PATH,
} = require("./lib/selfHeal.cjs");
const { buildSmartReport } = require("./lib/selfHealSmartReport.cjs");
const { applyAutoDeliveries } = require("./lib/selfHealApplyAuto.cjs");
const { isDryRun } = require("./lib/cliFlags.cjs");
const recStore = require("./lib/recommendationStore.cjs");

const wantBrief = process.argv.includes("--brief");
const wantReport = process.argv.includes("--report");
const applyAuto = process.argv.includes("--apply-auto");
const scanMongo = process.argv.includes("--scan-mongo");
const DRY = isDryRun();

function isImproveEligible(row) {
  return row.visibility !== "hidden" && row.qualityStatus !== "quarantined";
}

function hasPhone(r) {
  return Boolean(
    (r.phone && String(r.phone).trim()) ||
      (r.contactLinks || []).some((l) => l && (l.type === "phone" || /^tel:/i.test(l.url || "")))
  );
}

async function scanMongoDebt() {
  if (!process.env.MONGODB_URI) return { softAboutCount: 0, contactBlankCount: 0 };
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const rows = (await client.db("classscoutcluster").collection("providers").find({}).toArray()).filter(
      isImproveEligible
    );
    let soft = 0;
    let contactBlank = 0;
    for (const row of rows) {
      const short = row.shortDescription || "";
      const long = row.longDescription || "";
      const chromeWeak = isWeakListingCopy(short, long);
      if (chromeWeak) soft += 1;
      else if (
        isSoftBelowAboutTarget(short, long, {
          name: row.name,
          place: row.borough || row.city,
          chrome: false,
        })
      ) {
        soft += 1;
      }
      if (!hasPhone(row) || !(row.website && String(row.website).trim())) contactBlank += 1;
    }
    return { softAboutCount: soft, contactBlankCount: contactBlank };
  } finally {
    await client.close();
  }
}

async function main() {
  migrateTmpStateIfNeeded();
  ensureDir(DATA_DIR);

  let softAboutCount = 0;
  let contactBlankCount = 0;
  if (scanMongo || wantReport || applyAuto) {
    // Smart report / apply prefer live soft/contact counts when Mongo is available.
    const scanned = await scanMongoDebt();
    softAboutCount = scanned.softAboutCount;
    contactBlankCount = scanned.contactBlankCount;
  }

  const openRecs = recStore.openRecommendations(recStore.loadRecommendations());
  const researchDebtCount = openRecs.filter((r) => r && r.researchDebt === "no_evidence").length;

  const status = evaluateSelfHeal({
    softAboutCount,
    contactBlankCount,
    researchDebtCount,
  });
  const statusPath = writeSelfHealStatus(status);

  if (applyAuto) {
    const result = applyAutoDeliveries(status, { dryRun: DRY, openRecs });
    console.log(
      JSON.stringify(
        {
          job: "catalog:self-heal",
          mode: "apply-auto",
          statusPath,
          aboutQualityTarget: ABOUT_QUALITY_TARGET,
          ...result,
        },
        null,
        2
      )
    );
    if (result.ownerQuestions && result.ownerQuestions.length) {
      console.log("\nOwner review required (not auto-delivered):");
      for (const q of result.ownerQuestions) console.log(`- [ ] ${q}`);
    }
    return;
  }

  if (wantReport) {
    const report = buildSmartReport(status, { openRecs, writeFiles: true });
    console.log(
      JSON.stringify(
        {
          job: "catalog:self-heal",
          mode: "smart-report",
          statusPath,
          aboutQualityTarget: ABOUT_QUALITY_TARGET,
          verdict: report.verdict,
          debt: report.debt,
          deliverySummary: report.delivery.summary,
          ownerQuestions: report.ownerQuestions,
          paths: report.paths,
          nextSteps: report.nextSteps,
        },
        null,
        2
      )
    );
    console.log("\n----- smart report (markdown) -----\n");
    console.log(report.markdown);
    return;
  }

  const out = {
    job: "catalog:self-heal",
    mode: wantBrief ? "brief" : "status",
    statusPath: statusPath || SELF_HEAL_STATUS_PATH,
    aboutQualityTarget: ABOUT_QUALITY_TARGET,
    ...status,
    hint: "Use --report for a reasoned auto vs HitL delivery plan; --apply-auto to run only auto lanes.",
  };
  console.log(JSON.stringify(out, null, 2));

  if (wantBrief && status.briefs.length) {
    console.log("heal-first briefs:");
    for (const b of status.briefs) {
      console.log(`- ${b.action} (${b.reason}): ${b.detail}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
