#!/usr/bin/env node
/**
 * Sovereign Content twin: catalog:find --until-found
 *
 * Sparse-market growth path — complements forever Find (dense US fair-use).
 * Emits agent research briefs from the scarcity brief, optionally tries one
 * matching seed from find-seeds.json, records seeded | zero-result |
 * budget_exhausted, and STOPS on the first seed/publish.
 *
 * Flags:
 *   --until-found (default when this script runs)
 *   --max-cells N (default 8)
 *   --dry-run
 *   --status  (print campaign + firstBrief only)
 *   --record-attempt --outcome=seeded|zero-result [--cc=XX --city=...]
 *
 * Agent path (Cursor): run --status, WebSearch firstBrief cells, verify evidence
 * bar, then seed via forever Find / fixture — never invent phones/emails/ages.
 */
require("./_productRoot.cjs").loadProductEnv();
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  DATA_DIR,
  ensureDir,
  SCARCITY_BRIEF_PATH,
  SEEDS_PATH,
  migrateTmpStateIfNeeded,
} = require("./lib/paths.cjs");
const { loadBriefFromDisk, prioritizeSeedsByBrief } = require("./lib/scarcityResearchBrief.cjs");
const { isDryRun, flagValue, hasFlag } = require("./lib/cliFlags.cjs");
const { appendEvent } = require("./lib/events.cjs");

const DRY = isDryRun();
const MAX_CELLS = Math.max(1, Number(flagValue("--max-cells") || process.env.CATALOG_FIND_MAX_CELLS || 8));
const CAMPAIGN_PATH =
  process.env.CATALOG_FIND_UNTIL_CAMPAIGN || path.join(DATA_DIR, "find-until-campaign.json");

function loadCampaign() {
  try {
    return JSON.parse(fs.readFileSync(CAMPAIGN_PATH, "utf8"));
  } catch {
    return { attempts: [], seeded: null, status: "idle" };
  }
}

function saveCampaign(doc) {
  ensureDir(DATA_DIR);
  doc.updatedAt = new Date().toISOString();
  fs.writeFileSync(CAMPAIGN_PATH, `${JSON.stringify(doc, null, 2)}\n`);
}

function buildFirstBrief(brief, maxCells) {
  const queries = (brief.searchQueries || []).slice(0, maxCells);
  const neighborhoods = (brief.findHints && brief.findHints.preferNeighborhoods) || [];
  const activities = (brief.findHints && brief.findHints.preferActivities) || [];
  const cells = queries.map((q, i) => ({
    index: i,
    searchQueries: [q],
    sourcesToCheck: ["official provider website", "city parks / community directory"],
    preferNeighborhood: neighborhoods[i % Math.max(neighborhoods.length, 1)] || null,
    preferActivity: activities[i % Math.max(activities.length, 1)] || null,
    evidenceBar: [
      "named venue",
      "location pin or street",
      "contact or first-party URL",
      "prefer two sources",
    ],
    neverInvent: ["phones", "emails", "ages", "court counts"],
  }));
  return {
    generatedAt: brief.generatedAt || new Date().toISOString(),
    maxCells,
    cellCount: cells.length,
    firstBrief: cells[0] || null,
    cells,
    excludeNames: [],
  };
}

function recordAttempt(outcome) {
  const campaign = loadCampaign();
  const entry = {
    at: new Date().toISOString(),
    outcome,
    cc: flagValue("--cc") || null,
    city: flagValue("--city") || null,
    note: flagValue("--note") || null,
  };
  campaign.attempts = campaign.attempts || [];
  campaign.attempts.push(entry);
  if (outcome === "seeded") {
    campaign.seeded = entry;
    campaign.status = "seeded";
  } else if (outcome === "zero-result") {
    campaign.status = campaign.seeded ? "seeded" : "in_progress";
  } else if (outcome === "budget_exhausted") {
    campaign.status = campaign.seeded ? "seeded" : "budget_exhausted";
  }
  saveCampaign(campaign);
  appendEvent("find_until_attempt", entry);
  console.log(JSON.stringify({ job: "catalog:find-until", recorded: entry, campaignStatus: campaign.status }, null, 2));
}

