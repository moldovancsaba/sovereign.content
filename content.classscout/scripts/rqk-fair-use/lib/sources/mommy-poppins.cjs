/**
 * Mommy Poppins NYC — directory / guide discovery pages.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://mommypoppins.com";

module.exports = {
  id: "mommy-poppins",
  name: "Mommy Poppins",
  base: BASE,
  boroughDefault: "Brooklyn",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/new-york-city`,
    `${BASE}/directory`,
    `${BASE}/mommy-poppins-business-listings`,
    `${BASE}/family/national-summer-camp-guide`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return (
      /mommypoppins\.com\/mommy-poppins-business-listings/i.test(url) ||
      /mommypoppins\.com\/new-york-city-kids\//i.test(url) ||
      /mommypoppins\.com\/directory\/\d+/i.test(url) ||
      /mommypoppins\.com\/family\//i.test(url)
    );
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [
      /mommypoppins\.com\/new-york-city-kids\//i,
      /mommypoppins\.com\/mommy-poppins-business-listings/i,
      /mommypoppins\.com\/directory\/\d+/i,
      /mommypoppins\.com\/family\/[^"'#]+/i,
    ]);
  },
  extractFacts(html, pageUrl) {
    return extractGenericFacts(html, pageUrl, { sourceHost: "mommypoppins.com" });
  },
};
