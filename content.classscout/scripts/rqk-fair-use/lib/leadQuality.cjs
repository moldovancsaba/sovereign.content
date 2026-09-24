/**
 * Reject weak citation leads before they enter find-seeds.json.
 */
const { BLOCKED_HOST_RE } = require("./genericExtract.cjs");

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hasStreetAddress(addr) {
  if (!addr || typeof addr !== "string") return false;
  const a = addr.trim();
  if (a.length < 12 || a.length > 200) return false;
  if (!/^\d{1,5}\s+\S+/.test(a)) return false;
  if (
    !/\b(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Way|Broadway|Parkway|Pkwy|Plaza)\b/i.test(
      a
    )
  ) {
    return false;
  }
  if (/\b(minutes?|hours?|please|click|sign\s*up|staff|real estate|news)\b/i.test(a)) return false;
  return true;
}

function isJunkWebsite(website, sourceHost) {
  if (!website) return true;
  const h = hostOf(website);
  if (!h) return true;
  if (h === sourceHost) return true; // still citation — not junk, but not "official"
  if (BLOCKED_HOST_RE.test(h) || BLOCKED_HOST_RE.test(website)) return true;
  if (
    /gmpg\.org|w3\.org|schema\.org|x\.com|twitter\.com|business\.activityhero\.com|wa\.me|api\.whatsapp|mailto:/i.test(
      h + website
    )
  ) {
    return true;
  }
  return false;
}

/** One-off events / festivals are not ClassScout provider listings. */
function looksLikeOneOffEvent(facts, pageUrl) {
  const name = String(facts.name || "");
  const url = String(pageUrl || facts.citationUrl || facts.rqkUrl || facts.website || "");
  const blob = `${name} ${url} ${(facts.services || []).join(" ")}`.toLowerCase();
  if (/\/event\//i.test(url) || /\/events\//i.test(url)) return true;
  if (
    /\b(festival|faire|fest\b|fall fest|day trip|sundaes on|maize maze|back to school fest|free admission day)\b/i.test(
      name
    )
  ) {
    return true;
  }
  if (/\b(one-time|one time|single session|this weekend only)\b/i.test(blob)) return true;
  return false;
}

function looksLikeOutOfMarket(facts) {
  const blob = `${facts.name || ""} ${facts.address || ""} ${facts.borough || ""} ${facts.website || ""} ${facts.citationUrl || ""}`.toLowerCase();
  if (/\blos angeles\b|\b\bla\b summer camp guide|\bchicago\b|\bsan francisco\b/.test(blob)) return true;
  if (facts.borough && !/manhattan|brooklyn|queens|bronx|staten island|nyc|new york/i.test(String(facts.borough))) {
    return true;
  }
  return false;
}

function isAcceptableLead(facts, source) {
  const name = String(facts.name || "").trim();
  if (name.length < 3 || name.length > 160) {
    return { ok: false, reason: "bad_name" };
  }
  if (
    /welcome to|explore\s+|connect family services|family services$|see \d{4} schedules|reviews?\s*&\s*more/i.test(
      name
    )
  ) {
    return { ok: false, reason: "brand_or_chrome_name" };
  }
  const srcName = String(source.name || "");
  if (srcName && new RegExp(srcName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(name)) {
    return { ok: false, reason: "source_brand_name" };
  }
  // Pure street-address names (Sprout place slugs) are not providers.
  if (/^\d{1,5}\s+/.test(name) && /\b(st|street|ave|avenue|rd|road|blvd)\b/i.test(name)) {
    return { ok: false, reason: "address_as_name" };
  }

  if (looksLikeOutOfMarket(facts)) {
    return { ok: false, reason: "out_of_market" };
  }

  const pageUrl = facts.citationUrl || facts.rqkUrl || "";
  if (looksLikeOneOffEvent(facts, pageUrl)) {
    return { ok: false, reason: "one_off_event" };
  }

  const sourceHost = hostOf(source.base);
  let website = facts.website || "";
  if (website && isJunkWebsite(website, sourceHost)) {
    if (/wa\.me|whatsapp|mailto:/i.test(website)) {
      return { ok: false, reason: "junk_website" };
    }
    website = "";
  }
  const webHost = hostOf(website);
  const officialExternal =
    Boolean(website) &&
    webHost &&
    webHost !== sourceHost &&
    !isJunkWebsite(website, sourceHost);

  const addrOk = hasStreetAddress(facts.address || "");

  // Category / guide pages (editorial hubs) are not provider leads.
  if (
    /play spaces for|guide for|things to do|best classes|directory|summer camp guide|day trips guide|ultimate guide|easy recipes|science experiments/i.test(
      name
    )
  ) {
    return { ok: false, reason: "guide_or_hub_name" };
  }

  if (officialExternal) {
    return { ok: true, reason: "official_website" };
  }
  // Citation-only: allow only with a real street address and a provider-like name.
  if (addrOk && !/^\d{1,5}\s+/.test(name) && website === "") {
    return { ok: true, reason: "address_plus_name" };
  }
  return { ok: false, reason: "no_official_or_address" };
}

module.exports = {
  isAcceptableLead,
  hasStreetAddress,
  isJunkWebsite,
  hostOf,
  looksLikeOneOffEvent,
  looksLikeOutOfMarket,
};
