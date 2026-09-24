/**
 * ClassCub NYC — non-swim category pages (dance, martial arts, coding, music, …).
 * Complements classcub-swim-nyc; still one page per pass.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://classcub.com";

module.exports = {
  id: "classcub-nyc-categories",
  name: "ClassCub NYC Categories",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/coding/new-york-ny`,
    `${BASE}/music/new-york-ny`,
    `${BASE}/art/new-york-ny`,
    `${BASE}/tennis/new-york-ny`,
    `${BASE}/basketball/new-york-ny`,
    `${BASE}/new-york-ny`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /classcub\.com\/provider\/[a-z0-9-]+/i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/classcub\.com\/provider\/[a-z0-9-]+/i]);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "classcub.com" });
    if (/brooklyn|gowanus/i.test(pageUrl + f.address)) f.borough = "Brooklyn";
    else if (/queens|flushing/i.test(pageUrl + f.address)) f.borough = "Queens";
    else f.borough = f.borough || "Manhattan";
    return f;
  },
};
