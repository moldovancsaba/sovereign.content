/**
 * Macaroni KID Brooklyn NW — extracurricular / afterschool directory listings.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://brooklynnw.macaronikid.com";

module.exports = {
  id: "macaroni-kid-brooklyn-nw",
  name: "Macaroni KID Brooklyn NW",
  base: BASE,
  boroughDefault: "Brooklyn",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/directory/category/5c848c332eeace7f1683d3ad/extracurricular-activities`,
    `${BASE}/guides/686e8c1c0b887c215a178a23/2025-26-afterschool-and-extracurricular-activities-in-brooklyn`,
    `${BASE}/directory/category/644adc37df054c3ba42e44e7/sports-recreation-and-adventure`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /brooklynnw\.macaronikid\.com\/directory\/[a-f0-9]{20,}\//i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [
      /brooklynnw\.macaronikid\.com\/directory\/[a-f0-9]{20,}\//i,
    ]).filter((u) => !/\/directory\/(category|tag|submit)\//i.test(u));
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "macaronikid.com" });
    f.borough = f.borough || "Brooklyn";
    return f;
  },
};
