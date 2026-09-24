/**
 * Soccer Stars NYC — multi-neighborhood soccer class hubs.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://www.soccerstars.com";

module.exports = {
  id: "soccer-stars-nyc",
  name: "Soccer Stars",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/ny/nyc/`,
    `${BASE}/ny/nyc/soccer-stars-center`,
    `${BASE}/ny/nyc/the-jewish-center`,
  ],
  bootstrapQueue: [`${BASE}/ny/nyc/soccer-stars-center`, `${BASE}/ny/nyc/the-jewish-center`],
  isDetailUrl(url) {
    return /soccerstars\.com\/ny\/nyc\/[a-z0-9-]+/i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/soccerstars\.com\/ny\/nyc\/[a-z0-9-]+/i]).filter(
      (u) => !/\/faqs\/?$/i.test(u) && !/scholarship|school-enrichment/i.test(u)
    );
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "soccerstars.com" });
    f.website = pageUrl;
    f.services = ["Soccer"];
    f.borough = f.borough || "Manhattan";
    if (/\/ny\/nyc\/?$/i.test(pageUrl)) f._skipSeed = true;
    return f;
  },
};
