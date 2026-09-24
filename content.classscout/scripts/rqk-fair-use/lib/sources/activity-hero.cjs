/**
 * ActivityHero — NYC /biz/ provider pages via sitemap discovery.
 */
const zlib = require("zlib");
const { extractGenericFacts, harvestSitemapLocs } = require("../genericExtract.cjs");

const BASE = "https://www.activityhero.com";

function nycBizFilter(u) {
  return (
    /activityhero\.com\/biz\//i.test(u) &&
    /(?:-new-york-ny|-brooklyn-ny|-manhattan-ny|-queens-ny|-bronx-ny|-nyc-new-york-ny)/i.test(u) &&
    !/novato-ca|montclair-nj|jersey-city|connecticut|westchester|long-island(?!-city)/i.test(u)
  );
}

module.exports = {
  id: "activity-hero",
  name: "ActivityHero",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    "https://assets.activityhero.com/sitemaps/sitemap1.xml.gz",
    "https://assets.activityhero.com/sitemaps/sitemap2.xml.gz",
    `${BASE}/in/new-york-ny`,
    `${BASE}/in/brooklyn-ny`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /activityhero\.com\/biz\//i.test(url);
  },
  async prepareDiscoveryBody(page) {
    // Gunzip already handled in fetchPage for gzip magic; sitemap may still be gzip bytes-as-text.
    if (page.finalUrl && /\.gz$/i.test(page.finalUrl) && !/<loc>/i.test(page.html)) {
      try {
        const buf = Buffer.from(page.html, "binary");
        page.html = zlib.gunzipSync(buf).toString("utf8");
      } catch {
        /* leave as-is */
      }
    }
    return page;
  },
  harvestDetailUrls(html, pageUrl) {
    if (/<urlset|<sitemapindex|\.xml/i.test(html + (pageUrl || ""))) {
      return harvestSitemapLocs(html, nycBizFilter).slice(0, 120);
    }
    return harvestSitemapLocs(html, nycBizFilter).slice(0, 40);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "activityhero.com" });
    f.name = String(f.name || "")
      .replace(/\s*[-–—]\s*See\s+\d{4}\s+Schedules.*$/i, "")
      .replace(/\s*[-–—]\s*Reviews?\s*&\s*More.*$/i, "")
      .trim();
    if (/business\.activityhero\.com/i.test(f.website || "")) f.website = "";
    if (/-brooklyn-ny/i.test(pageUrl)) f.borough = "Brooklyn";
    else if (/-queens-ny|long-island-city/i.test(pageUrl)) f.borough = "Queens";
    else if (/-bronx-ny/i.test(pageUrl)) f.borough = "Bronx";
    else if (/new-york-ny|manhattan/i.test(pageUrl)) f.borough = "Manhattan";
    return f;
  },
};
