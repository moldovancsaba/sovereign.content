/**
 * Continent FIND planner — turn live country/city counts into a prioritized queue.
 *
 * Priority order (continent scale):
 *   1. missing countries (0 published) — capital cell
 *   2. sparse n=1 — second venue in capital or first secondary city
 *   3. sparse n=2 — third venue / secondary city
 *   4. deepen_city — secondary cities not yet represented when country has 3–8
 *   5. deepen_large — large markets with capital-heavy sampling (KE Nairobi-only, GH Accra-only, …)
 *
 * Zero-result cooldowns: recent attempts for a cell are deprioritized, not deleted.
 */

import { AFRICA_FIND_BY_CC, AFRICA_FIND_CELLS, type CountryCellMeta } from "./africaCells";
import type { FindCell, FindPlan, FindPriority } from "./types";

export type CountryLive = {
  n: number;
  names: string[];
  cities: Record<string, number>;
};

export type FindAttempt = {
  cc: string;
  city: string;
  at: string; // ISO
  outcome: "seeded" | "zero-result" | "skipped";
};

const PRIORITY_RANK: Record<FindPriority, number> = {
  missing: 0,
  sparse_n1: 1,
  sparse_n2: 2,
  deepen_city: 3,
  deepen_large: 4,
};

const LARGE_MARKET_MIN = 4;
const ZERO_RESULT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Markets where directories / booking networks historically yield evidence faster.
 * Used only by `--until-found` yield bias — not for inventing venues.
 */
export const HIGH_YIELD_CCS: ReadonlySet<string> = new Set([
  "ZA",
  "EG",
  "MA",
  "NG",
  "KE",
  "GH",
  "TN",
  "SN",
  "CI",
  "AO",
  "TZ",
  "MU",
  "NA",
]);



function normCity(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cityCovered(knownCities: string[], target: string): boolean {
  const t = normCity(target);
  return knownCities.some((k) => {
    const n = normCity(k);
    return n === t || n.includes(t) || t.includes(n);
  });
}

function fixtureHint(meta: CountryCellMeta): string {
  return `scripts/data/${meta.slug}-padel-verified.json`;
}

function attemptFresh(attempts: FindAttempt[], cc: string, city: string, now: number): boolean {
  const hit = attempts
    .filter((a) => a.cc === cc && normCity(a.city) === normCity(city) && a.outcome === "zero-result")
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!hit) return false;
  return now - Date.parse(hit.at) < ZERO_RESULT_COOLDOWN_MS;
}

function cell(
  meta: CountryCellMeta,
  city: string,
  priority: FindPriority,
  live: CountryLive | undefined,
  reason: string,
): FindCell {
  return {
    cc: meta.cc,
    country: meta.country,
    city,
    priority,
    publishedInCountry: live?.n ?? 0,
    knownNames: live?.names ?? [],
    knownCities: Object.keys(live?.cities ?? {}),
    reason,
    fixtureHint: fixtureHint(meta),
    recordIdPrefix: meta.recordPrefix,
  };
}

/**
 * Build prioritized FIND cells from live Mongo country/city distribution.
 */
