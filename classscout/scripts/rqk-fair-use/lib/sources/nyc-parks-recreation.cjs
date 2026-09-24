/**
 * NYC Parks recreation — afterschool / youth sports program pages.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://www.nycgovparks.org";

module.exports = {
  id: "nyc-parks-recreation",
  name: "NYC Parks Recreation",
  base: BASE,
  boroughDefault: "Manhattan",
  inventoryOnly: true,
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/programs/recreation/afterschool`,
    `${BASE}/programs/recreation`,
    `${BASE}/reg/learn-to-swim`,
    `${BASE}/facilities/recreationcenters`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return (
      /nycgovparks\.org\/(programs|facilities|reg)\//i.test(url) &&
      !/\/programs\/recreation\/afterschool\/?$/i.test(url) &&
      !/\/programs\/recreation\/?$/i.test(url)
    );
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [
      /nycgovparks\.org\/programs\/[^"'#]+/i,
      /nycgovparks\.org\/facilities\/[^"'#]+/i,
      /nycgovparks\.org\/reg\/[^"'#]+/i,
    ]);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "nycgovparks.org" });
    f.inventoryOnly = true;
    if (/swim/i.test(pageUrl + f.name) && !f.services.includes("Swimming")) {
      f.services = ["Swimming", ...f.services];
    }
    if (!f.website) f.website = pageUrl;
    return f;
  },
};
