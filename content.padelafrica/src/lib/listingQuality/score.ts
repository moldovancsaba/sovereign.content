/**
 * About-quality scoring for published listings — the FIND half of the listing quality loop.
 * Pure: no I/O. Thresholds are deliberate and tested so improve runs stay stable.
 */
import { validatePublicDescription } from "@/lib/catalogHygiene/descriptionQuality";
import {
  ABOUT_QUALITY_TARGET,
  recommendationId,
  type QualityKind,
  type QualityListingSnapshot,
  type QualityRecommendation,
} from "./types";

const TEMPLATE_PATTERN =
  /^[\w'’.\- ]+ is a (?:padel )?club (?:on|in|located on|located in) .+\.\s*(?:Outdoor courts\.|Indoor (?:courts|venue|sports hall)\.|Covered courts\.|Floodlit(?: for evening play)?\.|Paid access\.|Free to play\.|Customers only\.|Open [^.]+\.|Call [^.]+\.|More at [^.]+\.|)*$/i;

const CONTACT_LEAK_PATTERN = /\b(?:more at|call\s+\+?\d|visit us at)\b/i;
// Stem-friendly: "recommended" must match (plain `recommend` + trailing \b fails mid-word).
// Plurals: sessions/players already covered via optional s where needed.
const RECOMMENDATION_WORDS =
  /\b(?:recommend(?:ed|ation)?|ideal|destination|pick|come for|players?|sessions?|community|harbour|harbor|waterfront|floodlit|covered|outdoor|indoor)\b/i;

export interface AboutQualityReport {
  score: number;
  kinds: QualityKind[];
  evidence: string[];
}

/** Score a listing's About prose 0–100. Higher is better. */
export function scoreAboutQuality(description: string, locality?: string): AboutQualityReport {
  const text = (description ?? "").trim();
  const kinds: QualityKind[] = [];
  const evidence: string[] = [];
  let score = 0;

  if (!text) {
    return { score: 0, kinds: ["about_thin"], evidence: ["empty description"] };
  }

  const len = text.length;
  if (len < 40) {
    score += 5;
    kinds.push("about_thin");
    evidence.push(`too short (${len} chars)`);
  } else if (len < 120) {
    score += 15;
    kinds.push("about_thin");
    evidence.push(`thin (${len} chars)`);
  } else if (len < 280) {
    score += 30;
    evidence.push(`moderate length (${len} chars)`);
  } else if (len <= 650) {
    score += 45;
    evidence.push(`good length (${len} chars)`);
  } else {
    score += 35;
    evidence.push(`long (${len} chars)`);
  }

  const chrome = validatePublicDescription(text, "description");
  if (chrome) {
    score -= 40;
    if (/inline URL/i.test(chrome)) kinds.push("about_url");
    else kinds.push("about_chrome");
    evidence.push(chrome);
  }

  if (CONTACT_LEAK_PATTERN.test(text)) {
    score -= 20;
    kinds.push("about_contact_leak");
    evidence.push("contact leak in About (phone/URL cue)");
  }

  if (TEMPLATE_PATTERN.test(text) || /\bis a padel club on\b/i.test(text) && len < 220) {
    score -= 25;
    kinds.push("about_template");
    evidence.push("template-style About");
  }

  // Locality name-drop alone must not clear the publish bar (padel soft-Abouts were scoring
  // 55 + 15 = 70 and starving about-curate / quality-loop). Cap the place bonus.
  if (locality && text.toLowerCase().includes(locality.toLowerCase())) {
    score += 5;
    evidence.push("mentions locality");
  }

  if (RECOMMENDATION_WORDS.test(text) && len >= 200) {
    score += 15;
    evidence.push("recommendation tone");
  }

  // Still thin for visitors when under a real recommendation length with no tone signal.
  if (len < 320 && !RECOMMENDATION_WORDS.test(text) && !kinds.includes("about_thin")) {
    kinds.push("about_thin");
    evidence.push(`soft About (${len} chars, no recommendation tone)`);
  }

  if (!chrome) {
    score += 10;
    evidence.push("no scraped chrome");
  }

  score = Math.max(0, Math.min(100, score));
  const uniqueKinds = [...new Set(kinds)];
  return { score, kinds: uniqueKinds, evidence };
}

export function needsAboutImprovement(report: AboutQualityReport): boolean {
  return report.score < ABOUT_QUALITY_TARGET || report.kinds.length > 0;
}

/** Build open recommendations for one listing snapshot. */
export function recommendationsForListing(
  listing: QualityListingSnapshot,
  now: string,
): QualityRecommendation[] {
  const report = scoreAboutQuality(listing.description, listing.locality);
  if (!needsAboutImprovement(report) && report.score >= ABOUT_QUALITY_TARGET) return [];

  const kinds = report.kinds.length > 0 ? report.kinds : (["about_thin"] as QualityKind[]);
  return kinds.map((kind) => {
    const severity = kind === "about_url" || kind === "about_chrome" ? "high" : report.score < 40 ? "high" : report.score < 70 ? "medium" : "low";
    return {
      id: recommendationId(listing.id, kind),
      listingId: listing.id,
      kind,
      severity,
      scoreBefore: report.score,
      message: aboutMessage(kind, listing.name, report.score),
      evidence: report.evidence,
      status: "open" as const,
      createdAt: now,
      updatedAt: now,
    };
  });
}

function aboutMessage(kind: QualityKind, name: string, score: number): string {
  switch (kind) {
    case "about_url":
      return `${name}: About contains an inline URL (score ${score})`;
    case "about_chrome":
      return `${name}: About contains scraped page chrome (score ${score})`;
    case "about_contact_leak":
      return `${name}: About leaks phone/website cues — move to contact fields (score ${score})`;
    case "about_template":
      return `${name}: About is template-thin; rewrite as a visitor recommendation (score ${score})`;
    case "operator_feedback":
      return `${name}: operator feedback asked for an About revisit (score ${score})`;
    case "about_thin":
    default:
      return `${name}: About is too thin for a published card (score ${score})`;
  }
}
