/**
 * YMCA of Greater New York — kids program / branch pages.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://ymcanyc.org";

module.exports = {
  id: "ymca-nyc",
  name: "YMCA of Greater New York",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/programs/kids-family/arts-education-children-teens`,
    `${BASE}/programs/swimming-ymca/swim-lessons`,
    `${BASE}/locations`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return (
      /ymcanyc\.org\/locations\/[a-z0-9-]+/i.test(url) ||
      /ymcanyc\.org\/programs\//i.test(url)
    );
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [
      /ymcanyc\.org\/locations\/[a-z0-9-]+/i,
      /ymcanyc\.org\/programs\/[^"'#]+/i,
    ]).filter((u) => !/\/programs\/kids-family\/arts-education-children-teens\/?$/i.test(u));
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "ymcanyc.org" });
    // Branch pages are the official site for that campus.
    if (/ymcanyc\.org\/locations\//i.test(pageUrl) && !f.website) f.website = pageUrl;
    if (/swim/i.test(pageUrl) && !f.services.includes("Swimming")) {
      f.services = ["Swimming", ...f.services];
    }
    return f;
  },
};
