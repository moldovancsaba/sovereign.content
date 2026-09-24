/**
 * Park Slope Parents — recommendations / classes & activities reviews.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://www.parkslopeparents.com";

module.exports = {
  id: "park-slope-parents",
  name: "Park Slope Parents",
  base: BASE,
  boroughDefault: "Brooklyn",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/reviews/kids-family/classes-activities.html`,
    `${BASE}/reviews/kids-family/childcare-education-camps-2.html`,
    `${BASE}/family-life/classes-activities/sports-classes-teams.html`,
    `${BASE}/all-reviews`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return (
      /parkslopeparents\.com\/reviews\//i.test(url) ||
      /parkslopeparents\.com\/family-life\/classes-activities\//i.test(url) ||
      /parkslopeparents\.com\/Advice-Activities\//i.test(url)
    );
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [
      /parkslopeparents\.com\/reviews\//i,
      /parkslopeparents\.com\/family-life\/classes-activities\//i,
    ]).filter((u) => !/groups\.parkslopeparents\.com/i.test(u));
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "parkslopeparents.com" });
    f.borough = f.borough || "Brooklyn";
    f.neighborhood = f.neighborhood || "Park Slope";
    return f;
  },
};
