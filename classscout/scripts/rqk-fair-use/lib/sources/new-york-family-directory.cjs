/**
 * New York Family — afterschool & enrichment directory hub.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://www.newyorkfamily.com";

module.exports = {
  id: "new-york-family-directory",
  name: "New York Family",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/directory/afterschool-enrichment/`,
    `${BASE}/directory/camps/`,
    `${BASE}/directory/activities/`,
    `${BASE}/guide-to-kids-classes-in-the-nyc-area/`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return (
      /newyorkfamily\.com\/(?!directory\/(?:afterschool|camps|activities|education|birthday|special|travel)\/?$)[^?#]+/i.test(
        url
      ) && /newyorkfamily\.com\//i.test(url)
    );
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [
      /newyorkfamily\.com\/(?!wp-|tag\/|category\/|author\/)[a-z0-9-]+\/?/i,
    ]).filter(
      (u) =>
        !/\/directory\/(afterschool-enrichment|camps|activities|education|birthday-parties|special-needs|travel)\/?$/i.test(
          u
        )
    );
  },
  extractFacts(html, pageUrl) {
    return extractGenericFacts(html, pageUrl, { sourceHost: "newyorkfamily.com" });
  },
};
