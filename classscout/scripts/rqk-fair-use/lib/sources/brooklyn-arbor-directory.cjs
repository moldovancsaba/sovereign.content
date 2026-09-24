/**
 * Brooklyn Arbor after-school PDF directory — citation/inbox path for Williamsburg providers.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://www.brooklynarbor.org";

module.exports = {
  id: "brooklyn-arbor-directory",
  name: "Brooklyn Arbor After-School Directory",
  base: BASE,
  boroughDefault: "Brooklyn",
  robotsBase: BASE,
  discoveryPages: [`${BASE}/afterschool`, `${BASE}/`],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /brooklynarbor\.org\/afterschool/i.test(url) || /\.pdf(\?|$)/i.test(url);
  },
  harvestDetailUrls(html) {
    const pages = harvestByHrefPattern(html, BASE, [/brooklynarbor\.org\/afterschool/i]);
    const pdfs = harvestByHrefPattern(html, BASE, [/\.pdf(\?|$)/i]);
    return [...pages, ...pdfs];
  },
  expandDetailQueue(html) {
    const { BLOCKED_HOST_RE, hostOf } = require("../genericExtract.cjs");
    const out = [];
    const re = /href=["'](https?:\/\/[^"'#\s]+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
      const u = m[1].replace(/&amp;/g, "&");
      const h = hostOf(u);
      if (!h || /brooklynarbor/i.test(h)) continue;
      if (BLOCKED_HOST_RE.test(h) || /\.pdf(\?|$)/i.test(u)) continue;
      out.push(u);
    }
    return out.slice(0, 40);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "brooklynarbor.org" });
    f.borough = "Brooklyn";
    f.neighborhood = f.neighborhood || "Williamsburg";
    if (/brooklynarbor|\.pdf/i.test(pageUrl)) f._skipSeed = true;
    return f;
  },
};
