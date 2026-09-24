/**
 * Do-until-find campaign — keep trying cells until one seeds (bounded).
 * Yield bias prefers deepen_large / high-directory markets so a tick is more
 * likely to land an opportunity without inventing.
 */

import { buildFindBrief } from "./brief";
import { buildFindPlan, HIGH_YIELD_CCS, type FindAttempt, type CountryLive } from "./plan";
import type { FindCampaign, FindCell, FindPriority } from "./types";

const YIELD_RANK: Record<FindPriority, number> = {
  deepen_large: 0,
  deepen_city: 1,
  sparse_n2: 2,
  sparse_n1: 3,
  missing: 4,
};

function isCooled(cell: FindCell): boolean {
  return cell.reason.includes("[zero-result cooldown");
}

/**
 * Reorder plan cells for until-found: skip cooled, prefer high-yield deepen,
 * then return up to maxCells.
 */
export function orderUntilFoundCells(cells: FindCell[], maxCells: number, yieldBias: boolean): FindCell[] {
  const fresh = cells.filter((c) => !isCooled(c));
  if (!yieldBias) return fresh.slice(0, maxCells);

  const scored = fresh.map((c, i) => {
    const yieldBoost = HIGH_YIELD_CCS.has(c.cc) ? -0.5 : 0;
    return { cell: c, rank: YIELD_RANK[c.priority] + yieldBoost, i };
  });
  scored.sort((a, b) => a.rank - b.rank || a.i - b.i);
  return scored.map((s) => s.cell).slice(0, maxCells);
}

export function buildUntilFoundCampaign(
  byCc: Record<string, CountryLive>,
  attempts: FindAttempt[] = [],
  opts: { maxCells?: number; yieldBias?: boolean; now?: number } = {},
): FindCampaign {
  const maxCells = Math.max(1, Math.min(opts.maxCells ?? 8, 20));
  const yieldBias = opts.yieldBias !== false;
  const plan = buildFindPlan(byCc, attempts, { limit: 120, now: opts.now });
  const cells = orderUntilFoundCells(plan.cells, maxCells, yieldBias);
  const first = cells[0];
  if (!first) {
    throw new Error("until-found: no research cells available");
  }

  return {
    job: "catalog:find",
    mode: "until-found",
    agentRequired: true,
    maxCells,
    stopWhen: "seeded",
    yieldBias,
    cells,
    firstBrief: buildFindBrief(first),
    instructions: [
      "GOAL: secure at least one new evidence-grade listing this campaign (stopWhen=seeded).",
      `Try cells in order (max ${maxCells}). Yield bias=${yieldBias}: deepen/high-directory markets first.`,
      "For each cell: WebSearch firstBrief/rebuild queries → verify evidence bar → seed OR record-attempt zero-result.",
      "On seeded: STOP. Run about-curate/media later if needed. Do not continue the queue.",
      "On zero-result: record-attempt, then `npm run catalog:find -- --until-found` again (or take the next cell in this list if still fresh).",
      "If all cells in this campaign are zero-result: stop with budget_exhausted — never invent a venue to satisfy the goal.",
      "Never invent phones/emails/ages/court counts.",
    ],
  };
}
