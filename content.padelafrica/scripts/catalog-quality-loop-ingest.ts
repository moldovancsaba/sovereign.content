#!/usr/bin/env npx tsx
/**
 * catalog-quality-loop (ingest path) — full rewrite (no Mongo).
 *
 * Score → improve → encode against local verified fixtures, then apply via
 * POST /api/ingest (sourceText reprocess for research-* cards).
 *
 * Cognitive work runs in-process (no Ollama / AI Gateway). About text is
 * evidence-only from fixture facts — never invents courts/prices/phones.
 *
 *   INGEST_BASE_URL=https://padel-africa.doneisbetter.com \
 *   INGEST_API_KEY=… \
 *   npx tsx scripts/catalog-quality-loop-ingest.ts [--dry-run] [--limit N] [--apply]
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestSourceText, type IngestConfig } from "../ingest/client.ts";
import {
  ABOUT_QUALITY_TARGET,
  improveAbout,
  scoreAboutQuality,
  type FixtureFacts,
} from "./lib/aboutQuality.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(__dirname, "data");
const STORE = resolve(DATA, "listing-quality");

const COUNTRY_NAMES: Record<string, string> = {
  ZA: "South Africa",
  MA: "Morocco",
  TN: "Tunisia",
  KE: "Kenya",
  SN: "Senegal",
  NG: "Nigeria",
  MU: "Mauritius",
  BW: "Botswana",
  EG: "Egypt",
  ZW: "Zimbabwe",
  ZM: "Zambia",
  UG: "Uganda",
  CI: "Ivory Coast",
  MZ: "Mozambique",
  NA: "Namibia",
  RW: "Rwanda",
  GH: "Ghana",
  TZ: "Tanzania",
  AO: "Angola",
  DZ: "Algeria",
};

type FixtureRow = FixtureFacts & {
  primarySourceUrl?: string;
  secondarySourceUrl?: string;
  lat?: number;
  lng?: number;
};

type Recommendation = {
  id: string;
  recordId: string;
  cardId: string;
  kind: string;
  status: "open" | "applied" | "skipped" | "failed";
  scoreBefore: number;
  scoreAfter?: number;
  tactic?: string;
  reason?: string;
  defects: string[];
  improvedDescription?: string;
  updatedAt: string;
  error?: string;
};

type Lesson = {
  id: string;
  recommendationId: string;
  recordId: string;
  tactic: string;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  appliedAt: string;
};

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argInt(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  const n = Number.parseInt(process.argv[i + 1], 10);
  return Number.isFinite(n) ? n : fallback;
}

function sha12(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 12);
}

function ensureStore(): void {
  if (!existsSync(STORE)) mkdirSync(STORE, { recursive: true });
}

function loadJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function listVerifiedFiles(): string[] {
  return readdirSync(DATA)
    .filter((f) => f.endsWith("-padel-verified.json"))
    .map((f) => resolve(DATA, f));
}

function researchId(recordId: string): string {
  return `research-${recordId.toLowerCase()}`;
}

function buildSourceText(row: FixtureRow, description: string): string {
  const country = COUNTRY_NAMES[row.countryCode] || row.countryCode;
  const url = (row.primarySourceUrl || row.website || "").trim();
  return [
    url ? `URL: ${url}` : null,
    "Qualified as: padel-club",
    `Name: ${row.name.trim()}`,
    `Venue: ${row.name.trim()}`,
    `Address: ${(row.line1 || `Near ${row.city}`).trim()}`,
    `Locality: ${row.city.trim()}`,
    `Country: ${country}`,
    `CountryCode: ${String(row.countryCode).toUpperCase()}`,
    row.lat != null ? `Latitude: ${Number(row.lat)}` : null,
    row.lng != null ? `Longitude: ${Number(row.lng)}` : null,
    row.website ? `Website: ${row.website.trim()}` : null,
    row.phone ? `Phone: ${row.phone.trim()}` : null,
    "",
    description.trim(),
    row.region ? `Admin region: ${row.region.trim()}` : null,
    row.email ? `Email: ${row.email.trim()}` : null,
    row.secondarySourceUrl ? `Secondary source: ${row.secondarySourceUrl.trim()}` : null,
    row.seasonNote ? `Season note: ${String(row.seasonNote).trim()}` : null,
  ]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join("\n");
}

function writeFixtureDescription(file: string, recordId: string, description: string): void {
  const rows = JSON.parse(readFileSync(file, "utf8")) as FixtureRow[];
  const idx = rows.findIndex((r) => r.recordId === recordId);
  if (idx < 0) return;
  rows[idx] = { ...rows[idx], description };
  writeFileSync(file, JSON.stringify(rows, null, 2) + "\n");
}

async function main() {
  const dryRun = argFlag("--dry-run");
  const testMode = argFlag("--test");
  const apply = argFlag("--apply") || (!dryRun && !argFlag("--score-only") && !testMode);
  const scoreOnly = argFlag("--score-only");
  const limit = argInt("--limit", 40);
  const baseUrl =
    process.env.INGEST_BASE_URL ||
    process.env.PADEL_INGEST_BASE_URL ||
    "https://padel-africa.doneisbetter.com";
  const apiKey = process.env.INGEST_API_KEY || process.env.PADEL_INGEST_API_KEY || "";

  ensureStore();
  const recPath = resolve(STORE, "recommendations.json");
  const lessonPath = resolve(STORE, "lessons.json");
  const recommendations = loadJson<Recommendation[]>(recPath, []);
  const lessons = loadJson<Lesson[]>(lessonPath, []);
  const recById = new Map(recommendations.map((r) => [r.id, r]));

  const report = {
    job: "catalog:quality-loop",
    mode: testMode
      ? "test"
      : dryRun
        ? "dry-run"
        : scoreOnly
          ? "score-only"
          : apply
            ? "ingest-apply"
            : "local-only",
    mongo: "quarantined",
    writePath: "POST /api/ingest",
    aboutTarget: ABOUT_QUALITY_TARGET,
    scanned: 0,
    belowThreshold: 0,
    openRecs: 0,
    applied: 0,
    skipped: 0,
    failed: 0,
    encoded: 0,
    results: [] as Array<Record<string, unknown>>,
  };

  if (testMode) {
    const samples: FixtureFacts[] = [
      {
        recordId: "TEST-THIN",
        name: "Thin Club",
        city: "Nairobi",
        countryCode: "KE",
        countryName: "Kenya",
        line1: "Ngong Race Course",
        description: "Padel club.",
        venueModel: "own_premises",
      },
      {
        recordId: "TEST-URL",
        name: "Leak Club",
        city: "Dakar",
        countryCode: "SN",
        countryName: "Senegal",
        line1: "Avenue Malick Sy",
        description:
          "Leak Club is a padel club on Avenue Malick Sy. Outdoor courts. More at https://example.com Call +221 77 000 00 00.",
        venueModel: "own_premises",
        seasonNote: "Book ahead for evenings.",
      },
      {
        recordId: "TEST-GOOD",
        name: "Solid Club",
        city: "Cape Town",
        countryCode: "ZA",
        countryName: "South Africa",
        line1: "Camps Bay",
        description:
          "Solid Club is a clear recommendation for padel in Camps Bay, Cape Town, operating on its own premises. Confirm court hours and book ahead before you visit.",
        venueModel: "own_premises",
      },
    ];
    for (const facts of samples) {
      const before = scoreAboutQuality(facts.description || "", facts.city);
      const improved = improveAbout(facts);
      report.scanned++;
      if (before.score < ABOUT_QUALITY_TARGET || before.defects.length) report.belowThreshold++;
      report.results.push({
        recordId: facts.recordId,
        scoreBefore: before.score,
        defects: before.defects,
        ...improved,
      });
      if (improved.tactic !== "skip" && improved.scoreAfter > improved.scoreBefore) report.applied++;
      else report.skipped++;
    }
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (!apiKey && apply && !dryRun) {
    console.log(
      JSON.stringify(
        {
          ...report,
          error: "INGEST_API_KEY required for --apply",
          hint: "Export a scoped machine token; never use MONGODB_URI from this agent home.",
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
    return;
  }

  const cfg: IngestConfig = { baseUrl, apiKey };
  const candidates: Array<{ file: string; row: FixtureRow }> = [];

  for (const file of listVerifiedFiles()) {
    const rows = JSON.parse(readFileSync(file, "utf8")) as FixtureRow[];
    for (const row of rows) {
      if (!row?.recordId || !row?.name) continue;
      const { score, defects } = scoreAboutQuality(row.description || "", row.city);
      report.scanned++;
      if (score < ABOUT_QUALITY_TARGET || defects.length > 0) {
        report.belowThreshold++;
        candidates.push({ file, row });
      }
    }
  }

  // Prefer weakest first
  candidates.sort((a, b) => {
    const sa = scoreAboutQuality(a.row.description || "", a.row.city).score;
    const sb = scoreAboutQuality(b.row.description || "", b.row.city).score;
    return sa - sb;
  });

  const batch = candidates.slice(0, limit);
  report.openRecs = batch.length;

  for (const { file, row } of batch) {
    const facts: FixtureFacts = {
      ...row,
      countryName: COUNTRY_NAMES[row.countryCode] || row.countryCode,
    };
    const improved = improveAbout(facts);
    const kind = improved.defects[0] || "about_thin";
    const id = `lqr_${sha12(`${row.recordId}|${kind}`)}`;
    const cardId = researchId(row.recordId);
    const now = new Date().toISOString();

    const existing = recById.get(id);
    if (existing && (existing.status === "applied" || existing.status === "failed") && !argFlag("--force")) {
      report.skipped++;
      report.results.push({
        recordId: row.recordId,
        id,
        action: "skip_closed",
        scoreBefore: existing.scoreBefore,
        scoreAfter: existing.scoreAfter,
      });
      continue;
    }

    if (improved.tactic === "skip" || improved.reason === "compose_no_gain") {
      const rec: Recommendation = {
        id,
        recordId: row.recordId,
        cardId,
        kind,
        status: "skipped",
        scoreBefore: improved.scoreBefore,
        scoreAfter: improved.scoreAfter,
        tactic: improved.tactic,
        reason: improved.reason,
        defects: improved.defects,
        updatedAt: now,
      };
      recById.set(id, rec);
      report.skipped++;
      report.results.push({ recordId: row.recordId, id, action: "skipped", ...improved });
      continue;
    }

    if (dryRun || scoreOnly) {
      report.results.push({
        recordId: row.recordId,
        id,
        action: dryRun ? "dry-run" : "scored",
        file: basename(file),
        ...improved,
      });
      continue;
    }

    // Persist improved About onto fixture (local SSOT for agent)
    writeFixtureDescription(file, row.recordId, improved.improved);

    let ingestOk = true;
    let ingestError: string | undefined;
    let ingestRes: unknown;
    if (apply) {
      try {
        ingestRes = await ingestSourceText(cfg, {
          id: cardId,
          sourceText: buildSourceText({ ...row, description: improved.improved }, improved.improved),
          sourcePool: "source_seed",
          reprocess: true,
        });
      } catch (err) {
        ingestOk = false;
        ingestError = err instanceof Error ? err.message : String(err);
      }
    }

    const rec: Recommendation = {
      id,
      recordId: row.recordId,
      cardId,
      kind,
      status: ingestOk ? "applied" : "failed",
      scoreBefore: improved.scoreBefore,
      scoreAfter: improved.scoreAfter,
      tactic: improved.tactic,
      reason: improved.reason,
      defects: improved.defects,
      improvedDescription: improved.improved,
      updatedAt: now,
      error: ingestError,
    };
    recById.set(id, rec);

    if (ingestOk) {
      report.applied++;
      if (improved.scoreAfter > improved.scoreBefore) {
        const lessonId = `lql_${sha12(`${id}|${now}`)}`;
        lessons.push({
          id: lessonId,
          recommendationId: id,
          recordId: row.recordId,
          tactic: improved.tactic,
          scoreBefore: improved.scoreBefore,
          scoreAfter: improved.scoreAfter,
          delta: improved.scoreAfter - improved.scoreBefore,
          appliedAt: now,
        });
        report.encoded++;
      }
    } else {
      report.failed++;
    }

    report.results.push({
      recordId: row.recordId,
      id,
      cardId,
      action: ingestOk ? "applied" : "failed",
      scoreBefore: improved.scoreBefore,
      scoreAfter: improved.scoreAfter,
      tactic: improved.tactic,
      reason: improved.reason,
      ingestRes: ingestOk ? ingestRes : undefined,
      error: ingestError,
    });
  }

  if (!dryRun && !scoreOnly) {
    writeFileSync(recPath, JSON.stringify([...recById.values()], null, 2) + "\n");
    writeFileSync(lessonPath, JSON.stringify(lessons, null, 2) + "\n");
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
