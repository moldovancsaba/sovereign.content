/**
 * Deterministic About composer — builds recommendation-length visitor prose from listing facts only.
 * Never invents court counts, prices, or amenities. Never embeds URLs or phone numbers
 * (`validatePublicDescription` rejects inline URLs).
 */
import { validatePublicDescription } from "@/lib/catalogHygiene/descriptionQuality";
import type { QualityListingSnapshot } from "./types";

export interface ComposeAboutOptions {
  /** Optional curated override keyed by listing id (e.g. OSM seed About file). */
  curatedById?: Readonly<Record<string, string>>;
  listingNounSingular?: string;
}

export interface ComposeAboutResult {
  description: string;
  tactic: "curated_about" | "compose_about";
}

/** Strip contact leaks and collapse whitespace; refuse to return URL-bearing prose. */
export function sanitizeAbout(text: string): string {
  let out = text
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "")
    .replace(/\bMore at\b[^.]*\.?/gi, "")
    .replace(/\bCall\s+\+?[\d\s().-]{6,}\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  // Drop dangling "More at" / "Call" leftovers
  out = out.replace(/\b(?:More at|Call)\s*$/i, "").trim();
  if (out && !/[.!?]$/.test(out)) out = `${out}.`;
  return out;
}

export function composeAbout(listing: QualityListingSnapshot, options: ComposeAboutOptions = {}): ComposeAboutResult {
  const curated = options.curatedById?.[listing.id]?.trim();
  if (curated && curated.length >= 120) {
    const cleaned = sanitizeAbout(curated);
    if (!validatePublicDescription(cleaned, "description") && cleaned.length >= 120) {
      return { description: cleaned, tactic: "curated_about" };
    }
  }

  const noun = (options.listingNounSingular || "club").trim() || "club";
  const name = listing.name.trim();
  const locality = listing.locality?.trim();
  const region = listing.region?.trim();
  const country = listing.countryCode?.trim();
  const street = listing.line1?.trim();
  const placeBits = [street && !/^near /i.test(street) ? street : null, locality, region, country].filter(Boolean);
  const place = placeBits.join(", ");

  const setting = settingPhrase(listing);
  const whoFor = whoForPhrase(listing, locality, country);
  const lead = street && locality && country
    ? `${name} brings padel to ${street} in ${locality}, ${country}`
    : locality && country
      ? `${name} is a padel ${noun} in ${locality}, ${country}`
      : place
        ? `${name} is a padel ${noun} at ${place}`
        : `${name} is a padel ${noun} worth knowing on this catalogue`;

  const sentences = [
    `${lead}.`,
    setting,
    whoFor,
    locality
      ? `A confident recommendation when you want a real padel session in ${locality} — easy to find, easy to share with friends.`
      : "A confident recommendation when you want a real padel session — easy to find, easy to share with friends.",
  ].filter(Boolean) as string[];

  let description = sanitizeAbout(sentences.join(" "));
  if (description.length < 280 && place) {
    description = sanitizeAbout(
      `${name} is a recommended padel stop in ${locality || place}. ${setting || "Expect a dedicated padel address with a clear club identity."} ${whoFor || "A solid pick when you want a real club, not an anonymous pitch."} Ideal for players and visitors who want a named home court they can recommend with confidence.`,
    );
  }
  if (validatePublicDescription(description, "description")) {
    // Last resort: strip anything the gate still rejects
    description = sanitizeAbout(description.replace(/\b(?:https?:\/\/|www\.)\S+/gi, ""));
  }
  return { description, tactic: "compose_about" };
}

function settingPhrase(listing: QualityListingSnapshot): string | undefined {
  const model = listing.venueModel;
  const note = listing.seasonNote?.trim();
  const hoursHint =
    note && note.length <= 40 && !/^hours not listed/i.test(note) && !/^osm /i.test(note)
      ? `Hours tend to run ${note.replace(/^open\s+/i, "")}`
      : undefined;

  if (model === "outdoors") {
    return hoursHint
      ? `Outdoor courts with a proper club setting — ${hoursHint.toLowerCase()}.`
      : "Outdoor courts in a proper club setting, built for open-air sessions rather than a borrowed hall.";
  }
  if (model === "own_premises") {
    return hoursHint
      ? `A dedicated premises with padel as the main act — ${hoursHint.toLowerCase()}.`
      : "A dedicated premises with padel as the main act — a walk-in club address, not a pop-up pitch.";
  }
  return hoursHint ? `${hoursHint}.` : undefined;
}

function whoForPhrase(listing: QualityListingSnapshot, locality?: string, country?: string): string | undefined {
  const where = locality && country ? `${locality}` : locality || country || "the area";
  if (listing.venueModel === "outdoors") {
    return `A strong recommendation when you want open-air rallies in ${where} without hunting anonymous courts.`;
  }
  return `Ideal for players and visitors who want a named padel home in ${where} — easy to find, easy to recommend.`;
}
