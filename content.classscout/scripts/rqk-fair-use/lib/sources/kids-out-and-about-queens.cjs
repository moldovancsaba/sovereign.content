/**
 * Kids Out and About Queens — borough family listings (prefer place guides over one-off events).
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://queens.kidsoutandabout.com";

module.exports = {
  id: "kids-out-and-about-queens",
  name: "Kids Out and About Queens",
  base: BASE,
  boroughDefault: "Queens",
  inventoryOnly: true,
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/`,
    `${BASE}/content/indoor-play-centers-around-queens`,
    `${BASE}/content/birthday-party-locations-and-around-queens`,
    `${BASE}/content/free-places-take-kids-and-around-queens`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /kidsoutandabout\.com\/content\//i.test(url) && !/\/content\/(free-things|things-do-weekend)/i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/kidsoutandabout\.com\/content\//i]).filter(
      (u) => !/weekend|next-weekend|fall-fun|how-list/i.test(u)
    );
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "kidsoutandabout.com" });
    f.borough = "Queens";
    f.inventoryOnly = true;
    // Guide pages expand outbound; skip seeding the guide itself.
    if (/\/content\//i.test(pageUrl) && !f.website) f._skipSeed = true;
    return f;
  },
  expandDetailQueue(html) {
    const { BLOCKED_HOST_RE, hostOf } = require("../genericExtract.cjs");
    const out = [];
    const re = /href=["'](https?:\/\/[^"'#\s]+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
      const u = m[1].replace(/&amp;/g, "&");
      const h = hostOf(u);
      if (!h || /kidsoutandabout/i.test(h)) continue;
      if (BLOCKED_HOST_RE.test(h) || /\.(png|jpe?g|gif|svg|pdf)(\?|$)/i.test(u)) continue;
      out.push(u);
    }
    return out.slice(0, 40);
  },
};
