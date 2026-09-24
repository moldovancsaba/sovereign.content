/**
 * Time Out New York Kids — editorial class roundups.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://www.timeout.com";

module.exports = {
  id: "timeout-ny-kids",
  name: "Time Out New York Kids",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/new-york-kids/things-to-do/classes`,
    `${BASE}/new-york-kids/things-to-do`,
    `${BASE}/new-york-kids`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return (
      /timeout\.com\/new-york-kids\//i.test(url) &&
      !/\/new-york-kids\/?$/i.test(url) &&
      !/\/things-to-do\/?$/i.test(url) &&
      !/\/things-to-do\/classes\/?$/i.test(url)
    );
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/timeout\.com\/new-york-kids\//i]).filter(
      (u) =>
        !/\/new-york-kids\/?$/i.test(u) &&
        !/\/things-to-do\/?$/i.test(u) &&
        !/\/things-to-do\/classes\/?$/i.test(u)
    );
  },
  extractFacts(html, pageUrl) {
    return extractGenericFacts(html, pageUrl, { sourceHost: "timeout.com" });
  },
};
