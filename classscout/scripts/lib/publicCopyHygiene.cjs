/**
 * Public-copy hygiene for Find / fair-use seeds.
 *
 * Ingest rejects descriptions that contain URLs or scraped chrome. Citation and official URLs belong
 * in researchSources / researchNote / website — never in shortDescription or longDescription.
 */
const URL_RE = /https?:\/\/[^\s)>\]]+/gi;
const WWW_RE = /\bwww\.[a-z0-9.-]+\.[a-z]{2,}[^\s)>\]]*/gi;
const SOURCE_LINE_RE = /^\s*(official website|discovery path|citation|source)\s*[:(-]/im;

/**
 * Google Website Translator / cookie-banner consent chrome that often lands in
 * meta descriptions and "about" scrapes when the venue embeds a translate widget.
 * Never ship this as listing About (prov-tinyout-brooklyn-usa-basketball incident).
 */
const TRANSLATE_CONSENT_RE =
  /third-party service to translate|accept the service to view the translations|consent to load the translations|website translator/i;

/**
 * City-hub / marketplace homepage marketing (KidClick /nyc, discovery directories) that deep enrich
 * used to prefer because it is longer than the venue-specific meta. Never ship as listing About
 * (prov-kidclick-addabbo-playground incident).
 */
const MARKETPLACE_HUB_COPY_RE =
  /across all five NYC boroughs|updated daily from parks|every borough,\s*one place|Discover kids classes,\s*camps,\s*and events across|Find kids classes,\s*camps,\s*and events across New York City/i;

/**
 * Hero slogan + nav CTA chrome (Squarespace/gym sites): verb stacks + "Register for Classes"
 * (prov-tinyout-bounce-gymnastics-inc incident).
 */
const HERO_CTA_COPY_RE =
  /Register for Classes|View Class Schedules|View Schedule\s*→|Click Here for (?:Fall )?Calendar|CLICK TO VIEW REGISTRATION|Learn More\s*→|(?:Stretch|Jump|Swing|Climb|Tumble|Flip|Bounce)\.\s*(?:Jump|Swing|Climb|Tumble|Flip|Bounce)/i;

/**
 * Shopify / storefront chatbot FAQ chrome scraped from JSON-LD `description`
 * (Genius Gems / Fight 2 Finish / Healthy Italia incident 2026-09-24).
 * Never ship as listing About.
 */
const STORE_POLICY_CHATBOT_RE =
  /Used to get facts about the stores? policies|Some examples of questions you can ask are|What is your return policy\?|What is your shipping policy\?|What are your hours of operation\?|A natural language query\.?|Additional information about the request such as user demographics/i;

/**
 * Remove URLs and citation/source lines from copy destined for public provider fields.
 * @param {string} text
 * @returns {string}
 */
function stripUrlsFromPublicCopy(text) {
  if (!text || typeof text !== "string") return "";
  let out = text
    .replace(URL_RE, "")
    .replace(WWW_RE, "")
    .split(/\n+/)
    .filter((line) => !SOURCE_LINE_RE.test(line) && line.trim().length > 0)
    .filter((line) => !TRANSLATE_CONSENT_RE.test(line))
    .filter((line) => !MARKETPLACE_HUB_COPY_RE.test(line))
    .filter((line) => !HERO_CTA_COPY_RE.test(line))
    .filter((line) => !STORE_POLICY_CHATBOT_RE.test(line))
    .join("\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Drop leftover "at ." / empty parentheses left by URL removal.
  out = out.replace(/\(\s*\)/g, "").replace(/\s+\./g, ".").replace(/\s+,/g, ",").trim();
  // Inline consent chrome inside an otherwise usable sentence.
  out = out
    .replace(
      /[^.]*\b(?:We use a )?third-party service to translate[^.]*\./gi,
      " "
    )
    .replace(
      /[^.]*\baccept the service to view the translations[^.]*\./gi,
      " "
    )
    .replace(
      /[^.]*\b(?:Discover|Find) kids classes,\s*camps,\s*and events across[^.]*\./gi,
      " "
    )
    .replace(/\bRegister for Classes\b/gi, " ")
    .replace(/\bView Class Schedules\b/gi, " ")
    .replace(
      /Used to get facts about the stores? policies[\s\S]*?(?:hours of operation\?\\?|$)/gi,
      " "
    )
    .replace(/Some examples of questions you can ask are[\s\S]*$/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return out;
}

/**
 * True when public copy still looks unsafe for ingest (URLs, source markers, or
 * scraped chrome widgets).
 * @param {string} text
 */
function publicCopyHasUnsafeChrome(text) {
  if (!text) return false;
  return (
    /https?:\/\//i.test(text) ||
    /\bwww\.[a-z0-9.-]+\.[a-z]{2,}/i.test(text) ||
    /discovery path\s*\(citation\)/i.test(text) ||
    TRANSLATE_CONSENT_RE.test(text) ||
    MARKETPLACE_HUB_COPY_RE.test(text) ||
    HERO_CTA_COPY_RE.test(text) ||
    STORE_POLICY_CHATBOT_RE.test(text)
  );
}

module.exports = {
  stripUrlsFromPublicCopy,
  publicCopyHasUnsafeChrome,
  TRANSLATE_CONSENT_RE,
  MARKETPLACE_HUB_COPY_RE,
  HERO_CTA_COPY_RE,
  STORE_POLICY_CHATBOT_RE,
  URL_RE,
};
