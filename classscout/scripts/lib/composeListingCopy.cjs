/**
 * Evidence-based public listing copy for Find / Improve.
 *
 * Prefer official-page about text (og/meta/JSON-LD). Never invent amenities.
 * Reject inventory boilerplate ("listed on … as a family program", "offers kids programs in").
 * Never append meta chrome ("Address on record", "serves families in") — address/place belong
 * in structured fields, not pasted into the about prose.
 * Always strip HTML tags and decode entities before anything reaches ingest.
 */
const { stripUrlsFromPublicCopy } = require("./publicCopyHygiene.cjs");
const { cleanStreetAddress, isUsableStreetLine } = require("./extractOfficialPage.cjs");

const WEAK_COPY_PATTERNS = [
  /\boffers kids programs in\b/i,
  /\bis listed on\b.+\bas a (?:family|queens family) program\b/i,
  /\blisted services include\b/i,
  /\bclassscout provider research\b/i,
  /\braising queens kids as a\b/i,
  /\bfair-use one-lead research\b/i,
  // Composer/meta chrome that leaked into public about prose.
  // No trailing \b after `:` — colon is already non-word, so `\b` never matches before a space.
  /\baddress on record:/i,
  /\bserves families in\b/i,
  /\bis listed for families in\b/i,
  /\bprograms noted in research:/i,
  /\blocation:\s*\d/i,
  // Unresolved CMS / template tokens (`{martial_arts_styles}`).
  /\{[a-z][a-z0-9_]{2,}\}/i,
  // Google Website Translator consent banner scraped into About.
  /third-party service to translate/i,
  /accept the service to view the translations/i,
  /consent to load the translations/i,
  // Marketplace / city-hub homepage marketing (KidClick /nyc) scraped over venue meta.
  /across all five NYC boroughs/i,
  /updated daily from parks/i,
  /every borough,\s*one place/i,
  /Discover kids classes,\s*camps,\s*and events across/i,
  /Find kids classes,\s*camps,\s*and events across New York City/i,
  // Hero slogan + register/schedule CTA chrome (gym Squarespace sites).
  /Register for Classes/i,
  /View Class Schedules/i,
  /Stretch\.\s*Jump\.\s*Swing/i,
  // Shopify storefront chatbot FAQ chrome (JSON-LD description widget).
  /Used to get facts about the stores? policies/i,
  /Some examples of questions you can ask are/i,
  /What is your return policy\?/i,
  /What is your shipping policy\?/i,
  /What are your hours of operation\?/i,
  /A natural language query/i,
  /Additional information about the request such as user demographics/i,
];

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*?>/i;
const HTML_ENTITY_PATTERN = /&(?:nbsp|amp|quot|apos|lt|gt|#\d+|#x[0-9a-fA-F]+);/i;
/** JSON key bleed or quote scrap inside public copy. */
const JSON_SCRAP_PATTERN = /[\\]*["']\s*,\s*[\\]*["']?\s*(?:email|phone|address)\b|["'}{\]\\]{2,}|\bemail\.\s*$/i;

/** Contact-form / nav chrome that sometimes contaminates meta descriptions. */
const ABOUT_CHROME_PATTERN =
  /\b(?:contact us|get in touch|skip to(?: main)? content|subscribe|sign up for our|follow us on|accept (?:all )?cookies|cookie (?:policy|settings|banner|consent)|third-party service to translate|accept the service to view the translations|consent to load the translations|website translator|across all five NYC boroughs|updated daily from parks|every borough,\s*one place|Register for Classes|View Class Schedules|Used to get facts about the stores? policies|Some examples of questions you can ask are|What is your return policy\?|What is your shipping policy\?|What are your hours of operation\?)\b/i;
const ABOUT_CHROME_PREFIX =
  /^(?:contact us|get in touch|skip to(?: main)? content)[\s:.\-–—|]*/i;
const ABOUT_CHROME_SUFFIX =
  /\b(?:enroll now|learn more|sign up(?: today)?|book now|schedule a (?:tour|visit)|get started|register now)\b[\s\S]*$/i;

