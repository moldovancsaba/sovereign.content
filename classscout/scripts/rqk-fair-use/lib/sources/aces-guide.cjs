/**
 * NYC DOE ACES Guide — arts & cultural education organization listings.
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://www.nycenet.edu";

module.exports = {
  id: "aces-guide",
  name: "NYC DOE ACES Guide",
  base: BASE,
  boroughDefault: "Manhattan",
  inventoryOnly: true,
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/offices/teachlearn/arts/aces_guide/index.html`,
    "https://infohub.nyced.org/in-our-schools/programs/arts-education/arts-and-cultural-education-services",
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return (
      /nycenet\.edu\/offices\/teachlearn\/arts\/aces_guide\/entries\//i.test(url) ||
      /infohub\.nyced\.org\//i.test(url)
    );
  },
  harvestDetailUrls(html, pageUrl) {
    const fromAces = harvestByHrefPattern(html, BASE, [
      /nycenet\.edu\/offices\/teachlearn\/arts\/aces_guide\/entries\//i,
      /\.\/entries\//i,
    ]);
    const baseForPage = pageUrl && /infohub\.nyced\.org/i.test(pageUrl) ? "https://infohub.nyced.org" : BASE;
    const more = harvestByHrefPattern(html, baseForPage, [/https?:\/\/[^"'#\s]+/i]).filter((u) => {
      try {
        const h = new URL(u).hostname.replace(/^www\./, "");
        return (
          h &&
          !/nycenet\.edu|nyced\.org|googleapis|facebook|twitter|blenderbox/i.test(h) &&
          !/\.(css|js|png|jpe?g|gif|svg)(\?|$)/i.test(u)
        );
      } catch {
        return false;
      }
    });
    return [...fromAces, ...more].slice(0, 80);
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "nycenet.edu" });
    f.inventoryOnly = true;
    if (!f.services.some((s) => /dance|music|art|theat(?:er|re)/i.test(s))) {
      // ACES is arts-only — only add a hint when the page/URL says so.
      if (/dance/i.test(pageUrl + f.name)) f.services.push("Dance");
      if (/music/i.test(pageUrl + f.name)) f.services.push("Music");
      if (/visual|art/i.test(pageUrl + f.name)) f.services.push("Art");
      if (/theat(?:er|re)/i.test(pageUrl + f.name)) f.services.push("Dance");
    }
    return f;
  },
};
