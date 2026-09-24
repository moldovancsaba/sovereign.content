/**
 * kidclick NYC — borough/event/place listings.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://www.kidclick.com";

module.exports = {
  id: "kidclick",
  name: "kidclick",
  base: BASE,
  boroughDefault: "Brooklyn",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/nyc`,
    `${BASE}/nyc/brooklyn`,
    `${BASE}/nyc/manhattan`,
    `${BASE}/nyc/queens`,
    `${BASE}/nyc/bronx`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return (
      /kidclick\.com\/nyc\/[^/]+\/places\//i.test(url) || /kidclick\.com\/nyc\/events\//i.test(url)
    );
  },
  harvestDetailUrls(html) {
    const places = harvestByHrefPattern(html, BASE, [/kidclick\.com\/nyc\/[^/]+\/places\//i]);
    const events = harvestByHrefPattern(html, BASE, [/kidclick\.com\/nyc\/events\//i]);
    return [...places, ...events];
  },
  /** Event pages often only cite a venue place — prefer enqueueing that place. */
  expandDetailQueue(html, pageUrl) {
    if (!/\/nyc\/events\//i.test(pageUrl || "")) return [];
    return harvestByHrefPattern(html, BASE, [/kidclick\.com\/nyc\/[^/]+\/places\//i]);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "kidclick.com" });
    if (/\/nyc\/brooklyn/i.test(pageUrl)) f.borough = f.borough || "Brooklyn";
    if (/\/nyc\/manhattan/i.test(pageUrl)) f.borough = f.borough || "Manhattan";
    if (/\/nyc\/queens/i.test(pageUrl)) f.borough = f.borough || "Queens";
    if (/\/nyc\/bronx/i.test(pageUrl)) f.borough = f.borough || "Bronx";
    if (/\/nyc\/staten/i.test(pageUrl)) f.borough = f.borough || "Staten Island";
    // Do not seed raw event pages — expandDetailQueue handles them.
    if (/\/nyc\/events\//i.test(pageUrl || "")) f._skipSeed = true;
    return f;
  },
};