/** Strip repeated leading contact/nav chrome prefixes from about text. */
function stripAboutChromePrefix(value) {
  let t = String(value || "").trim();
  for (let i = 0; i < 4; i += 1) {
    const next = t.replace(ABOUT_CHROME_PREFIX, "").trim();
    if (next === t) break;
    t = next;
  }
  return t.replace(ABOUT_CHROME_SUFFIX, "").replace(/\s+/g, " ").trim();
}

/**
 * Drop meta paragraphs the composer used to append (address/place belong in fields).
 * @param {string} value
 */
function stripMetaListingChrome(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter(
      (p) =>
        !/\baddress on record:\b/i.test(p) &&
        !/\bserves families in\b/i.test(p) &&
        !/\bis listed for families in\b/i.test(p) &&
        !/\bprograms noted in research:\b/i.test(p) &&
        !/^location:\s*\d/i.test(p) &&
        !/third-party service to translate/i.test(p) &&
        !/accept the service to view the translations/i.test(p) &&
        !/consent to load the translations/i.test(p) &&
        !/across all five NYC boroughs/i.test(p) &&
        !/updated daily from parks/i.test(p) &&
        !/Discover kids classes,\s*camps,\s*and events across/i.test(p)
    )
    .join("\n\n")
    .replace(/\s*Address on record:[^\n.]*(?:\.[^\n]*)?/gi, "")
    .replace(/\s*[^.]*\bserves families in\b[^\n.]*(?:\.[^\n]*)?/gi, "")
    .replace(/\s*[^.]*\bis listed for families in\b[^\n.]*(?:\.[^\n]*)?/gi, "")
    .replace(/[\\]*["']\s*,\s*[\\]*["']?\s*(?:email|phone|address)\b[^\n]*/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const NAMED_ENTITIES = {
  nbsp: " ",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

/**
 * Strip tags + decode named/numeric entities (repeat for double-encoded residue).
 * Matches the publish-gate expectations in `publicDescriptionQuality`.
 * @param {string} value
 */
function sanitizeListingCopyText(value) {
  let s = String(value || "");
  for (let i = 0; i < 4; i += 1) {
    const before = s;
    s = s
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&#(\d+);/g, (_, code) => {
        const n = Number(code);
        return Number.isFinite(n) && n > 0 && n < 0x10ffff ? String.fromCodePoint(n) : " ";
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const n = parseInt(hex, 16);
        return Number.isFinite(n) && n > 0 && n < 0x10ffff ? String.fromCodePoint(n) : " ";
      })
      .replace(/&(nbsp|quot|apos|lt|gt);/gi, (_, name) => NAMED_ENTITIES[String(name).toLowerCase()] || " ")
      .replace(/&amp;/gi, "&");
    if (s === before) break;
  }
  s = stripMetaListingChrome(s);
  // JSON scrap leftovers after meta strip.
  s = s
    .replace(/[\\]*["']\s*,\s*[\\]*["']?\s*(?:email|phone|address)\b[^\n]*/gi, "")
    .replace(/["'}{\]\\]{2,}/g, " ")
    .replace(/\bemail\.\s*$/i, "")
    // Unresolved CMS tokens — drop the brace form, keep surrounding prose when possible.
    .replace(/\{[a-z][a-z0-9_]{2,}\}/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1");
  return s.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** @deprecated use sanitizeListingCopyText — kept for callers that still import this name */
function decodeBasicEntities(s) {
  return sanitizeListingCopyText(s);
}

/**
 * @param {string} shortDescription
 * @param {string} longDescription
 */
function isWeakListingCopy(shortDescription, longDescription) {
  const short = String(shortDescription || "").trim();
  const long = String(longDescription || "").trim();
  if (!long || long.length < 40) return true;
  if (!short || short.length < 40) return true;
  const blob = `${short}\n${long}`;
  if (WEAK_COPY_PATTERNS.some((re) => re.test(blob))) return true;
  // Residual HTML or un-decoded entities fail the ingest publish gate — treat as weak so Improve rewrites.
  if (HTML_TAG_PATTERN.test(blob) || HTML_ENTITY_PATTERN.test(blob)) return true;
  if (JSON_SCRAP_PATTERN.test(blob)) return true;
  if (/^(?:contact\b)/i.test(short) || /^(?:contact\b)/i.test(long)) return true;
  if (/\bwe look forward to answering\b/i.test(blob)) return true;
  if (/\benroll now\b/i.test(blob) || /\blearn more\b.*\b(sign up|register)\b/i.test(blob)) return true;
  // Short is a near-empty name+borough template.
  if (/^[^.]{0,80}offers kids programs in\b/i.test(short)) return true;
  return false;
}

/**
 * Pull stated about/description evidence from official HTML.
 * @param {string} html
 * @returns {{ aboutText: string, source: string|null }}
 */
function extractAboutEvidence(html) {
  if (!html) return { aboutText: "", source: null };
  const candidates = [];

  const og =
    html.match(/property=["']og:description["'][^>]*content="([^"]{20,600})"/i) ||
    html.match(/property=["']og:description["'][^>]*content='([^']{20,600})'/i) ||
    html.match(/content="([^"]{20,600})"[^>]*property=["']og:description["']/i) ||
    html.match(/content='([^']{20,600})'[^>]*property=["']og:description["']/i);
  if (og) candidates.push({ text: sanitizeListingCopyText(og[1]), source: "og:description" });

  const meta =
    html.match(/name=["']description["'][^>]*content="([^"]{20,600})"/i) ||
    html.match(/name=["']description["'][^>]*content='([^']{20,600})'/i) ||
    html.match(/content="([^"]{20,600})"[^>]*name=["']description["']/i) ||
    html.match(/content='([^']{20,600})'[^>]*name=["']description["']/i);
  if (meta) candidates.push({ text: sanitizeListingCopyText(meta[1]), source: "meta:description" });

  const tw =
    html.match(/name=["']twitter:description["'][^>]*content="([^"]{20,600})"/i) ||
    html.match(/name=["']twitter:description["'][^>]*content='([^']{20,600})'/i) ||
    html.match(/content="([^"]{20,600})"[^>]*name=["']twitter:description["']/i) ||
    html.match(/content='([^']{20,600})'[^>]*name=["']twitter:description["']/i);
  if (tw) candidates.push({ text: sanitizeListingCopyText(tw[1]), source: "twitter:description" });

  for (const m of html.matchAll(/"description"\s*:\s*"([^"]{40,600})"/gi)) {
    candidates.push({ text: sanitizeListingCopyText(m[1]), source: "jsonld:description" });
  }

  // Visible page headings often beat empty "Home Page" meta / chatbot JSON-LD.
  for (const m of html.matchAll(/<(?:h1|h2|h3)[^>]*>([^<]{20,160})<\/(?:h1|h2|h3)>/gi)) {
    const heading = sanitizeListingCopyText(m[1]);
    if (
      heading.length >= 20 &&
      !/cart|account|menu|subscribe|sign in|log in|cookie/i.test(heading)
    ) {
      candidates.push({ text: heading, source: "body:heading" });
    }
  }

  const titleMatch = html.match(/<title>([^<]{15,160})<\/title>/i);
  if (titleMatch) {
    let title = sanitizeListingCopyText(
      titleMatch[1].replace(/\s*[|\u2013\u2014\-]\s*Genius Gems.*$/i, "").replace(/\s*[|\u2013\u2014].*$/, "")
    );
    if (title.length >= 20 && !/^home\b/i.test(title)) {
      candidates.push({ text: title, source: "title" });
    }
  }

  // Body "Welcome to …" / program blurb when og:description is only a hero slogan + CTAs.
  const bodyText = sanitizeListingCopyText(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
  const welcomeMatch = bodyText.match(/Welcome to [^!]{3,80}!\s+([\s\S]{80,700}?)(?:\s+We have a roomy|\s+Click Here|\s+classes\s+We have|\s+SCHEDULES\b|$)/i);
  if (welcomeMatch) {
    let blob = sanitizeListingCopyText(welcomeMatch[1].trim());
    // Keep up to ~3 sentences.
    const sentences = blob.match(/[^.!?]+[.!?]+/g) || [blob];
    blob = sentences.slice(0, 3).join(" ").replace(/\s+/g, " ").trim();
    if (blob.length >= 60 && !/Register for Classes|View Class Schedules/i.test(blob)) {
      candidates.push({ text: blob, source: "body:welcome" });
    }
  } else {
    const offers = bodyText.match(
      /((?:[A-Z][^.]{8,80} offers (?:a variety of|dynamic|programs)[^.]{20,400}\.(?:\s+[A-Z][^.]{20,200}\.){0,2}))/i
    );
    if (offers) {
      const blob = sanitizeListingCopyText(offers[1].trim());
      if (blob.length >= 60) candidates.push({ text: blob, source: "body:offers" });
    }
  }

  // Prefer the longest usable candidate that is not chrome.
  let best = null;
  for (const c of candidates) {
    let t = stripUrlsFromPublicCopy(c.text);
    t = sanitizeListingCopyText(t);
    t = stripAboutChromePrefix(t);
    if (!t || t.length < 40) continue;
    if (/^(?:with|and|or)\b/i.test(t)) continue;
    if (ABOUT_CHROME_PATTERN.test(t) && t.length < 160) continue;
    if (/Register for Classes|View Class Schedules|Stretch\.\s*Jump\.\s*Swing/i.test(t)) continue;
    if (/Used to get facts about the stores? policies|Some examples of questions you can ask are/i.test(t)) {
      continue;
    }
    if (/A natural language query|Additional information about the request such as user demographics/i.test(t)) {
      continue;
    }
    // Empty storefront meta.
    if (/\bhome page\b/i.test(t) && t.length < 80) continue;
    if (/https?:\/\//i.test(t) || /\bwww\./i.test(t)) continue;
    if (HTML_TAG_PATTERN.test(t) || HTML_ENTITY_PATTERN.test(t)) continue;
    if (JSON_SCRAP_PATTERN.test(t)) continue;
    // Prefer chrome-free candidates; among equals, prefer longer. Prefer body:welcome over slogan og.
    const chromeHit = ABOUT_CHROME_PATTERN.test(t) ? 1 : 0;
    const bestChrome = best && ABOUT_CHROME_PATTERN.test(best.aboutText) ? 1 : 0;
    const sourceBoost =
      c.source === "body:welcome" ? 80 : c.source === "body:heading" ? 60 : c.source === "title" ? 40 : 0;
    const bestBoost =
      best && best.source === "body:welcome"
        ? 80
        : best && best.source === "body:heading"
          ? 60
          : best && best.source === "title"
            ? 40
            : 0;
    if (
      !best ||
      chromeHit < bestChrome ||
      (chromeHit === bestChrome && t.length + sourceBoost > best.aboutText.length + bestBoost)
    ) {
      best = { aboutText: t, source: c.source };
    }
  }
  return best || { aboutText: "", source: null };
}

function activityPhrase(activityTypes) {
  const acts = (activityTypes || []).map((a) => String(a || "").trim()).filter(Boolean).slice(0, 4);
  if (!acts.length) return "kids programs";
  if (acts.length === 1) return acts[0].toLowerCase() === "yoga" ? "yoga" : acts[0];
  if (acts.length === 2) return `${acts[0]} and ${acts[1]}`;
  return `${acts.slice(0, -1).join(", ")}, and ${acts[acts.length - 1]}`;
}

function placePhrase(borough, neighborhood) {
  const b = String(borough || "").trim();
  const n = String(neighborhood || "").trim();
  if (n && b && n !== b) return `${n}, ${b}`;
  return b || n || "";
}

/** True when the listing brand already appears in about text (ignores +/&/punctuation drift). */
function nameAppearsInText(text, name) {
  const blob = String(text || "").toLowerCase();
  const tokens = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (!tokens.length) return false;
  // First two significant tokens are enough to treat the brand as present ("Bend" + "Bloom").
  const need = tokens.slice(0, 2);
  return need.every((t) => blob.includes(t));
}

/** Only embed a street in fallback copy when it is a clean usable line. */
function usableAddressForCopy(address) {
  const cleaned = cleanStreetAddress(address || "");
  return isUsableStreetLine(cleaned) ? cleaned : "";
}

/**
 * Compose short + long public copy from official about evidence + listing place facts.
 * Returns null when evidence is too weak to replace inventory boilerplate safely.
 *
 * @param {{
 *   name: string,
 *   borough?: string,
 *   neighborhood?: string,
 *   address?: string,
 *   activityTypes?: string[],
 *   aboutText?: string,
 *   aboutSource?: string,
 *   services?: string[],
 * }} input
 */
function composeListingCopy(input) {
  const name = String(input.name || "").trim();
  if (!name) return null;
  const about = stripAboutChromePrefix(
    sanitizeListingCopyText(stripUrlsFromPublicCopy(String(input.aboutText || "").trim()))
  );
  const place = placePhrase(input.borough, input.neighborhood);
  const activities = activityPhrase(input.activityTypes);
  const address = usableAddressForCopy(input.address);

  if (
    !about ||
    about.length < 40 ||
    HTML_TAG_PATTERN.test(about) ||
    HTML_ENTITY_PATTERN.test(about) ||
    JSON_SCRAP_PATTERN.test(about) ||
    /^(?:with|and|or)\b/i.test(about)
  ) {
    // Without page evidence, cleaner place+activity copy — never dump dirty streets or meta labels.
    const short = sanitizeListingCopyText(
      stripUrlsFromPublicCopy(
        `${name} offers ${activities} in ${place || "New York City"}${address ? ` at ${address}` : ""}.`
      )
    ).slice(0, 400);
    const long = sanitizeListingCopyText(
      stripUrlsFromPublicCopy(
        `${name} offers ${activities} for families${place ? ` in ${place}` : ""}.`
      )
    ).slice(0, 4000);
    if (long.length < 40) return null;
    if (isWeakListingCopy(short, long)) return null;
    return {
      shortDescription: short,
      longDescription: long,
      quality: "place_fallback",
      aboutSource: null,
    };
  }

  // Short: first sentence of about, tightened, plus place when missing from about.
  // If the first sentence is too short (<40), take more of the about text.
  let shortBase = about.split(/(?<=[.!?])\s+/)[0] || about;
  shortBase = shortBase.replace(/\s+/g, " ").trim();
  if (shortBase.length < 40) {
    shortBase = about.replace(/\s+/g, " ").trim();
  }
  if (shortBase.length > 220) shortBase = `${shortBase.slice(0, 217).replace(/\s+\S*$/, "")}…`;
  if (place && !new RegExp(place.split(",")[0].trim(), "i").test(shortBase) && !/brooklyn|manhattan|queens|bronx/i.test(shortBase)) {
    shortBase = `${shortBase.replace(/\.$/, "")} — ${place}.`;
  }
  // Prefer naming the listing when about omits the brand (keep about capitalization as-stated).
  if (!nameAppearsInText(shortBase, name)) {
    shortBase = `${name}. ${shortBase}`;
  }
  const shortDescription = sanitizeListingCopyText(stripUrlsFromPublicCopy(shortBase)).slice(0, 400);

  // Long = about prose only. Place/address live in structured fields — never "Address on record".
  let longDescription = sanitizeListingCopyText(stripUrlsFromPublicCopy(about)).slice(0, 4000);
  // Final safety: never ship URL/chrome/HTML/meta residue.
  if (/https?:\/\//i.test(longDescription) || /https?:\/\//i.test(shortDescription)) return null;
  if (HTML_TAG_PATTERN.test(longDescription) || HTML_TAG_PATTERN.test(shortDescription)) return null;
  if (HTML_ENTITY_PATTERN.test(longDescription) || HTML_ENTITY_PATTERN.test(shortDescription)) return null;
  if (JSON_SCRAP_PATTERN.test(longDescription) || JSON_SCRAP_PATTERN.test(shortDescription)) return null;
  if (isWeakListingCopy(shortDescription, longDescription)) return null;
  if (shortDescription.length < 40 || longDescription.length < 40) return null;
  if (/^(?:with|and|or)\b/i.test(shortDescription)) return null;

  // Soft-below-target (SC ABOUT_QUALITY_TARGET) — length-ok but no recommendation tone.
  const { isSoftBelowAboutTarget } = require("./aboutQualityScore.cjs");
  if (
    isSoftBelowAboutTarget(shortDescription, longDescription, {
      name,
      place,
      chrome: false,
    })
  ) {
    return null;
  }

  return {
    shortDescription,
    longDescription,
    quality: "page_evidence",
    aboutSource: input.aboutSource || "official_page",
  };
}

module.exports = {
  WEAK_COPY_PATTERNS,
  isWeakListingCopy,
  extractAboutEvidence,
  composeListingCopy,
  sanitizeListingCopyText,
  stripMetaListingChrome,
  decodeBasicEntities,
  activityPhrase,
  placePhrase,
};
