/**
 * Brooklyn Bridge Parents — CONNECT + camp guides.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://brooklynbridgeparents.com";

module.exports = {
  id: "brooklyn-bridge-parents",
  name: "Brooklyn Bridge Parents",
  base: BASE,
  boroughDefault: "Brooklyn",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/connect/after_school_programs/`,
    `${BASE}/connect/camps/`,
    `${BASE}/summer-camp-guide-2026/`,
    `${BASE}/connect/`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    // CONNECT category indexes are discovery-only; detail pages are rare — prefer camp guide anchors.
    return (
      /brooklynbridgeparents\.com\/summer-camp-guide/i.test(url) ||
      (/brooklynbridgeparents\.com\/connect\//i.test(url) &&
        !/\/connect\/?(after_school_programs|camps|schools)?\/?$/i.test(url))
    );
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [
      /brooklynbridgeparents\.com\/summer-camp-guide/i,
      /brooklynbridgeparents\.com\/connect\/[a-z0-9_-]+\/[a-z0-9_-]+/i,
    ]);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "brooklynbridgeparents.com" });
    f.borough = f.borough || "Brooklyn";
    return f;
  },
};
