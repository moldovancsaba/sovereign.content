/**
 * About / description quality for sportolok public listings.
 * Cursor Cloud Agent is the writer — reject garble; rewrite in Hungarian.
 */

export type AboutListing = {
  id: string;
  name: string;
  description: string;
  locality?: string;
  website?: string;
};

/** Known sludge / nonsense patterns from weak ingest or punctuation-only "QA". */
const GARBLE_PATTERNS: RegExp[] = [
  /\bvizipalack/i,
  /\b[a-záéíóöőúüű]{6,}orai\b/i,
  /különböző szintű/i,
  /tanúsztársaság/i,
  /úszásokat és gyógyítást/i,
  /tanulmányozását élvezhetik/i,
  /Facts sourced via fair-use/i,
  /descriptions are agent-authored/i,
  /\bis a (swimming|sport|fitness) facility at\b/i,
  /Visitors can check current programmes/i,
  /gyógytornai/i,
];

/** English boilerplate glued onto Hungarian (or vice versa) is not publishable. */
function hasLanguageCollision(text: string): boolean {
  const hasHu =
    /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(text) ||
    /\b(és|amely|központ|uszoda|tanuszoda|Budapest|Magyarország)\b/i.test(text);
  const hasEnBoiler =
    /\b(is a |facility at|Located in|Visitors can|Confirm opening|Facts sourced)\b/i.test(
      text,
    );
  return hasHu && hasEnBoiler;
}

export function detectAboutGarble(description: string): string | null {
  const d = (description || "").trim();
  if (!d) return "empty";
  for (const re of GARBLE_PATTERNS) {
    if (re.test(d)) return `pattern:${re.source}`;
  }
  if (hasLanguageCollision(d)) return "language_collision";
  // Long token with no vowels (OCR/garbage) — rare but cheap to catch
  if (/\b(?=[a-záéíóöőúüű]{10,})[b-df-hj-np-tv-z]{8,}\b/i.test(d)) {
    return "consonant_cluster";
  }
  return null;
}

export function scoreAbout(description: string): number {
  const d = (description || "").trim();
  if (!d || d.length < 40) return 0;
  if (detectAboutGarble(d)) return 10;
  if (d.length < 80) return 15;
  let score = 40;
  if (d.length >= 120) score += 15;
  if (d.length >= 200) score += 15;
  if (d.length >= 300) score += 10;
  const sentences = d.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length >= 2) score += 10;
  if (sentences.length >= 3) score += 5;
  if (/\d{1,2}:\d{2}/.test(d)) score += 5;
  if (
    /\b(Budapest|Hungary|Magyarország|uszoda|tanuszoda|fitness|tenisz|Siófok|Balaton)\b/i.test(
      d,
    )
  ) {
    score += 5;
  }
  // Prefer Hungarian visitor copy on sportolok
  if (/[áéíóöőúüű]/.test(d) && /\b(nyitvatart|program|látogat|ellenőriz)\b/i.test(d)) {
    score += 5;
  }
  return Math.min(100, score);
}

function placePhrase(listing: AboutListing): string {
  const name = listing.name || "";
  // Prefer settlement in the venue name when public locality is wrong/generic
  const fromName =
    name.match(
      /\b(Siófok|Siofok|Füzesgyarmat|Fuzesgyarmat|Debrecen|Miskolc|Győr|Gyor|Szeged|Pécs|Pecs|Székesfehérvár|Veszprém|Kecskemét|Edelény|Enying|Encs)\b/i,
    )?.[1];
  if (fromName) return fromName.replace(/Siofok/i, "Siófok").replace(/Fuzesgyarmat/i, "Füzesgyarmat");
  if (
    listing.locality &&
    !/^hungary$/i.test(listing.locality) &&
    !/^budapest$/i.test(listing.locality) // alone too weak when name says otherwise
  ) {
    return listing.locality;
  }
  if (listing.locality && /^budapest$/i.test(listing.locality) && /budapest|gazdagrét|xi\b/i.test(name)) {
    return listing.locality;
  }
  if (listing.locality && !/^hungary$/i.test(listing.locality)) return listing.locality;
  return "Magyarország";
}

/**
 * Safe Hungarian About from name + locality only — no invented phones/emails.
 * Used when source text is garble or below the quality bar.
 */
export function rewriteAboutHu(listing: AboutListing): { text: string; reason: string } {
  const name = (listing.name || "Ez a létesítmény").replace(/\s+/g, " ").trim();
  const place = placePhrase(listing);
  const lower = `${name} ${listing.description || ""}`.toLowerCase();

  let kind = "sportlétesítmény";
  if (/tanuszoda|uszoda|úszó|medence|vízisport|vizisport|kajak|kenu/i.test(lower)) {
    kind = /vízisport|vizisport|kajak|kenu/i.test(lower) ? "vízisport-központ" : "tanuszoda";
  } else if (/kézilabda|kezilabda|csarnok/i.test(lower)) {
    kind = "sportcsarnok";
  } else if (/fitness|edzőterem/i.test(lower)) {
    kind = "edzőterem";
  } else if (/wellness|szauna/i.test(lower)) {
    kind = "wellness létesítmény";
  }

  const text =
    `A ${name} ${place} területén működő ${kind}. ` +
    `Helyszíni programok, belépés és nyitvatartás előtt érdemes a hivatalos oldalon tájékozódni.`;

  return { text, reason: "rewrite_hu_from_name_locality" };
}

/**
 * Draft an About improvement. Returns null only when current text already clears the bar
 * and has no garble.
 */
export function draftAboutImprovement(
  listing: AboutListing,
  opts: { minScore?: number } = {},
): { text: string; reason: string } | null {
  const minScore = opts.minScore ?? 70;
  const current = (listing.description || "").trim();
  const garble = detectAboutGarble(current);
  const score = scoreAbout(current);

  if (!garble && score >= minScore) return null;

  if (garble || score < 40 || current.length < 40) {
    return rewriteAboutHu(listing);
  }

  // Mild cleanup: keep content, fix spacing/punctuation — never append English to HU
  let text = current.replace(/\s+/g, " ").trim();
  if (!/[.!?]$/.test(text)) text += ".";
  if (/[áéíóöőúüű]/i.test(text)) {
    if (!/\b(nyitvatart|tájékozód|ellenőriz)\b/i.test(text) && text.length < 180) {
      text += " Nyitvatartás és programok előtt érdemes a hivatalos oldalon tájékozódni.";
    }
  } else if (!/\b(confirm|check|opening)\b/i.test(text) && text.length < 180) {
    text += " Confirm opening hours and programmes before visiting.";
  }

  if (text === current) return rewriteAboutHu(listing);
  if (detectAboutGarble(text) || scoreAbout(text) <= score) {
    return rewriteAboutHu(listing);
  }
  return { text, reason: "clarity_improve" };
}
