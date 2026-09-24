/**
 * ClassCub — NYC swimming (and sibling category) provider pages with street addresses.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://classcub.com";

module.exports = {
  id: "classcub-swim-nyc",
  name: "ClassCub",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/swimming/new-york-ny`,
    `${BASE}/dance/new-york-ny`,
    `${BASE}/martial-arts/new-york-ny`,
    `${BASE}/gymnastics/new-york-ny`,
    `${BASE}/soccer/new-york-ny`,
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
    if (/\/swimming\//i.test(pageUrl) || /swim/i.test(f.name)) {
      if (!f.services.includes("Swimming")) f.services = ["Swimming", ...f.services];
    }
    if (/brooklyn|gowanus|park-slope/i.test(pageUrl + f.address)) f.borough = "Brooklyn";
    else if (/queens|flushing/i.test(pageUrl + f.address)) f.borough = "Queens";
    else f.borough = f.borough || "Manhattan";
    return f;
  },
};
