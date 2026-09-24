/**
 * New York Loves Kids — editorial class/camp guides.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://newyorkloveskids.com";

module.exports = {
  id: "new-york-loves-kids",
  name: "New York Loves Kids",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/classes/`,
    `${BASE}/camps/`,
    `${BASE}/attractions/`,
    `${BASE}/nyc-play-spaces/`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return (
      /newyorkloveskids\.com\/(?!wp-|feed|xmlrpc|comments)[a-z0-9-]+\/?$/i.test(url) &&
      !/\/(classes|camps|attractions|parties|events|preschool|education-guide|nyc-play-spaces|additional-needs)\/?$/i.test(
        url
      )
    );
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [
      /newyorkloveskids\.com\/(?!wp-|feed|xmlrpc|comments|tag\/|category\/)[a-z0-9-]+\/?$/i,
    ]).filter(
      (u) =>
        !/\/(classes|camps|attractions|parties|events|preschool|education-guide|nyc-play-spaces|additional-needs)\/?$/i.test(
          u
        )
    );
  },
  extractFacts(html, pageUrl) {
    return extractGenericFacts(html, pageUrl, { sourceHost: "newyorkloveskids.com" });
  },
};
