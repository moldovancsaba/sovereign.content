/**
 * Sprout NYC — source-checked activity/place pages.
 */
const { extractGenericFacts, harvestSitemapLocs, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://sproutnyc.com";

module.exports = {
  id: "sprout",
  name: "Sprout",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/sitemaps/events.xml`,
    `${BASE}/activities`,
    `${BASE}/search`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    // Prefer event pages (usually carry official source links) over bare place stubs.
    return /sproutnyc\.com\/event\//i.test(url);
  },
  harvestDetailUrls(html, pageUrl) {
    if (/\.xml/i.test(pageUrl || "") || /<urlset|<sitemapindex/i.test(html)) {
      return harvestSitemapLocs(html, (u) => /sproutnyc\.com\/event\//i.test(u)).slice(0, 80);
    }
    return harvestByHrefPattern(html, BASE, [/sproutnyc\.com\/event\//i]);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "sproutnyc.com" });
    // Prefer venue/museum official links already picked by generic extractor.
    return f;
  },
};
