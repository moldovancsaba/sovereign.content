/**
 * Build a needs_verify research candidate from fair-use citation facts.
 * Does NOT invent phones/emails. Directory URL is citation only.
 */

import { hostOf, slugifyId, type FairUseCandidate, type SourceMeta } from "./common.ts";
import type { ExtractedFacts } from "./extract.ts";
import { isJunkWebsite } from "./leadQuality.ts";

export function buildCandidate(
  facts: ExtractedFacts,
  source: SourceMeta,
): { candidate: FairUseCandidate | null; rejectReason: string | null } {
  const name = String(facts.name || "").trim();
  if (!name || name === "Unknown club") {
    return { candidate: null, rejectReason: "empty_name" };
  }

  const srcHost = hostOf(source.base);
  let website = String(facts.website || "").trim();
  if (!website || isJunkWebsite(website, srcHost) || hostOf(website) === srcHost) {
    // Keep citation as researchSources but do not pretend the directory is the club site
    website = "";
  }

  const citationUrl = facts.citationUrl || source.base;
  const candidateId = `fair-${source.id}-${slugifyId(name)}`;

  const researchNote = [
    `Discovered via ${source.name} fair-use one-lead research.`,
    website
      ? "Official club website is the Find/ingest target; directory page is citation only."
      : "No external club website extracted — agent must confirm an official URL before ingest.",
    "Status needs_verify: clear evidence bar (street/locality + contact or booking URL) before fixture apply.",
  ].join(" ");

  return {
    candidate: {
      candidateId,
      sourceId: source.id,
      sourceName: source.name,
      name,
      citationUrl,
      website,
      cityHint: facts.cityHint,
      countryHint: facts.countryHint,
      addressHint: facts.address,
      researchSources: [citationUrl, website].filter(Boolean),
      researchNote,
      status: "needs_verify",
      extractedAt: new Date().toISOString(),
    },
    rejectReason: null,
  };
}
