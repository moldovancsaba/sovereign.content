/**
 * Discover DYCD — official NYC afterschool / COMPASS portal (inventory-heavy).
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://discoverdycd.dycdconnect.nyc";

module.exports = {
  id: "discover-dycd",
  name: "Discover DYCD",
  base: BASE,
  boroughDefault: "Brooklyn",
  inventoryOnly: true,
  robotsBase: BASE,
  discoveryPages: [`${BASE}/`, `${BASE}/Home/Index`],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /discoverdycd\.dycdconnect\.nyc\//i.test(url) && !/\/Home\/Index\/?$/i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/discoverdycd\.dycdconnect\.nyc\//i]).filter(
      (u) => !/\/(Home\/Index|Account|Login)/i.test(u)
    );
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "dycdconnect.nyc" });
    f.inventoryOnly = true;
    return f;
  },
};
