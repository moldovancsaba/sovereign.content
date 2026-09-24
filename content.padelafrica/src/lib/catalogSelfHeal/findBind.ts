/**
 * Bind FIND growth to open About quality debt — heal thin cards before seeding more.
 * Research/contact gaps stay visible via self-heal briefs but do not block continent FIND
 * (historical no_evidence backlogs must not starve until-found).
 */
import { DEFAULT_FIND_DEFER_OPEN_ABOUT, type FindBindDecision } from "./types";

export function decideFindBind(opts: {
  openAbout: number;
  openResearch: number;
  deferAbout?: number;
}): FindBindDecision {
  const openAbout = Math.max(0, opts.openAbout);
  const openResearch = Math.max(0, opts.openResearch);
  const deferAbout = opts.deferAbout ?? DEFAULT_FIND_DEFER_OPEN_ABOUT;
  const openTotal = openAbout + openResearch;
  const healFirst: string[] = [];

  if (openAbout >= deferAbout) {
    healFirst.push(
      `npm run catalog:about-curate -- --limit 15`,
      `npm run catalog:quality-loop -- --score-limit 100 --improve-limit 40`,
    );
    return {
      mode: "defer_heal_first",
      reason: `open About debt ${openAbout} ≥ ${deferAbout} — curate/improve before FIND seeds more thin cards`,
      openAbout,
      openResearch,
      openTotal,
      healFirst,
    };
  }

  return {
    mode: "until-found",
    reason:
      openResearch > 0
        ? `About debt clear; ${openResearch} research gaps remain (run catalog:self-heal --brief in parallel)`
        : "quality debt below defer thresholds — FIND until-found may seed",
    openAbout,
    openResearch,
    openTotal,
    healFirst: [],
  };
}
