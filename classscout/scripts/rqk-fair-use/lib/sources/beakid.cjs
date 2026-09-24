/**
 * BeAKid — borough activity address pages.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://beakid.com";

module.exports = {
  id: "beakid",
  name: "BeAKid",
  base: BASE,
  boroughDefault: "Brooklyn",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/ny/brooklyn`,
    `${BASE}/ny/manhattan`,
    `${BASE}/ny/queens`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /beakid\.com\/ny\/[^/]+\/[^/]+-address\/?$/i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/beakid\.com\/ny\/[^/]+\/[^"'/]+-address/i]).filter(
      (u) => !/doctor|dental|vein|orthodon|chiropract|therapy-clinic/i.test(u)
    );
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "beakid.com" });
    // Slug often encodes the provider name when SSR is thin.
    if (!f.name || /explore\s+/i.test(f.name)) {
      const slug = (pageUrl.match(/\/ny\/[^/]+\/([^/]+)-address/i) || [])[1] || "";
      if (slug) {
        f.name = slug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim();
      }
    }
    if (/\/ny\/brooklyn/i.test(pageUrl)) f.borough = "Brooklyn";
    if (/\/ny\/manhattan/i.test(pageUrl)) f.borough = "Manhattan";
    if (/\/ny\/queens/i.test(pageUrl)) f.borough = "Queens";
    return f;
  },
};
