/**
 * Marlene Meyerson JCC Manhattan — kids program pages.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://mmjccm.org";

module.exports = {
  id: "jcc-manhattan-programs",
  name: "Marlene Meyerson JCC Manhattan",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/programs`,
    `${BASE}/`,
    "https://mmjccm.org/programs?category=1781",
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /mmjccm\.org\/programs/i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/mmjccm\.org\/programs/i]);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "mmjccm.org" });
    f.website = f.website || pageUrl;
    f.borough = "Manhattan";
    f.neighborhood = f.neighborhood || "Upper West Side";
    return f;
  },
};
