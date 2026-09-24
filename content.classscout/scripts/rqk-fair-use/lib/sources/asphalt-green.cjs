/**
 * Asphalt Green — UES + Battery Park kids swim/sports campuses.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://www.asphaltgreen.org";

module.exports = {
  id: "asphalt-green",
  name: "Asphalt Green",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/locations/`,
    `${BASE}/program/youth-fitness/`,
    `${BASE}/community/after-school-programs-overview/`,
    `${BASE}/`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return (
      /asphaltgreen\.org\/(locations|program|community|sports)\//i.test(url) ||
      /asphaltgreen\.org\/\?post_type=tribe_programs/i.test(url)
    );
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [
      /asphaltgreen\.org\/locations\//i,
      /asphaltgreen\.org\/program\//i,
      /asphaltgreen\.org\/community\//i,
      /asphaltgreen\.org\/sports\//i,
    ]);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "asphaltgreen.org" });
    f.website = f.website || pageUrl;
    f.borough = "Manhattan";
    if (/swim|aquatic|pool/i.test(pageUrl + f.name) && !f.services.includes("Swimming")) {
      f.services = ["Swimming", ...f.services];
    }
    if (/\/?$/.test(pageUrl) && /asphaltgreen\.org\/?$/i.test(pageUrl)) f._skipSeed = true;
    return f;
  },
};
