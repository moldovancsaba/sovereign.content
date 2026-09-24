/**
 * The Little Gym — New York location pages (gymnastics).
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://www.thelittlegym.com";

module.exports = {
  id: "little-gym-ny",
  name: "The Little Gym",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/location/united-states/new-york/`,
    `${BASE}/locations/`,
    `${BASE}/new-york-tribeca/`,
    `${BASE}/new-york-brooklyn-heights/`,
    `${BASE}/new-york-dumbo/`,
  ],
  bootstrapQueue: [
    `${BASE}/new-york-tribeca/`,
    `${BASE}/new-york-brooklyn-heights/`,
    `${BASE}/new-york-dumbo/`,
    `${BASE}/new-york-clinton-hill/`,
  ],
  isDetailUrl(url) {
    return /thelittlegym\.com\/new-york-[a-z0-9-]+\/?$/i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/thelittlegym\.com\/new-york-[a-z0-9-]+/i]).filter(
      (u) => !/try-us-out|clifton-park|colonie/i.test(u)
    );
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "thelittlegym.com" });
    f.website = pageUrl;
    f.services = ["Gymnastics"];
    if (/brooklyn|dumbo|clinton-hill|park-slope|bay-ridge|brighton/i.test(pageUrl)) f.borough = "Brooklyn";
    else if (/auburndale|long-island-city|lic/i.test(pageUrl)) f.borough = "Queens";
    else f.borough = "Manhattan";
    if (/\/location\//i.test(pageUrl) || /\/locations\/?$/i.test(pageUrl)) f._skipSeed = true;
    return f;
  },
};
