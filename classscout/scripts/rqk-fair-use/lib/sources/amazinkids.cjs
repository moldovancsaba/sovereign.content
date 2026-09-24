/**
 * AmazinKids — vendor category discovery (SPA-heavy; inbox supported).
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://amazinkids.com";

module.exports = {
  id: "amazinkids",
  name: "AmazinKids",
  base: BASE,
  boroughDefault: "Brooklyn",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/vendors?category=martial-arts`,
    `${BASE}/vendors?category=dance`,
    `${BASE}/vendors?category=sports`,
    `${BASE}/vendors?category=stem`,
    `${BASE}/vendors?category=art`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /amazinkids\.com\/(vendors|vendor|provider)\//i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/amazinkids\.com\/(vendors|vendor|provider)\//i]);
  },
  extractFacts(html, pageUrl) {
    return extractGenericFacts(html, pageUrl, { sourceHost: "amazinkids.com" });
  },
};
