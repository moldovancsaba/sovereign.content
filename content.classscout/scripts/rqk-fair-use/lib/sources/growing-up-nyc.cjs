/**
 * Growing Up NYC — city activity guide (harvest outbound program links).
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://growingupnyc.cityofnewyork.us";

module.exports = {
  id: "growing-up-nyc",
  name: "Growing Up NYC",
  base: BASE,
  boroughDefault: "Manhattan",
  inventoryOnly: true,
  robotsBase: BASE,
  discoveryPages: [`${BASE}/activity/`, `${BASE}/`],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /growingupnyc\.cityofnewyork\.us\//i.test(url) && !/\/activity\/?$/i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/growingupnyc\.cityofnewyork\.us\//i]);
  },
  expandDetailQueue(html) {
    const { BLOCKED_HOST_RE, hostOf } = require("../genericExtract.cjs");
    const out = [];
    const re = /href=["'](https?:\/\/[^"'#\s]+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
      const u = m[1].replace(/&amp;/g, "&");
      const h = hostOf(u);
      if (!h || /growingupnyc|cityofnewyork\.us$/i.test(h)) continue;
      if (BLOCKED_HOST_RE.test(h)) continue;
      if (/nycgovparks\.org\/events\//i.test(u)) continue; // one-off event calendars
      out.push(u);
    }
    return out.slice(0, 40);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "growingupnyc.cityofnewyork.us" });
    f.inventoryOnly = true;
    if (/growingupnyc/i.test(pageUrl) && !f.website) f._skipSeed = true;
    return f;
  },
};
