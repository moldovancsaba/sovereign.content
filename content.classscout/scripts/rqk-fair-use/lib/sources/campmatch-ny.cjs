/**
 * CampMatch — New York camp index (filter to NYC boroughs at extract time).
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://campmatch.com";

module.exports = {
  id: "campmatch-ny",
  name: "CampMatch",
  base: BASE,
  boroughDefault: "Brooklyn",
  robotsBase: BASE,
  discoveryPages: [`${BASE}/camps/new-york`, `${BASE}/camps/browse`],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /campmatch\.com\/camp\//i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/campmatch\.com\/camp\//i, /\/camp\/[^"'#]+/i]).filter(
      (u) =>
        !/rochester|briarcliff|hempstead|great-neck|port-chester|new-castle|kent-ny|rockisland|civicrec/i.test(
          u
        )
    );
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "campmatch.com" });
    if (!f.services.includes("Camp")) f.services = [...f.services, "Camp"];
    // Drop clear non-NYC geography.
    if (/rochester|albany|buffalo|syracuse|nassau|suffolk|westchester/i.test(`${f.address} ${f.name} ${pageUrl}`)) {
      f._skipSeed = true;
    }
    return f;
  },
};
