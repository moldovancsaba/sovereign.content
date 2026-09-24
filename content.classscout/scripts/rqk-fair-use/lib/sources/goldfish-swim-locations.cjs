/**
 * Goldfish Swim School — NYC franchise location pages (scarce Swimming).
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://goldfishswimschool.com";

module.exports = {
  id: "goldfish-swim-locations",
  name: "Goldfish Swim School",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/locations/`,
    `${BASE}/ues-e-80th-street/`,
    `${BASE}/gowanus/`,
    `${BASE}/flushing/`,
  ],
  bootstrapQueue: [
    `${BASE}/ues-e-80th-street/`,
    `${BASE}/gowanus/`,
    `${BASE}/flushing/`,
  ],
  isDetailUrl(url) {
    return (
      /goldfishswimschool\.com\/(ues-e-80th-street|gowanus|flushing)\//i.test(url) ||
      /goldfishswimschool\.com\/[a-z0-9-]+\/?$/i.test(url)
    );
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [
      /goldfishswimschool\.com\/(ues-e-80th-street|gowanus|flushing)\//i,
    ]);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "goldfishswimschool.com" });
    f.website = pageUrl;
    f.services = ["Swimming"];
    if (/gowanus/i.test(pageUrl)) f.borough = "Brooklyn";
    else if (/flushing/i.test(pageUrl)) f.borough = "Queens";
    else f.borough = "Manhattan";
    if (/locations\/?$/i.test(pageUrl)) f._skipSeed = true;
    return f;
  },
};
