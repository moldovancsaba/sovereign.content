/**
 * Beyond Camps — Brooklyn summer-camp provider directory.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://beyondcamps.com";

module.exports = {
  id: "beyond-camps",
  name: "Beyond Camps",
  base: BASE,
  boroughDefault: "Brooklyn",
  robotsBase: BASE,
  discoveryPages: [`${BASE}/providers`, `${BASE}/`],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /beyondcamps\.com\/providers\/[a-z0-9-]+\/?$/i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/beyondcamps\.com\/providers\/[a-z0-9-]+/i]).filter(
      (u) => !/\/providers\/?$/i.test(u) && !/\/camps\//i.test(u)
    );
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "beyondcamps.com" });
    f.borough = "Brooklyn";
    if (!f.services.includes("Camp")) f.services = [...f.services, "Camp"];
    return f;
  },
};