export function buildFindPlan(
  byCc: Record<string, CountryLive>,
  attempts: FindAttempt[] = [],
  opts: { limit?: number; now?: number } = {},
): FindPlan {
  const now = opts.now ?? Date.now();
  // Default high enough to keep sparse/deepen cells visible even when many
  // countries are still missing (54 capitals + secondary deepen rows).
  const limit = opts.limit ?? 120;
  const cells: FindCell[] = [];

  for (const meta of AFRICA_FIND_CELLS) {
    const live = byCc[meta.cc];
    const n = live?.n ?? 0;
    const knownCities = Object.keys(live?.cities ?? {});

    if (n === 0) {
      cells.push(
        cell(meta, meta.capital, "missing", live, `No PUBLISHED listings — open with capital ${meta.capital}.`),
      );
      continue;
    }

    if (n === 1) {
      const secondCity = meta.secondary.find((c) => !cityCovered(knownCities, c)) ?? meta.capital;
      cells.push(
        cell(
          meta,
          secondCity,
          "sparse_n1",
          live,
          `Only 1 listing (${live!.names[0] ?? "?"}) — need a second evidence-grade venue (${secondCity}).`,
        ),
      );
      continue;
    }

    if (n === 2) {
      const nextCity = meta.secondary.find((c) => !cityCovered(knownCities, c)) ?? meta.capital;
      cells.push(
        cell(
          meta,
          nextCity,
          "sparse_n2",
          live,
          `Only 2 listings — add a third venue or first uncovered secondary city (${nextCity}).`,
        ),
      );
      continue;
    }

    // Secondary cities not yet represented
    for (const city of meta.secondary) {
      if (cityCovered(knownCities, city)) continue;
      if (n >= 3 && n < LARGE_MARKET_MIN) {
        cells.push(
          cell(meta, city, "deepen_city", live, `${meta.country} sampled (${n}) but ${city} has no listing yet.`),
        );
      } else if (n >= LARGE_MARKET_MIN) {
        cells.push(
          cell(
            meta,
            city,
            "deepen_large",
            live,
            `Large/mid market (${n} listings) still capital-heavy — open ${city}.`,
          ),
        );
      }
    }
  }

  // Deprioritize fresh zero-results hard enough that sparse/deepen beat cooled missing.
  const scored = cells.map((c, i) => {
    const cooled = attemptFresh(attempts, c.cc, c.city, now);
    return {
      cell: c,
      rank: PRIORITY_RANK[c.priority] + (cooled ? 10 : 0),
      cooled,
      i,
    };
  });

  scored.sort((a, b) => a.rank - b.rank || a.i - b.i);
  const ordered = scored.map((s) =>
    s.cooled
      ? {
          ...s.cell,
          reason: `${s.cell.reason} [zero-result cooldown — rotate unless new evidence appeared]`,
        }
      : s.cell,
  );

  const sliced = ordered.slice(0, limit);
  const published = Object.values(byCc).reduce((sum, v) => sum + v.n, 0);
  const countriesWithListings = Object.keys(byCc).filter((k) => k !== "?" && (byCc[k]?.n ?? 0) > 0).length;
  const missingCount = AFRICA_FIND_CELLS.filter((m) => !(byCc[m.cc]?.n)).length;
  const sparseCount = AFRICA_FIND_CELLS.filter((m) => {
    const n = byCc[m.cc]?.n ?? 0;
    return n >= 1 && n <= 2;
  }).length;

  return {
    job: "catalog:find",
    mode: "plan",
    published,
    countriesWithListings,
    missingCount,
    sparseCount,
    cells: sliced,
    strategy: [
      "Continent FIND is city-scoped, not one-pass-per-country.",
      "Priority: missing capitals → sparse n=1 → sparse n=2 → uncovered secondary cities → large-market deepen.",
      "Cloud Agent MUST WebSearch + verify official/directory evidence; CLI only plans + seeds fixtures.",
      "Never invent phones/emails/ages/court counts. Zero-result is first-class (record attempt).",
      "Do not reseed knownNames. Prefer cities with no coverage over stacking the same capital.",
    ],
    next: sliced[0] ?? null,
  };
}

export function pickNext(
  plan: FindPlan,
  opts: { cc?: string; city?: string } = {},
): FindCell | null {
  if (opts.cc) {
    const cc = opts.cc.toUpperCase();
    const match = plan.cells.find(
      (c) => c.cc === cc && (!opts.city || normCity(c.city) === normCity(opts.city)),
    );
    if (match) return match;
    const meta = AFRICA_FIND_BY_CC.get(cc);
    if (!meta) return null;
    return cell(meta, opts.city ?? meta.capital, "missing", undefined, `Forced brief for ${cc}.`);
  }
  return plan.next;
}