async function main() {
  migrateTmpStateIfNeeded();
  ensureDir(DATA_DIR);

  if (hasFlag("--record-attempt")) {
    const outcome = flagValue("--outcome") || "zero-result";
    if (!["seeded", "zero-result", "budget_exhausted"].includes(outcome)) {
      throw new Error(`invalid --outcome ${outcome}`);
    }
    recordAttempt(outcome);
    return;
  }

  let brief = loadBriefFromDisk(fs, SCARCITY_BRIEF_PATH);
  if (!brief || !brief.searchQueries || !brief.searchQueries.length) {
    // Refresh scarcity brief once.
    spawnSync(process.execPath, [path.join(__dirname, "scarcity-research-brief.cjs")], {
      cwd: path.resolve(__dirname, "../.."),
      env: process.env,
      stdio: "inherit",
    });
    brief = loadBriefFromDisk(fs, SCARCITY_BRIEF_PATH) || { searchQueries: [], findHints: {} };
  }

  const pack = buildFirstBrief(brief, MAX_CELLS);
  const campaign = loadCampaign();

  if (hasFlag("--status") || hasFlag("--brief-only")) {
    console.log(
      JSON.stringify(
        {
          job: "catalog:find-until",
          mode: "status",
          dryRun: DRY,
          campaign: {
            status: campaign.status,
            attemptCount: (campaign.attempts || []).length,
            seeded: campaign.seeded,
          },
          ...pack,
          agentInstructions: [
            "WebSearch each firstBrief.searchQueries entry",
            "Open official / directory pages from sourcesToCheck",
            "Evidence bar: named venue, location, contact or first-party URL; prefer two sources",
            "Never invent phones, emails, ages, or court counts",
            "On seeded: apply via Find seed / ingest, then --record-attempt --outcome=seeded and STOP",
            "On zero: --record-attempt --outcome=zero-result → next cell",
            "All dry → --record-attempt --outcome=budget_exhausted",
          ],
        },
        null,
        2
      )
    );
    return;
  }

  // Local complement: try one scarcity-matched seed from the queue, then stop if published.
  const seedsDoc = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
  const seeds = seedsDoc.seeds || [];
  const ranked = prioritizeSeedsByBrief(
    seeds.map((s, idx) => ({ seed: s, idx })),
    brief
  ).filter((item) => item.seed && !item.seed.paused);

  if (!ranked.length) {
    recordAttempt("budget_exhausted");
    console.log(
      JSON.stringify(
        {
          job: "catalog:find-until",
          mode: "until-found",
          dryRun: DRY,
          outcome: "budget_exhausted",
          reason: "no_matching_seeds",
          ...pack,
        },
        null,
        2
      )
    );
    return;
  }

  const top = ranked[0].seed;
  console.log(
    JSON.stringify(
      {
        job: "catalog:find-until",
        mode: "until-found",
        dryRun: DRY,
        firstSeedId: top.id,
        firstBrief: pack.firstBrief,
        note: "Running one Find cycle with CATALOG_FIND_SEED_IDS; stop on first seed.",
      },
      null,
      2
    )
  );

  const env = {
    ...process.env,
    CATALOG_FIND_SEED_IDS: top.id,
    CATALOG_FIND_BATCH: "1",
  };
  if (DRY) env.CATALOG_LOOP_DRY_RUN = "1";
  // Do not let self-heal defer this intentional sparse growth tick.
  env.CATALOG_SELF_HEAL_FORCE_FIND = "1";

  const r = spawnSync(process.execPath, [path.join(__dirname, "find-cycle.cjs")], {
    cwd: path.resolve(__dirname, "../.."),
    env,
    stdio: "inherit",
  });

  // Infer outcome from find log when present.
  let outcome = "zero-result";
  try {
    const findLog = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, "find-cycle-last.json"), "utf8")
    );
    if (findLog.published > 0 || findLog.publicPublished > 0) outcome = "seeded";
    else if (findLog.deferred) outcome = "zero-result";
  } catch {
    /* keep zero-result */
  }
  if (r.status !== 0 && outcome !== "seeded") outcome = "zero-result";
  recordAttempt(outcome);

  console.log(
    JSON.stringify(
      {
        job: "catalog:find-until",
        mode: "until-found",
        dryRun: DRY,
        outcome,
        stop: true,
        exitCode: r.status,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
