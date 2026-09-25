/**
 * Evidence-only About scoring + compose for ingest-backed quality-loop.
 * Never invents courts, prices, amenities, phones, or emails into description.
 */

export const ABOUT_QUALITY_TARGET = 75;

export type AboutDefect =
  | "about_thin"
  | "about_template"
  | "about_url"
  | "about_contact_leak"
  | "about_chrome";

export type FixtureFacts = {
  recordId: string;
  name: string;
  city: string;
  region?: string;
  countryCode: string;
  countryName?: string;
  line1?: string;
  venueModel?: string;
  seasonNote?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
};

const TEMPLATE_RE =
  /^[\w\s''.-]+ is a padel club (on|in|at) .{10,80}\.?\s*(Outdoor courts\.?)?\s*(More at .+)?$/i;
const URL_RE = /https?:\/\/\S+/i;
const CONTACT_LEAK_RE = /\b(more at|call\s+\+|whatsapp\s+\+|email\s*:)/i;
const CHROME_RE = /\b(cookie|subscribe to newsletter|add to cart|privacy policy)\b/i;

export function scoreAboutQuality(
  description: string,
  locality?: string,
): { score: number; defects: AboutDefect[] } {
  const desc = (description || "").trim();
  const defects: AboutDefect[] = [];

  if (desc.length < 80) defects.push("about_thin");
  if (TEMPLATE_RE.test(desc)) defects.push("about_template");
  if (URL_RE.test(desc)) defects.push("about_url");
  if (CONTACT_LEAK_RE.test(desc)) defects.push("about_contact_leak");
  if (CHROME_RE.test(desc)) defects.push("about_chrome");

  let score = 0;
  if (desc.length >= 80) score += 25;
  if (desc.length >= 160) score += 15;
  if (desc.length >= 260) score += 10;

  const sentences = desc.split(/[.!?]+/).filter((s) => s.trim().length > 12);
  if (sentences.length >= 2) score += 15;
  if (sentences.length >= 3) score += 10;

  if (locality && desc.toLowerCase().includes(locality.toLowerCase())) score += 10;
  if (/\brecommend/i.test(desc)) score += 5;
  if (!URL_RE.test(desc) && desc.length >= 80) score += 5;
  if (!CONTACT_LEAK_RE.test(desc) && desc.length >= 80) score += 5;

  score = Math.max(0, Math.min(100, score - defects.length * 12));
  return { score, defects };
}

/** Strip URLs / contact leaks / chrome without inventing new claims. */
export function stripAboutChrome(description: string): string {
  let out = (description || "").trim();
  out = out.replace(URL_RE, "").replace(/\s{2,}/g, " ").trim();
  out = out.replace(/\bMore at[^.]*\.?/gi, "").trim();
  out = out.replace(/\bCall\s+\+[0-9][^.]*\.?/gi, "").trim();
  out = out.replace(/\b(Cookie|Subscribe to newsletter|Add to cart|Privacy policy)[^.]*\.?/gi, "").trim();
  if (out && !/[.!?]$/.test(out)) out += ".";
  return out.replace(/\s{2,}/g, " ").trim();
}

/**
 * Compose recommendation prose from fixture facts only.
 * Phones/emails/websites stay out of About (contact fields).
 */
export function composeAboutFromFacts(facts: FixtureFacts): string {
  const name = facts.name.trim();
  const city = facts.city.trim();
  const country = (facts.countryName || facts.countryCode).trim();
  const line1 = (facts.line1 || "").trim();
  const region = (facts.region || "").trim();
  const venue = (facts.venueModel || "").trim();
  const season = (facts.seasonNote || "").replace(/\s+/g, " ").trim();

  const placeBits = [line1, city, region].filter(Boolean);
  const place = placeBits.length ? placeBits.slice(0, 2).join(", ") : city;

  const venueBit =
    venue === "hosted_facility"
      ? "hosted on an existing sports or hotel campus"
      : venue === "own_premises"
        ? "operating on its own premises"
        : "open for bookable play";

  const parts: string[] = [];
  parts.push(
    `${name} is a clear recommendation for padel in ${city}, ${country}, ${venueBit}${place ? ` at ${place}` : ""}.`,
  );
  if (season && season.length < 160 && !URL_RE.test(season) && !CONTACT_LEAK_RE.test(season)) {
    parts.push(season.endsWith(".") ? season : `${season}.`);
  } else {
    parts.push("Confirm court hours and book ahead before you visit.");
  }

  return parts.join(" ").replace(/\s{2,}/g, " ").trim();
}

export function improveAbout(facts: FixtureFacts): {
  improved: string;
  tactic: "skip" | "strip_chrome" | "compose_about";
  scoreBefore: number;
  scoreAfter: number;
  defects: AboutDefect[];
  reason: string;
} {
  const before = scoreAboutQuality(facts.description || "", facts.city);
  if (before.score >= ABOUT_QUALITY_TARGET && before.defects.length === 0) {
    return {
      improved: (facts.description || "").trim(),
      tactic: "skip",
      scoreBefore: before.score,
      scoreAfter: before.score,
      defects: before.defects,
      reason: "already_good_quality",
    };
  }

  if (
    before.defects.some((d) => d === "about_url" || d === "about_chrome" || d === "about_contact_leak") &&
    (facts.description || "").trim().length >= 80
  ) {
    const stripped = stripAboutChrome(facts.description || "");
    const afterStrip = scoreAboutQuality(stripped, facts.city);
    if (afterStrip.score > before.score && afterStrip.defects.length < before.defects.length) {
      return {
        improved: stripped,
        tactic: "strip_chrome",
        scoreBefore: before.score,
        scoreAfter: afterStrip.score,
        defects: before.defects,
        reason: "stripped_url_chrome_or_contact_leak",
      };
    }
  }

  const composed = composeAboutFromFacts(facts);
  const after = scoreAboutQuality(composed, facts.city);
  return {
    improved: composed,
    tactic: "compose_about",
    scoreBefore: before.score,
    scoreAfter: after.score,
    defects: before.defects,
    reason: after.score > before.score ? "composed_from_fixture_facts" : "compose_no_gain",
  };
}
