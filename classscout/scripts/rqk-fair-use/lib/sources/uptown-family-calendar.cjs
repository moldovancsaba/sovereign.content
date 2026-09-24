/**
 * Uptown Family Calendar — Harlem / Heights / Inwood / Bronx class directory.
 * Detail harvest prefers outbound official provider websites listed on the directory.
 */
const {
  extractGenericFacts,
  harvestByHrefPattern,
  BLOCKED_HOST_RE,
  hostOf,
} = require("../genericExtract.cjs");

const BASE = "https://www.uptownfamilycalendar.com";

const SKIP_HOST =
  /gstatic|googleapis|google\.com|docs\.google|forms\.gle|instagram|facebook|eventbrite|meetup\.com|parks\.ny\.gov|metmuseum|youtube|twitter|x\.com|wa\.me|mailto:/i;

function harvestOfficialSites(html) {
  const urls = new Set();
  const re = /href=["'](https?:\/\/[^"'#\s]+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1].replace(/&amp;/g, "&");
    const h = hostOf(u);
    if (!h || h.includes("uptownfamilycalendar")) continue;
    if (BLOCKED_HOST_RE.test(h) || SKIP_HOST.test(h) || SKIP_HOST.test(u)) continue;
    if (/\.(png|jpe?g|gif|svg|webp|pdf|css|js)(\?|$)/i.test(u)) continue;
    // Strip tracking query noise for dedupe.
    try {
      const parsed = new URL(u);
      parsed.hash = "";
      ["fbclid", "utm_source", "utm_medium", "utm_campaign"].forEach((k) => parsed.searchParams.delete(k));
      u = parsed.href.replace(/\/$/, "") + "/";
    } catch {
      continue;
    }
    urls.add(u);
  }
  return [...urls];
}

module.exports = {
  id: "uptown-family-calendar",
  name: "Uptown Family Calendar",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [`${BASE}/class-directory`],
  bootstrapQueue: [],
  isDetailUrl(url) {
    if (/uptownfamilycalendar\.com\/class-directory/i.test(url)) return false;
    const h = hostOf(url);
    return Boolean(h) && !h.includes("uptownfamilycalendar");
  },
  harvestDetailUrls(html, pageUrl) {
    if (/class-directory/i.test(pageUrl || "")) return harvestOfficialSites(html);
    return harvestByHrefPattern(html, BASE, [/uptownfamilycalendar\.com\//i]);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "uptownfamilycalendar.com" });
    if (/bronx|riverdale|throggs/i.test(`${f.address} ${f.name} ${pageUrl}`)) f.borough = "Bronx";
    else if (/harlem|inwood|washington\s*heights|morningside/i.test(`${f.address} ${f.name} ${pageUrl}`)) {
      f.borough = "Manhattan";
    }
    return f;
  },
};
