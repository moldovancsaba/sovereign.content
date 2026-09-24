/**
 * Draft visitor About copy the same way a Cloud Agent does for a single listing:
 * grounding in listing facts + optional research `sourceText`, never inventing amenities,
 * never embedding URLs/phones. Curated overrides live in Mongo (`listing_curated_abouts`),
 * never in the git tree.
 */
import { validatePublicDescription } from "@/lib/catalogHygiene/descriptionQuality";
import { composeAbout, sanitizeAbout } from "./composeAbout";
import { scoreAboutQuality } from "./score";
import { ABOUT_QUALITY_TARGET, type QualityListingSnapshot } from "./types";

export interface DraftAboutResult {
  description: string;
  tactic: "curated_existing" | "source_evidence" | "compose_about";
  score: number;
}

/** Pull the research prose block after structured headers (before adversarial re-verify). */
export function researchProseFromSourceText(sourceText: string): string {
  const lines = sourceText.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      if (i > 0) break;
      continue;
    }
    if (/^[A-Za-z][A-Za-z ]*?:\s*/.test(line)) {
      i += 1;
      continue;
    }
    break;
  }
  const body = lines.slice(i).join("\n");
  const cut = body.search(/\nAdversarial re-verification:/i);
  const prose = cut >= 0 ? body.slice(0, cut) : body;
  return sanitizeAbout(prose.replace(/\s+/g, " ").trim());
}

/**
 * Draft a recommendation-tone About (~300–450 chars when evidence allows).
 * Prefers an existing strong curated entry (Mongo map via options), then research prose, then composer.
 */
export function draftAboutFromEvidence(
  listing: QualityListingSnapshot,
  options: {
    sourceText?: string;
    curatedById?: Readonly<Record<string, string>>;
    listingNounSingular?: string;
  } = {},
): DraftAboutResult {
  const curated = options.curatedById?.[listing.id]?.trim();
  if (curated && curated.length >= 200) {
    const cleaned = sanitizeAbout(curated);
    const score = scoreAboutQuality(cleaned, listing.locality).score;
    if (!validatePublicDescription(cleaned, "description") && score >= ABOUT_QUALITY_TARGET) {
      return { description: cleaned, tactic: "curated_existing", score };
    }
  }

  if (options.sourceText) {
    const research = researchProseFromSourceText(options.sourceText);
    if (research.length >= 160) {
      let shaped = shapeResearchIntoAbout(listing, research);
      let score = scoreAboutQuality(shaped, listing.locality).score;
      if (score < ABOUT_QUALITY_TARGET) {
        shaped = ensureRecommendationLength(listing, shaped);
        score = scoreAboutQuality(shaped, listing.locality).score;
      }
      if (!validatePublicDescription(shaped, "description") && shaped.length >= 200) {
        return { description: shaped, tactic: "source_evidence", score };
      }
    }
  }

  const composed = composeAbout(listing, {
    curatedById: options.curatedById,
    listingNounSingular: options.listingNounSingular,
  });
  const enriched = ensureRecommendationLength(listing, composed.description);
  const score = scoreAboutQuality(enriched, listing.locality).score;
  return { description: enriched, tactic: "compose_about", score };
}

function shapeResearchIntoAbout(listing: QualityListingSnapshot, research: string): string {
  const name = listing.name.trim();
  const locality = listing.locality?.trim();
  let body = research;
  body = body
    .replace(/\b(?:I|We)\s+(?:loaded|found|confirmed|checked|could not)[^.]*\./gi, "")
    .replace(/\b(?:Adversarial|Independently verified|Found via)[^.]*\./gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!body.toLowerCase().includes(name.toLowerCase().slice(0, Math.min(12, name.length)))) {
    const place = [locality, listing.countryCode].filter(Boolean).join(", ");
    body = place
      ? `${name} is a recommended padel stop in ${place}. ${body}`
      : `${name} is a recommended padel destination. ${body}`;
  }
  if (body.length > 450) body = body.slice(0, 447).replace(/\s+\S*$/, "") + ".";
  if (body.length < 280) {
    body = ensureRecommendationLength(listing, body);
  }
  return sanitizeAbout(body);
}

function ensureRecommendationLength(listing: QualityListingSnapshot, text: string): string {
  let out = sanitizeAbout(text);
  const locality = listing.locality?.trim();
  const country = listing.countryCode?.trim();
  const street = listing.line1?.trim();
  const where = [street, locality, country].filter(Boolean).join(", ");
  if (out.length >= 300 && scoreAboutQuality(out, locality).score >= ABOUT_QUALITY_TARGET) return out;

  const extras = [
    where ? `Players looking for a named padel home will find a clear club address at ${where}.` : undefined,
    locality
      ? `A strong recommendation for regular sessions and visitors who want a real club community in ${locality}, not an anonymous pitch.`
      : "A strong recommendation for regular sessions and visitors who want a real club community, not an anonymous pitch.",
    "Ideal when you want a place you can recommend with confidence.",
  ].filter(Boolean) as string[];

  for (const extra of extras) {
    if (out.length >= 320 && scoreAboutQuality(out, locality).score >= ABOUT_QUALITY_TARGET) break;
    if (!out.toLowerCase().includes(extra.slice(0, 24).toLowerCase())) {
      out = sanitizeAbout(`${out} ${extra}`);
    }
  }
  if (out.length > 480) out = sanitizeAbout(out.slice(0, 477).replace(/\s+\S*$/, "") + ".");
  return out;
}
