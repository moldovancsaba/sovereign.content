/**
 * Generic HTML fact extraction for directory / classified media detail pages.
 */

/**
 * Board issue 943: names live on production reading raw entities ("Victory Music &amp; Dance Company",
 * "Brooklyn Children&#x27;s Theatre") because `extractGenericFacts`'s `name` was pulled straight from
 * `html` (an `<h1>`/`og:title`/`<title>` match) and only whitespace-trimmed, never routed through this
 * decode step the way `stripToText`'s output already was. Handles the named entities `stripToText` used
 * to inline, plus numeric entities (`&#39;`, decimal or `&#x27;`, hex) generally, decimal/hex-agnostic —
 * the fixed named-entity list alone missed the hex form that produced the live "Brooklyn Children's"
 * bug.
 */
function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function stripToText(html) {
  const decoded = decodeHtmlEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n"),
  );
  return decoded
    .replace(/\n+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

const BLOCKED_HOST_RE =
  /google|facebook|instagram|twitter|youtube|tiktok|pinterest|linkedin|eventbrite|meetup\.com|cdn\.|fonts\.|gtag|sentry|wixpress|schema\.org|cloudflare|gravatar|doubleclick|googletagmanager|gmpg\.org|w3\.org|x\.com/i;

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function pickExternalWebsite(html, pageUrl, sourceHost) {
  const links = [...String(html || "").matchAll(/href=["'](https?:\/\/[^"'#\s]+)["']/gi)].map((m) => m[1]);
  const pageHost = hostOf(pageUrl);
  const srcHost = (sourceHost || pageHost || "").replace(/^www\./, "");
  const scored = [];
  for (const raw of links) {
    const u = raw.replace(/&amp;/g, "&");
    const h = hostOf(u);
    if (!h) continue;
    if (h === pageHost || h === srcHost) continue;
    if (BLOCKED_HOST_RE.test(h) || BLOCKED_HOST_RE.test(u)) continue;
    if (/\.(png|jpe?g|gif|svg|webp|css|js)(\?|$)/i.test(u)) continue;
    scored.push(u);
  }
  return scored[0] || "";
}

/** Keyword hints so mapActivityTypes can fire when directories omit a Services block. */
function inferServicesFromBlob(blob) {
  const t = String(blob || "").toLowerCase();
  const out = [];
  if (/taekwondo|tae\s*kwon|tkd/.test(t)) out.push("Taekwondo");
  if (/jiu[\s-]?jitsu|bjj/.test(t)) out.push("Brazilian Jiu-Jitsu");
  if (/karate/.test(t)) out.push("Karate");
  if (/martial\s*arts?|aikido|kung\s*fu|capoeira/.test(t)) out.push("Martial Arts");
  if (/soccer/.test(t)) out.push("Soccer");
  if (/swim|aquatics?/.test(t)) out.push("Swimming");
  if (/gymnast|tumbling|acro/.test(t)) out.push("Gymnastics");
  if (/dance|ballet|hip[\s-]?hop|tap\b/.test(t)) out.push("Dance");
  if (/\bart\b|paint|clay|pottery|craft|drawing/.test(t)) out.push("Art");
  if (/music|piano|violin|choir|drum/.test(t)) out.push("Music");
  if (/stem|robot|coding|chess|science/.test(t)) out.push("STEM");
  if (/yoga/.test(t)) out.push("Yoga");
  if (/roller\s*skat|rollerblad/.test(t)) out.push("Roller Skating");
  else if (/skateboard/.test(t)) out.push("Skateboarding");
  else if (/figure\s*skat/.test(t)) out.push("Figure Skating");
  else if (/ice\s*skat|\brink\b|\bskate|\bskating\b/.test(t)) out.push("Ice Skating");
  if (/climb|bouldering|ninja/.test(t)) out.push("Climbing");
  if (/tennis/.test(t)) out.push("Tennis");
  if (/basketball/.test(t)) out.push("Basketball");
  if (/theater|theatre|drama|acting/.test(t)) out.push("Theater");
  if (/\bcook(ing|ery)?\b|chef|culinary|food\s*tour/.test(t)) out.push("Cooking");
  if (/\blanguage\b|chinese|mandarin|spanish|french/.test(t)) out.push("Language");
  if (/multi[\s-]?sport|athletics/.test(t)) out.push("Multi-Sport");
  else if (/\bsports?\b/.test(t)) out.push("Sports");
  if (/camp|summer\s*camp|day\s*camp/.test(t)) out.push("Camp");
  return [...new Set(out)].slice(0, 8);
}

/**
 * Board issue 940: a real US street address never contains an HTML/JSON structural character — reject a
 * candidate carrying one outright rather than publish it. Confirmed reproduced live: Gibney Youth's
 * address was pure CSS-class residue (`3 grid-md-col-6 h-100 d-flex...`) and Fit4Dance Kids' carried a
 * trailing JSON fragment (`United States","email`) — both from a different extraction step than the
 * street-suffix regex below, but any candidate reaching here is checked the same way. This does not
 * catch every contamination shape found live (a testimonial sentence with no street-suffix word at all
 * doesn't match the regex in the first place — that shape comes from a different, non-regex source,
 * likely manually-entered spreadsheet data, and needs the review-queue validation gate (#954) rather
 * than a regex fix).
 */
function pickRealLookingAddress(candidates) {
  for (const candidate of candidates) {
    if (candidate && !/[<>"{}]/.test(candidate)) return candidate;
  }
  return "";
}

function extractGenericFacts(html, pageUrl, { sourceHost } = {}) {
  const text = stripToText(html);
  const nameMatch =
    html.match(/<h1[^>]*>([^<]{2,160})<\/h1>/i) ||
    html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  let name = decodeHtmlEntities(nameMatch && nameMatch[1] ? nameMatch[1] : "").replace(/\s+/g, " ").trim();
  name = name
    .replace(
      /\s*[·|–-]\s*(kidclick|Sprout|Mommy Poppins|ActivityHero|BeAKid|AmazinKids|Time Out|Raising Queens Kids|tinyout|Macaroni KID|Beyond Camps|ClassCub|New York Family|CampMatch).*$/i,
      ""
    )
    .replace(/\s+Kids Activities.*$/i, "")
    .replace(/\s*[·|–-]\s*See\s+\d{4}\s+Schedules.*$/i, "")
    .trim();

  // Board issue 940: the second, looser pattern this used to fall back to (no NY/zip requirement) is
  // what let "2016 Wall Street Journal survey of 900+ executives: 92%" match as an address — "Wall
  // Street" satisfies the street-suffix requirement with a citation year standing in for a building
  // number, and nothing in that pattern required a real NY location nearby to rule it out. Requiring the
  // NY/zip anchor is a real coverage trade-off (a page that states a street without a nearby zip now
  // yields no address instead of a guess) accepted deliberately per the audit's own "suppress rather
  // than invent" guidance, not an oversight.
  const address = pickRealLookingAddress([
    (text.match(/(\d{1,5}[-–]?\d{0,4}\s+[^\n,]{3,60}(?:Avenue|Ave|Street|St|Boulevard|Blvd|Road|Rd|Place|Pl|Way|Broadway|Parkway|Pkwy)[^\n]{0,50}(?:NY|New York)\s*\d{5})/i) ||
      [])[1],
  ]);

  const phone =
    (text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) || [])[0] || "";

  let website = pickExternalWebsite(html, pageUrl, sourceHost);

  // When the detail URL is already an official provider site (e.g. harvested from a
  // prose directory), use that URL as the Find target.
  const pageHost = hostOf(pageUrl);
  const srcHost = (sourceHost || "").replace(/^www\./, "");
  if (
    pageHost &&
    srcHost &&
    pageHost !== srcHost &&
    !BLOCKED_HOST_RE.test(pageHost) &&
    !/\.(png|jpe?g|gif|svg|webp|pdf)(\?|$)/i.test(pageUrl)
  ) {
    website = website || pageUrl;
  }

  const ageRange =
    (text.match(/Age(?:s| range)?\s*[:.]?\s*([^\n]{2,60})/i) || [])[1] ||
    (text.match(/for ages?\s+([^\n.]{2,40})/i) || [])[1] ||
    "";

  let borough = "";
  if (/manhattan/i.test(text + pageUrl)) borough = "Manhattan";
  else if (/brooklyn/i.test(text + pageUrl)) borough = "Brooklyn";
  else if (/queens/i.test(text + pageUrl)) borough = "Queens";
  else if (/bronx/i.test(text + pageUrl)) borough = "Bronx";
  else if (/staten\s*island/i.test(text + pageUrl)) borough = "Staten Island";

  const services = inferServicesFromBlob(`${name} ${pageUrl} ${text.slice(0, 2500)}`);

  return {
    name,
    address: address.replace(/\s+/g, " ").trim(),
    phone,
    website: website.replace(/[).,]+$/, ""),
    ageRange: ageRange.trim().slice(0, 80),
    services,
    neighborhood: "",
    borough,
    citationUrl: pageUrl,
  };
}

function harvestByHrefPattern(html, base, patterns) {
  const urls = new Set();
  const re = /href=["']([^"'#]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1].replace(/&amp;/g, "&");
    if (u.startsWith("/")) {
      try {
        u = new URL(u, base).href;
      } catch {
        continue;
      }
    }
    if (!/^https?:\/\//i.test(u)) continue;
    if (!patterns.some((p) => (p instanceof RegExp ? p.test(u) : u.includes(p)))) continue;
    urls.add(u.split("?")[0].replace(/\/$/, "") + (u.includes(".xml") ? "" : "/"));
  }
  return [...urls];
}

function harvestSitemapLocs(xml, filterFn) {
  const locs = [...String(xml || "").matchAll(/<loc>([^<]+)/gi)].map((m) => m[1].trim());
  return locs.filter((u) => (typeof filterFn === "function" ? filterFn(u) : true));
}

module.exports = {
  decodeHtmlEntities,
  stripToText,
  pickRealLookingAddress,
  extractGenericFacts,
  pickExternalWebsite,
  harvestByHrefPattern,
  harvestSitemapLocs,
  inferServicesFromBlob,
  hostOf,
  BLOCKED_HOST_RE,
};
