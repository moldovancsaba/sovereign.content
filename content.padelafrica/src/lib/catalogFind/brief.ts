/**
 * Agent FIND brief — encodes the strong research capability the CLI cannot run itself.
 * Cloud Agent ticks must execute this brief with WebSearch / page fetch, then seed.
 */

import { buildSearchQueries, sourceChecksFor } from "./sources";
import type { FindBrief, FindCell } from "./types";

export const EVIDENCE_BAR = [
  "Named operating venue (not a generic directory dump of the city).",
  "Location: street or locality pin inside the target country (Nominatim OK).",
  "At least one contact channel OR first-party / booking page URL.",
  "Corroboration: prefer two independent sources (directory + club site, or booking + phone).",
  "About ≥120 chars, no embedded URLs/phones in description chrome.",
  "Never invent court counts, ages, emails, or phones not printed on an evidence page.",
] as const;

export function buildFindBrief(cell: FindCell): FindBrief {
  const nextNum = String((cell.publishedInCountry || 0) + 1).padStart(3, "0");
  const recordId = `${cell.recordIdPrefix}-VEN-${nextNum}`;
  const fixture = cell.fixtureHint;

  return {
    job: "catalog:find",
    mode: "brief",
    agentRequired: true,
    cell,
    searchQueries: buildSearchQueries(cell.country, cell.city, cell.cc),
    sourcesToCheck: sourceChecksFor(cell.country, cell.city),
    evidenceBar: [...EVIDENCE_BAR],
    excludeNames: cell.knownNames,
    steps: [
      "Run each searchQueries entry via WebSearch (or equivalent). Open promising official/directory pages.",
      `Focus city: ${cell.city}, ${cell.country} (${cell.cc}). Priority: ${cell.priority}.`,
      "Reject launching-only / under-construction clubs unless they already take bookings with a public address.",
      "If a candidate clears the evidence bar and is NOT in excludeNames, append a fixture row.",
      `Write/append ${fixture} with recordId ${recordId} (or next free id).`,
      `Dry-run: npm run catalog:find -- --fixture=${fixture} --dry-run`,
      `Apply: npm run catalog:find -- --fixture=${fixture}`,
      "Update the country research-seed.md + coverage index when seeding.",
      "Record attempt: npm run catalog:find -- --record-attempt --cc=" +
        cell.cc +
        " --city=" +
        JSON.stringify(cell.city) +
        " --outcome=seeded|zero-result",
    ],
    zeroResultProtocol: [
      "If no evidence-grade venue appears after the query set + directory pass, DO NOT invent.",
      "Record outcome=zero-result for this cell (14-day cooldown rotates the plan).",
      "Document briefly in docs/ or the existing zero-result seed when the country is still missing entirely.",
    ],
    applyCommands: [
      `npm run catalog:find -- --fixture=${fixture} --dry-run`,
      `npm run catalog:find -- --fixture=${fixture}`,
      `npm run catalog:find -- --record-attempt --cc=${cell.cc} --city=${JSON.stringify(cell.city)} --outcome=seeded`,
    ],
  };
}
