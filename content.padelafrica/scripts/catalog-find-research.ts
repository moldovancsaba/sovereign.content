/**
 * Cloud Agent FIND — continent research discovery for padel-africa.
 *
 * IMPORTANT: This CLI does NOT invent venues and does NOT call WebSearch itself.
 * Discovery is an **agent-required** capability encoded in `--brief` / `--next` /
 * `--until-found`: the Cloud Agent must run the emitted searchQueries, verify
 * evidence, write a fixture, then seed. Status/plan only decide WHERE to look.
 *
 * Modes:
 *   npm run catalog:find -- --status
 *   npm run catalog:find -- --plan [--limit 40]
 *   npm run catalog:find -- --next
 *   npm run catalog:find -- --until-found [--max-cells 8]   # do-until-seed campaign
 *   npm run catalog:find -- --brief --cc=KE --city=Mombasa
 *   npm run catalog:find -- --fixture=… [--dry-run]
 *   npm run catalog:find -- --record-attempt --cc=ST --city="São Tomé" --outcome=zero-result
 *
 * Agent tick (preferred):
 *   1. --until-found
 *   2. Execute firstBrief; on zero-result record + take next cell in campaign (or re-run --until-found)
 *   3. Stop when seeded OR budget exhausted (never invent)
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";
import {
  AFRICA_ISO,
  buildFindBrief,
  buildFindPlan,
  buildUntilFoundCampaign,
  loadAttempts,
  pickNext,
  recordAttempt,
  type CountryLive,
} from "../src/lib/catalogFind";
import {
  ABOUT_IMPROVE_KINDS,
  RESEARCH_DEBT_KINDS,
  decideFindBind,
  recordProcessLesson,
} from "../src/lib/catalogSelfHeal";
import { mongoListingQualityStore } from "../src/lib/listingQuality/store";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

function argValue(flag: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("-")) return process.argv[i + 1];
  return undefined;
}

async function loadLiveByCc(): Promise<{
  byCc: Record<string, CountryLive>;
  published: number;
}> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "padel-africa");
  try {
    const rows = await db
      .collection("listings")
      .find(
        { lifecycleState: "PUBLISHED" },
        {
          projection: {
            id: 1,
            name: 1,
            "venue.address.countryCode": 1,
            "venue.address.locality": 1,
            "address.countryCode": 1,
            "address.locality": 1,
          },
        },
      )
      .toArray();
    const byCc: Record<string, CountryLive> = {};
    for (const r of rows) {
      const cc =
        (r.venue as { address?: { countryCode?: string; locality?: string } } | undefined)?.address
          ?.countryCode ||
        (r.address as { countryCode?: string; locality?: string } | undefined)?.countryCode ||
        "?";
      const city =
        (r.venue as { address?: { locality?: string } } | undefined)?.address?.locality ||
        (r.address as { locality?: string } | undefined)?.locality ||
        "?";
      if (!byCc[cc]) byCc[cc] = { n: 0, names: [], cities: {} };
      byCc[cc].n += 1;
      if (byCc[cc].names.length < 12) byCc[cc].names.push(String(r.name));
      byCc[cc].cities[city] = (byCc[cc].cities[city] ?? 0) + 1;
    }
    return { byCc, published: rows.length };
  } finally {
    await client.close();
  }
}

async function statusReport() {
  const { byCc, published } = await loadLiveByCc();
  const missing = AFRICA_ISO.filter((cc) => !byCc[cc]);
  const sparse = AFRICA_ISO.filter((cc) => (byCc[cc]?.n ?? 0) > 0 && (byCc[cc]?.n ?? 0) <= 2).map((cc) => ({
    cc,
    n: byCc[cc].n,
    names: byCc[cc].names,
    cities: byCc[cc].cities,
  }));
  const attempts = loadAttempts();
  const plan = buildFindPlan(byCc, attempts, { limit: 8 });
  const campaign = buildUntilFoundCampaign(byCc, attempts, { maxCells: 8 });
  console.log(
    JSON.stringify(
      {
        job: "catalog:find",
        mode: "status",
        published,
        countriesWithListings: Object.keys(byCc).filter((k) => k !== "?").length,
        missingCountries: missing,
        sparseCountries: sparse,
        planNext: plan.next,
        untilFoundNext: campaign.cells[0]
          ? `${campaign.cells[0].cc}:${campaign.cells[0].city}:${campaign.cells[0].priority}`
          : null,
        agentHint:
          "Prefer `npm run catalog:find -- --until-found` then EXECUTE cells until one seeds (or budget exhausted). CLI cannot discover venues alone.",
      },
      null,
      2,
    ),
  );
}

async function planReport(limit: number) {
  const { byCc } = await loadLiveByCc();
  const plan = buildFindPlan(byCc, loadAttempts(), { limit });
  console.log(JSON.stringify(plan, null, 2));
}

async function briefReport(opts: { cc?: string; city?: string; next: boolean }) {
  const { byCc } = await loadLiveByCc();
  const plan = buildFindPlan(byCc, loadAttempts(), { limit: 60 });
  const cell = opts.next ? pickNext(plan) : pickNext(plan, { cc: opts.cc, city: opts.city });
  if (!cell) {
    console.error(JSON.stringify({ error: "no cell", hint: "pass --cc=XX or run --plan" }, null, 2));
    process.exit(2);
  }
  const brief = buildFindBrief(cell);
  console.log(JSON.stringify(brief, null, 2));
}

async function loadOpenDebtCounts(): Promise<{ openAbout: number; openResearch: number }> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return { openAbout: 0, openResearch: 0 };
  const client = await MongoClient.connect(uri);
  try {
    const store = mongoListingQualityStore(client.db(process.env.MONGODB_DB ?? "padel-africa"));
    const open = await store.listOpenRecommendations(200);
    let openAbout = 0;
    let openResearch = 0;
    for (const r of open) {
      if (ABOUT_IMPROVE_KINDS.has(r.kind)) openAbout += 1;
      if (RESEARCH_DEBT_KINDS.has(r.kind)) openResearch += 1;
    }
    return { openAbout, openResearch };
  } finally {
    await client.close();
  }
}

async function untilFoundReport(maxCells: number) {
  const { byCc } = await loadLiveByCc();
  const debt = await loadOpenDebtCounts();
  const findBind = decideFindBind(debt);
  if (findBind.mode === "defer_heal_first") {
    recordProcessLesson({
      job: "catalog:find",
      kind: "defer_find",
      message: findBind.reason,
      evidence: [
        `openAbout:${findBind.openAbout}`,
        `openResearch:${findBind.openResearch}`,
      ],
      key: `defer:${new Date().toISOString().slice(0, 10)}:${findBind.openAbout}:${findBind.openResearch}`,
    });
    console.log(
      JSON.stringify(
        {
          job: "catalog:find",
          mode: "until-found",
          deferred: true,
          findBind,
          cells: [],
          firstBrief: null,
          instructions: [
            "Quality debt is hot — heal first before continent FIND.",
            ...findBind.healFirst,
            "Re-run npm run catalog:find -- --until-found after heal ticks clear open debt.",
          ],
        },
        null,
        2,
      ),
    );
    return;
  }
  const campaign = buildUntilFoundCampaign(byCc, loadAttempts(), { maxCells, yieldBias: true });
  console.log(JSON.stringify({ ...campaign, findBind, deferred: false }, null, 2));
}

function runSeed(fixture: string, dryRun: boolean) {
  const abs = resolve(fixture);
  if (!existsSync(abs)) throw new Error(`fixture not found: ${abs}`);
  const args = [resolve("scripts/seed-research-padel-africa.standalone.mjs"), `--fixture=${abs}`];
  if (dryRun) args.push("--dry-run");
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function doRecordAttempt() {
  const cc = argValue("--cc")?.toUpperCase();
  const city = argValue("--city");
  const outcome = argValue("--outcome") as "seeded" | "zero-result" | "skipped" | undefined;
  if (!cc || !city || !outcome || !["seeded", "zero-result", "skipped"].includes(outcome)) {
    console.error(
      JSON.stringify(
        {
          error: "usage",
          example:
            'npm run catalog:find -- --record-attempt --cc=ST --city="São Tomé" --outcome=zero-result',
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }
  const attempts = recordAttempt({
    cc,
    city,
    outcome,
    at: new Date().toISOString(),
  });
  console.log(
    JSON.stringify(
      { job: "catalog:find", mode: "record-attempt", recorded: { cc, city, outcome }, totalAttempts: attempts.length },
      null,
      2,
    ),
  );
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const dryRun = process.argv.includes("--dry-run");
  const status = process.argv.includes("--status");
  const plan = process.argv.includes("--plan");
  const brief = process.argv.includes("--brief");
  const next = process.argv.includes("--next");
  const untilFound = process.argv.includes("--until-found");
  const record = process.argv.includes("--record-attempt");
  const fixture = argValue("--fixture");
  const limit = Number(argValue("--limit") ?? "40") || 40;
  const maxCells = Number(argValue("--max-cells") ?? "8") || 8;

  if (status) {
    await statusReport();
    return;
  }
  if (untilFound) {
    await untilFoundReport(maxCells);
    return;
  }
  if (plan) {
    await planReport(limit);
    return;
  }
  if (brief || next) {
    await briefReport({
      next,
      cc: argValue("--cc"),
      city: argValue("--city"),
    });
    return;
  }
  if (record) {
    doRecordAttempt();
    return;
  }
  if (!fixture) {
    console.error(
      JSON.stringify(
        {
          error: "usage",
          agentRequired: true,
          examples: [
            "npm run catalog:find -- --status",
            "npm run catalog:find -- --until-found --max-cells 8",
            "npm run catalog:find -- --plan",
            "npm run catalog:find -- --next",
            "npm run catalog:find -- --brief --cc=KE --city=Mombasa",
            "npm run catalog:find -- --fixture=scripts/data/senegal-padel-verified.json --dry-run",
            'npm run catalog:find -- --record-attempt --cc=ST --city="São Tomé" --outcome=zero-result',
          ],
          note: "Prefer --until-found: execute cells until one seeds (or budget exhausted). See docs/padel-africa-find-continent-plan.md",
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }
  console.log(JSON.stringify({ job: "catalog:find", mode: dryRun ? "dry-run" : "apply", fixture }, null, 2));
  runSeed(fixture, dryRun);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
