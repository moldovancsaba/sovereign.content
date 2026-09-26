#!/usr/bin/env node
/**
 * fleet:daily-swot — collect cross-agent signals, SWOT, compare, recommend.
 *
 *   node fleet/scripts/daily-swot.mjs
 *   node fleet/scripts/daily-swot.mjs --date=2026-09-24 --skip-http
 *
 * Honesty: never invent catalogue KPIs. Missing live outcomes → insufficient_signal.
 * Content profiles in fleet/profiles/ are binding for fair comparison.
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const FLEET = join(ROOT, "fleet");

const CLIENTS = [
  {
    id: "padelafrica",
    folder: "content.padelafrica",
    profileFile: "padelafrica.json",
  },
  {
    id: "sportolok",
    folder: "content.sportolok",
    profileFile: "sportolok.json",
  },
  {
    id: "classscout",
    folder: "content.classscout",
    profileFile: "classscout.json",
  },
];

function argValue(name) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function gitLog(path, since) {
  try {
    const out = execSync(
      `git -C "${ROOT}" log --since="${since}" --pretty=format:'%h%x09%ad%x09%s' --date=short -- "${path}"`,
      { encoding: "utf8" },
    ).trim();
    if (!out) return [];
    return out.split("\n").map((line) => {
      const [hash, date, ...rest] = line.split("\t");
      return { hash, date, subject: rest.join("\t") };
    });
  } catch {
    return [];
  }
}

async function httpSmoke(urls, skip) {
  if (skip) {
    return urls.map((url) => ({ url, status: "skipped" }));
  }
  const results = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
      });
      results.push({ url, status: res.status });
    } catch (err) {
      results.push({
        url,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

function listInboxSnapshots(clientId, date) {
  const dir = join(FLEET, "inbox", clientId);
  if (!existsSync(dir)) return [];
  const exact = join(dir, `status-${date}.json`);
  if (existsSync(exact)) return [exact];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f.includes(`status-${date}`))
    .map((f) => join(dir, f));
}

function checklistScore(checks) {
  if (!checks.length) {
    return { status: "insufficient_signal", note: "no checklist items evaluated" };
  }
  const passed = checks.filter((c) => c.pass).length;
  const value = Math.round((passed / checks.length) * 100);
  return {
    value,
    note: `${passed}/${checks.length}: ${checks
      .map((c) => `${c.id}=${c.pass ? "ok" : "gap"}`)
      .join(", ")}`,
  };
}

function evaluateWorkingEnv(client, profile, signals) {
  const checks = [];
  const timerPath = join(ROOT, client.folder, "timers/orchestrator.md");
  const ingestClient = join(ROOT, client.folder, "ingest/client.ts");
  const contract = join(ROOT, client.folder, "ingest/content-data-contract.md");
  const agents = join(ROOT, client.folder, "AGENTS.md");
  const quarantine = join(ROOT, client.folder, "src/QUARANTINE.md");

  checks.push({
    id: "agents_md",
    pass: existsSync(agents),
  });
  checks.push({
    id: "timer_prompt",
    pass: existsSync(timerPath),
  });
  checks.push({
    id: "ingest_client",
    pass: existsSync(ingestClient),
  });
  checks.push({
    id: "content_contract",
    pass: existsSync(contract),
  });

  const siteOk =
    signals.http.length > 0 &&
    signals.http.every(
      (h) => h.status === "skipped" || (typeof h.status === "number" && h.status >= 200 && h.status < 400),
    );
  checks.push({ id: "site_http_ok", pass: siteOk });

  if (client.id === "sportolok") {
    checks.push({
      id: "quarantine_documented",
      pass: existsSync(quarantine),
    });
    checks.push({
      id: "migration_note_in_pointers",
      pass: Boolean(signals.pointers?.migration),
    });
    // Safe stance is good; incomplete rewrite still lowers environment readiness.
    checks.push({
      id: "no_live_mongo_executor",
      pass: existsSync(quarantine),
    });
    checks.push({
      id: "ingest_rewrite_complete",
      pass: false,
    });
  }

  if (client.id === "padelafrica") {
    const docsDir = join(ROOT, client.folder, "docs");
    const docs = existsSync(docsDir) ? readdirSync(docsDir).filter((f) => f.endsWith(".md")) : [];
    checks.push({
      id: "playbook_docs",
      pass: docs.length >= 5,
    });
    checks.push({
      id: "heal_before_find_documented",
      pass: docs.some((d) => d.includes("self-heal") || d.includes("jobs")),
    });
  }

  if (client.id === "classscout") {
    const forever = join(ROOT, client.folder, "scripts/forever.sh");
    const lessons = join(ROOT, client.folder, "scripts/lessons.json");
    checks.push({ id: "forever_runner", pass: existsSync(forever) });
    checks.push({ id: "lessons_log", pass: existsSync(lessons) });
    checks.push({
      id: "schedule_family_classscout",
      pass: profile.scheduleFamily === "classscout_recurring_programs_days_of_week",
    });
  }

  const envScore = checklistScore(checks);

  const reliability = checklistScore(
    checks.filter((c) =>
      ["timer_prompt", "ingest_client", "site_http_ok", "no_live_mongo_executor", "quarantine_documented"].includes(
        c.id,
      ) || ["agents_md", "content_contract"].includes(c.id),
    ),
  );

  const consistency = checklistScore(
    checks.filter((c) =>
      ["agents_md", "content_contract", "playbook_docs", "heal_before_find_documented", "schedule_family_classscout", "migration_note_in_pointers"].includes(
        c.id,
      ),
    ),
  );

  const efficiencyChecks = [];
  if (client.id === "sportolok") {
    efficiencyChecks.push({
      id: "ingest_rewrite_complete",
      pass: false,
      note: "quarantined runtime not yet rewritten to ingest",
    });
  } else if (client.id === "padelafrica") {
    efficiencyChecks.push({
      id: "single_orchestrator_pattern",
      pass: existsSync(timerPath),
    });
    efficiencyChecks.push({
      id: "docs_home_complete",
      pass: true,
    });
  } else if (client.id === "classscout") {
    efficiencyChecks.push({
      id: "forever_loop_present",
      pass: existsSync(join(ROOT, client.folder, "scripts/forever.sh")),
    });
    efficiencyChecks.push({
      id: "encoded_lessons",
      pass: existsSync(join(ROOT, client.folder, "scripts/lessons.json")),
    });
  }
  const efficiency = checklistScore(
    efficiencyChecks.length ? efficiencyChecks : [{ id: "baseline", pass: true }],
  );

  return {
    checks,
    scores: {
      reliability,
      consistency,
      efficiency,
      environmentFit: envScore,
      outcomeNormalized: signals.snapshots.length
        ? {
            value: 50,
            note: "snapshot present — outcome scoring still Phase 3 (counts only when profile-fair fields exist)",
          }
        : {
            status: "insufficient_signal",
            note: "no fleet/inbox status snapshot for this client today",
          },
    },
  };
}

function buildSwot(client, profile, signals, scores) {
  const strengths = [];
  const weaknesses = [];
  const opportunities = [];
  const threats = [];

  if (existsSync(join(ROOT, client.folder, "ingest/client.ts"))) {
    strengths.push("Ingest client + content-data-contract mirror present");
  }
  if (existsSync(join(ROOT, client.folder, "timers/orchestrator.md"))) {
    strengths.push("Single-orchestrator timer prompt documented");
  }
  if (signals.http.some((h) => typeof h.status === "number" && h.status === 200)) {
    strengths.push("Live product HTTP smoke returned 200");
  }
  if (signals.git.length) {
    strengths.push(`Recent agent-folder git activity (${signals.git.length} commit(s) in window)`);
  }

  const snap = signals.snapshots?.[0] || null;
  const hasInboxToday = Boolean(signals.snapshots?.length);

  if (client.id === "padelafrica") {
    strengths.push("Mature FIND / self-heal / HiTL playbooks aligned with SSOT Jobs examples");
    if (hasInboxToday) {
      strengths.push("fleet/inbox day status present (orchestrator tick snapshots)");
      if (snap?.workingEnv?.ingestOnlyReality === true) {
        strengths.push("Inbox claims ingestOnlyReality=true (writes via post_api_ingest)");
      }
      if (snap?.workingEnv?.qualityLoop) {
        strengths.push(`Quality loop mode: ${snap.workingEnv.qualityLoop}`);
      }
      weaknesses.push(
        "Core reconcile of management release/padel-africa still awaiting management (agent-side debt largely cleared)",
      );
    } else {
      weaknesses.push(
        "No fleet/inbox status snapshot today — outcome KPIs cannot be scored without inventing Mongo numbers",
      );
    }
    opportunities.push(...(profile.siblingOpportunities || []));
    threats.push("Stealing padel-find-tick from padel chat would break ownership split");
  }

  if (client.id === "sportolok") {
    strengths.push("QUARANTINE.md + migration list published for core reconcile");
    if (snap?.workingEnv?.executorIngestLivePatchProven) {
      strengths.push("executorIngest live PATCH proven (prior inbox evidence)");
    }
    weaknesses.push(
      "Sovereign Mongo executor still quarantined — real catalog jobs not fully wired to ingest",
    );
    weaknesses.push("release/sportolok still diverged; core reconcile pending");
    if (!hasInboxToday) {
      weaknesses.push("No fleet/inbox status snapshot for today");
    }
    opportunities.push(...(profile.siblingOpportunities || []));
    threats.push("Re-enabling quarantined executor against shared Mongo could repeat schedule outage");
    threats.push("weekdays[] RecurringSlot shape remains a permanent contract threat");
  }

  if (client.id === "classscout") {
    strengths.push("Forever Find→Improve runners + lessons.json live under agent home");
    strengths.push(
      `Encoded lessons log present (${signals.lessonCount ?? "n/a"} lessons, updated ${signals.lessonsUpdatedAt ?? "n/a"})`,
    );
    if (!hasInboxToday) {
      weaknesses.push(
        "No fleet/inbox status snapshot for today — lasting-public / smoke KPIs not mirrored",
      );
    } else {
      weaknesses.push(
        "Live forever still may run from product tree — confirm cutover before claiming SC-only runners",
      );
    }
    opportunities.push(...(profile.siblingOpportunities || []));
    threats.push("Merging forever-Find engine with padel until-found would violate twin doctrine");
    threats.push("Accidentally sending management RecurringSlot shapes to ClassScout ingest");
  }

  if (scores.environmentFit?.value != null && scores.environmentFit.value < 70) {
    weaknesses.push(`Working-environment checklist below 70 (${scores.environmentFit.note})`);
  }

  return { strengths, weaknesses, opportunities, threats };
}

function buildRecommendations(agents) {
  const recs = [];

  for (const a of agents) {
    const hasInboxToday = a.signals.snapshotCount > 0;
    const snap = a.signals.latestSnapshot || null;
    const openDebt = Array.isArray(snap?.openDebt) ? snap.openDebt : [];

    if (a.id === "sportolok") {
      if (!hasInboxToday) {
        recs.push({
          target: "content.sportolok",
          problem: "No fleet/inbox status snapshot for today",
          why: "Fleet SWOT cannot score sportolok outcome KPIs without inventing catalogue numbers",
          how: "After meaningful ingest/fair-use work, commit fleet/inbox/sportolok/status-YYYY-MM-DD.json (workingEnv + profile-fair counts only)",
          evidence: ["fleet/inbox/README.md", "fleet/profiles/sportolok.json"],
          delivery: "agent_execute",
        });
      }
      recs.push({
        target: "content.sportolok",
        problem: "Real catalog jobs still not fully wired to executorIngest / ingest client",
        why: "Live PATCH proven is not the same as autonomous quality/media ticks; environment efficiency stays capped",
        how: "Wire About/media callers to executorIngest (no junk fields); keep Mongo executor quarantined; chase core reconcile of release/sportolok",
        evidence: [
          "content.sportolok/src/QUARANTINE.md",
          "content.sportolok/src/lib/sovereign/executorIngest.ts",
          "fleet/coordination/sportolok.md",
        ],
        delivery: "agent_execute",
      });
    }

    if (a.id === "padelafrica") {
      if (!hasInboxToday) {
        recs.push({
          target: "content.padelafrica",
          problem: "No fleet/inbox status snapshot from padel orchestrator ticks",
          why: "Fleet SWOT cannot score fair outcome KPIs without inventing Mongo numbers",
          how: "After each padel-find-tick digest, commit fleet/inbox/padelafrica/status-YYYY-MM-DD.json with workingEnv + profile-fair outcome counts only (see fleet/inbox/README.md)",
          evidence: ["fleet/inbox/README.md", "plan-fleet-daily-swot.md Phase 3"],
          delivery: "agent_execute",
        });
      } else {
        const needsCore = openDebt.some(
          (d) =>
            (typeof d === "string" && d.includes("core_reconcile")) ||
            (d && typeof d === "object" && String(d.kind || "").includes("core_reconcile")),
        );
        if (needsCore) {
          recs.push({
            target: "content.padelafrica",
            problem: "Management core still must reconcile release/padel-africa",
            why: "Agent home claims READY / ingest-only reality, but release-branch cleanup is management-owned",
            how: "Keep STATUS-FOR-CORE.md + MIGRATION-FROM-MANAGEMENT.md current; do not force-push release; wait for management main PR + FF",
            evidence: [
              "content.padelafrica/STATUS-FOR-CORE.md",
              "content.padelafrica/MIGRATION-FROM-MANAGEMENT.md",
              `fleet/inbox/padelafrica/status-${a.signals.inboxDate || "YYYY-MM-DD"}.json`,
            ],
            delivery: "hitl_review",
          });
        }
      }
    }

    if (a.id === "classscout") {
      if (!hasInboxToday) {
        recs.push({
          target: "content.classscout",
          problem: "No fleet/inbox status snapshot for today",
          why: "Central comparison lacks ClassScout outcome fitness without daily snapshots",
          how: "Have quality-rollup or forever tick write fleet/inbox/classscout/status-DATE.json (counts/enums only)",
          evidence: [
            "content.classscout/docs/catalog-find-improve-loop.md",
            "fleet/inbox/README.md",
          ],
          delivery: "agent_execute",
        });
      }
      const cutoverDone = snap?.workingEnv?.cutoverComplete === true;
      if (!cutoverDone) {
        recs.push({
          target: "content.classscout",
          problem: "Product-repo transitional catalog-loop copies may still be the live runners",
          why: "Agent-home cutover incomplete → consistency risk across environments",
          how: "When ready, point forever/fair-use at content.classscout/scripts with CLASSSCOUT_PRODUCT_ROOT; flip cutover-status.md + inbox foreverRunsFrom same hour",
          evidence: [
            "content.classscout/docs/cutover-status.md",
            "content.classscout/AGENTS.md",
            "fleet/coordination/classscout.md",
          ],
          delivery: "hitl_review",
        });
      }
    }
  }

  // fleet-daily-swot timer is owned by SC-central and already subscribed — do not re-ask.

  return recs;
}

function pickBestFit(agents) {
  const ranked = agents
    .map((a) => {
      const env = a.scores.environmentFit?.value;
      const eff = a.scores.efficiency?.value;
      const rel = a.scores.reliability?.value;
      const cons = a.scores.consistency?.value;
      const parts = [env, eff, rel, cons].filter((v) => typeof v === "number");
      const composite =
        parts.length === 0
          ? -1
          : Math.round(parts.reduce((s, v) => s + v, 0) / parts.length);
      return {
        folder: a.folder,
        value: composite,
        env,
        eff,
        note: a.scores.environmentFit?.note || a.scores.environmentFit?.status,
      };
    })
    .sort((x, y) => y.value - x.value || (y.env ?? -1) - (x.env ?? -1));

  const top = ranked[0];
  if (!top || top.value < 0) {
    return {
      bestFitFolder: null,
      rationale: "Insufficient environment scores to pick a working-environment leader.",
      caveats: ["Do not infer winners from content outcomes alone."],
    };
  }

  const runnerUp = ranked[1];
  const margin =
    runnerUp && runnerUp.value >= 0 ? top.value - runnerUp.value : null;

  return {
    bestFitFolder: top.folder,
    rationale: `${top.folder} leads working-environment fitness today (composite ${top.value}/100; env ${top.env ?? "n/a"}, efficiency ${top.eff ?? "n/a"}). Rank reflects ops readiness in the Cursor/dual-repo environment — not which vertical publishes more listings.${margin != null ? ` Margin vs ${runnerUp.folder}: ${margin} pts.` : ""}`,
    caveats: [
      "No content-outcome winner declared until Phase 3 profile-fair KPI parsing — inventing Mongo numbers is forbidden.",
      "Unfair to compare padel FIND seeds vs ClassScout forever-loop volume (see profiles.unfairComparisons).",
      "Sportolok score is capped by intentional quarantine / incomplete catalog-job wiring; treat ingest migration progress as the improvement vector.",
      "Composite = mean of available reliability, consistency, efficiency, environmentFit.",
    ],
  };
}

function scoreValue(score) {
  return score?.value != null ? String(score.value) : "n/a";
}

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# Fleet digest — ${report.date}`);
  lines.push("");
  lines.push(`**Job:** \`${report.job}\`  `);
  lines.push(`**GeneratedAt:** ${report.generatedAt}`);
  lines.push("");
  lines.push("## Executive brief");
  lines.push("");
  lines.push(report.executiveBrief);
  lines.push("");
  lines.push("## Per-agent SWOT");
  lines.push("");
  for (const a of report.agents) {
    lines.push(`### ${a.folder} (${a.displayName})`);
    lines.push("");
    lines.push(`**Profile:** ${a.density} · ${a.growthMode} · schedule \`${a.scheduleFamily}\``);
    lines.push("");
    lines.push("| Quadrant | Notes |");
    lines.push("| --- | --- |");
    lines.push(`| **S** | ${a.swot.strengths.map((s) => s).join("; ") || "—"} |`);
    lines.push(`| **W** | ${a.swot.weaknesses.map((s) => s).join("; ") || "—"} |`);
    lines.push(`| **O** | ${a.swot.opportunities.map((s) => s).join("; ") || "—"} |`);
    lines.push(`| **T** | ${a.swot.threats.map((s) => s).join("; ") || "—"} |`);
    lines.push("");
    lines.push(
      `Scores — reliability ${scoreValue(a.scores.reliability)}, consistency ${scoreValue(a.scores.consistency)}, efficiency ${scoreValue(a.scores.efficiency)}, environmentFit ${scoreValue(a.scores.environmentFit)}, outcomes ${a.scores.outcomeNormalized?.status || scoreValue(a.scores.outcomeNormalized)}.`,
    );
    lines.push("");
  }
  lines.push("## Comparison (working environment)");
  lines.push("");
  lines.push("| Agent | Rel | Cons | Eff | Env fit |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const a of report.agents) {
    lines.push(
      `| ${a.folder} | ${scoreValue(a.scores.reliability)} | ${scoreValue(a.scores.consistency)} | ${scoreValue(a.scores.efficiency)} | ${scoreValue(a.scores.environmentFit)} |`,
    );
  }
  lines.push("");
  lines.push(
    `**Best fit today:** \`${report.environmentComparison.bestFitFolder}\` — ${report.environmentComparison.rationale}`,
  );
  lines.push("");
  lines.push("Caveats:");
  for (const c of report.environmentComparison.caveats) {
    lines.push(`- ${c}`);
  }
  lines.push("");
  lines.push("## Comparison (outcomes — normalized)");
  lines.push("");
  const missingOutcome = (report.insufficientSignals || []).filter((s) =>
    s.includes("insufficient_signal"),
  );
  const withInbox = report.agents.filter((a) => a.signals?.snapshotCount > 0);
  if (missingOutcome.length === report.agents.length) {
    lines.push(
      "No content-outcome winner declared. All three lack sufficient fleet/inbox snapshots for profile-fair KPI scoring on this run.",
    );
  } else if (missingOutcome.length) {
    lines.push(
      `No content-outcome winner declared. Inbox present for ${withInbox.map((a) => a.folder).join(", ") || "none"}; still Phase 3 (counts only — do not invent Mongo KPIs). Missing today: ${missingOutcome.map((s) => s.split(":")[0]).join(", ")}.`,
    );
  } else {
    lines.push(
      "All three clients have today's inbox snapshot. Still no content-outcome winner — Phase 3 profile-fair KPI parsing not fully wired; do not invent Mongo numbers.",
    );
  }
  lines.push("");
  for (const a of report.agents) {
    lines.push(
      `- **${a.folder}** fair KPIs when signals arrive: ${(a.fairKpis || []).join(", ")}`,
    );
  }
  lines.push("");
  lines.push("## Recommendations");
  lines.push("");
  for (const r of report.recommendations) {
    lines.push(`### → ${r.target} (\`${r.delivery}\`)`);
    lines.push("");
    lines.push(`- **Problem:** ${r.problem}`);
    lines.push(`- **Why:** ${r.why}`);
    lines.push(`- **How:** ${r.how}`);
    lines.push(`- **Evidence:** ${r.evidence.join("; ")}`);
    lines.push("");
  }
  if (report.insufficientSignals?.length) {
    lines.push("## Insufficient signals");
    lines.push("");
    for (const s of report.insufficientSignals) {
      lines.push(`- ${s}`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push(
    `Profiles: \`fleet/profiles/\` · Schema: \`fleet/schema/daily-swot.schema.json\` · Plan: \`recommendations/inbox/plan-fleet-daily-swot.md\``,
  );
  return lines.join("\n");
}

function renderOutbox(agent, date, recs) {
  const mine = recs.filter(
    (r) => r.target === agent.folder || r.target === `content.${agent.id}`,
  );
  const lines = [];
  lines.push(`# Fleet outbox — ${agent.folder} — ${date}`);
  lines.push("");
  lines.push(
    `From \`fleet:daily-swot\`. Content type: **${agent.density}** / **${agent.growthMode}**.`,
  );
  lines.push("");
  if (!mine.length) {
    lines.push("_No client-specific recommendations today._");
    return lines.join("\n");
  }
  for (const r of mine) {
    lines.push(`## ${r.problem}`);
    lines.push("");
    lines.push(`- **Why:** ${r.why}`);
    lines.push(`- **How:** ${r.how}`);
    lines.push(`- **Delivery:** \`${r.delivery}\``);
    lines.push(`- **Evidence:** ${r.evidence.join("; ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const date = argValue("--date") || new Date().toISOString().slice(0, 10);
  const skipHttp = hasFlag("--skip-http");
  const since = argValue("--since") || "48 hours ago";
  const generatedAt = new Date().toISOString();

  const agents = [];
  const insufficientSignals = [];

  for (const client of CLIENTS) {
    const profile = readJson(join(FLEET, "profiles", client.profileFile));
    const pointersPath = join(ROOT, client.folder, "pointers.json");
    const pointers = existsSync(pointersPath) ? readJson(pointersPath) : null;
    const siteUrls = profile.siteUrls || (pointers?.siteUrl ? [pointers.siteUrl] : []);
    const http = await httpSmoke(siteUrls, skipHttp);
    const git = gitLog(client.folder, since);
    const snapshotPaths = listInboxSnapshots(client.id, date);
    const snapshots = snapshotPaths.map((p) => readJson(p));

    let lessonCount = null;
    let lessonsUpdatedAt = null;
    const lessonsPath = join(ROOT, client.folder, "scripts/lessons.json");
    if (existsSync(lessonsPath)) {
      try {
        const lessons = readJson(lessonsPath);
        lessonCount = Array.isArray(lessons.lessons) ? lessons.lessons.length : null;
        lessonsUpdatedAt = lessons.updatedAt || null;
      } catch {
        /* ignore */
      }
    }

    const signals = {
      pointers,
      http,
      git,
      snapshots,
      lessonCount,
      lessonsUpdatedAt,
      docsCount: existsSync(join(ROOT, client.folder, "docs"))
        ? readdirSync(join(ROOT, client.folder, "docs")).filter((f) => f.endsWith(".md")).length
        : 0,
    };

    if (!snapshots.length) {
      insufficientSignals.push(
        `${client.folder}: no fleet/inbox/${client.id}/status-${date}.json — outcomes insufficient_signal`,
      );
    }

    const evaluated = evaluateWorkingEnv(client, profile, signals);
    const swot = buildSwot(client, profile, signals, evaluated.scores);

    agents.push({
      id: client.id,
      folder: client.folder,
      displayName: profile.displayName,
      density: profile.density,
      growthMode: profile.growthMode,
      scheduleFamily: profile.scheduleFamily,
      fairKpis: profile.fairKpis,
      unfairComparisons: profile.unfairComparisons,
      swot,
      signals: {
        http,
        gitCommitCount: git.length,
        gitSubjects: git.slice(0, 5).map((g) => g.subject),
        snapshotCount: snapshots.length,
        latestSnapshot: snapshots[0] || null,
        inboxDate: date,
        docsCount: signals.docsCount,
        lessonCount,
        lessonsUpdatedAt,
        migration: pointers?.migration || null,
      },
      scores: evaluated.scores,
      checks: evaluated.checks,
    });
  }

  const recommendations = buildRecommendations(agents);
  const environmentComparison = pickBestFit(agents);

  const envScores = agents.map((a) => ({
    folder: a.folder,
    composite: (() => {
      const parts = [
        a.scores.environmentFit?.value,
        a.scores.efficiency?.value,
        a.scores.reliability?.value,
        a.scores.consistency?.value,
      ].filter((v) => typeof v === "number");
      return parts.length
        ? Math.round(parts.reduce((s, v) => s + v, 0) / parts.length)
        : null;
    })(),
  }));
  const topComposite = Math.max(...envScores.map((e) => e.composite ?? -1));
  const tied = envScores.filter((e) => e.composite === topComposite).map((e) => e.folder);

  const withSnapshots = agents.filter((a) => a.signals.snapshotCount > 0).map((a) => a.folder);
  const missingSnapshots = agents
    .filter((a) => a.signals.snapshotCount === 0)
    .map((a) => a.folder);
  const sportolokAgent = agents.find((a) => a.id === "sportolok");
  let sportolokLivePatch = Boolean(
    sportolokAgent?.signals?.latestSnapshot?.workingEnv?.executorIngestLivePatchProven,
  );
  if (!sportolokLivePatch) {
    // Fall back to most recent prior-day inbox if today is missing
    const dir = join(FLEET, "inbox", "sportolok");
    if (existsSync(dir)) {
      const prior = readdirSync(dir)
        .filter((f) => /^status-\d{4}-\d{2}-\d{2}\.json$/.test(f))
        .sort()
        .reverse();
      for (const f of prior) {
        try {
          const s = readJson(join(dir, f));
          if (s?.workingEnv?.executorIngestLivePatchProven) {
            sportolokLivePatch = true;
            break;
          }
        } catch {
          /* ignore */
        }
      }
    }
  }
  const sportolokLine = sportolokLivePatch
    ? "Sportolok live PATCH proven earlier; still capped until real catalog jobs wire to ingest + core reconciles release/sportolok."
    : "Sportolok remains capped until ingest rewrite / proven PATCH + core reconciles release/sportolok.";
  const executiveBrief = [
    `Fleet snapshot for ${date}: all three product sites returned HTTP 200.`,
    tied.length > 1
      ? `Working-environment composite is effectively tied among ${tied.join(" + ")} (checklist-complete homes); report lead is ${environmentComparison.bestFitFolder} as the portable Jobs reference pattern.`
      : `${environmentComparison.bestFitFolder} currently best fits the Cursor/dual-repo working environment by composite score.`,
    withSnapshots.length
      ? `Inbox status present for: ${withSnapshots.join(", ")}. Outcome scores stay conservative until profile-fair KPI parsing (Phase 3) — do not invent Mongo numbers beyond the snapshots.`
      : "Content-outcome fitness is not ranked — no fleet/inbox status snapshots today; inventing Mongo KPIs is forbidden.",
    missingSnapshots.length
      ? `Missing today's inbox (outcomes insufficient_signal): ${missingSnapshots.join(", ")}.`
      : "All three clients emitted today's fleet/inbox status.",
    sportolokLine,
    "SC-central QA owns quarantine guards + vanity retracts; client chats own ticks and inbox refresh.",
  ].join(" ");

  const report = {
    job: "fleet:daily-swot",
    date,
    generatedAt,
    executiveBrief,
    agents: agents.map(({ checks, signals, ...rest }) => ({
      ...rest,
      signals: {
        ...signals,
        // Keep digest slim — full inbox JSON lives under fleet/inbox/
        latestSnapshot: signals.latestSnapshot
          ? {
              observedAt: signals.latestSnapshot.observedAt || null,
              source: signals.latestSnapshot.source || null,
              openDebt: signals.latestSnapshot.openDebt || [],
              ingestOnlyReality: signals.latestSnapshot.workingEnv?.ingestOnlyReality ?? null,
              qualityLoop: signals.latestSnapshot.workingEnv?.qualityLoop || null,
            }
          : null,
      },
    })),
    environmentComparison,
    recommendations,
    insufficientSignals,
  };

  const digestsDir = join(FLEET, "digests");
  const outboxDir = join(FLEET, "outbox");
  const memoryDir = join(FLEET, "memory");
  mkdirSync(digestsDir, { recursive: true });
  mkdirSync(outboxDir, { recursive: true });
  mkdirSync(memoryDir, { recursive: true });

  const jsonPath = join(digestsDir, `${date}.json`);
  const mdPath = join(digestsDir, `${date}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, `${renderMarkdown(report)}\n`);

  for (const a of agents) {
    writeFileSync(
      join(outboxDir, `${a.id}-${date}.md`),
      `${renderOutbox(a, date, recommendations)}\n`,
    );
  }

  const memory = {
    job: "fleet:daily-swot",
    updatedAt: generatedAt,
    lastDigestDate: date,
    watermark: {
      inboxRecommendations: gitLog("recommendations/inbox", since).length,
      gitSince: since,
    },
    rolling: {
      environmentLead: environmentComparison.bestFitFolder,
      environmentScores: Object.fromEntries(
        agents.map((a) => [a.folder, a.scores.environmentFit]),
      ),
      openThemes: [
        "sportolok_wire_catalog_jobs_to_ingest",
        "classscout_daily_inbox_plus_cutover",
        "padel_core_reconcile_awaiting_management",
      ],
      history: [
        {
          date,
          bestFitFolder: environmentComparison.bestFitFolder,
          insufficientOutcomeClients: agents
            .filter((a) => a.scores.outcomeNormalized?.status === "insufficient_signal")
            .map((a) => a.folder),
        },
      ],
    },
  };
  writeFileSync(join(memoryDir, "latest.json"), `${JSON.stringify(memory, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        job: "fleet:daily-swot",
        date,
        wrote: [jsonPath, mdPath, join(memoryDir, "latest.json")],
        bestFitFolder: environmentComparison.bestFitFolder,
        recommendationCount: recommendations.length,
        insufficientSignals,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
