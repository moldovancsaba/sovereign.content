/**
 * Raising Queens Kids source adapter.
 */
const {
  extractProviderFacts,
  harvestProviderUrls,
} = require("../rqkExtract.cjs");

const BASE = "https://www.raisingqueenskids.com";

module.exports = {
  id: "rqk",
  name: "Raising Queens Kids",
  base: BASE,
  inventoryOnly: true,
  boroughDefault: "Queens",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/categories/extracurriculars/`,
    `${BASE}/categories/summer/`,
    `${BASE}/categories/afterschool/`,
    `${BASE}/categories/daycare/`,
    `${BASE}/categories/tutoring/`,
    `${BASE}/neighborhoods/astoria/`,
    `${BASE}/neighborhoods/long-island-city/`,
    `${BASE}/neighborhoods/forest-hills/`,
    `${BASE}/neighborhoods/flushing/`,
    `${BASE}/neighborhoods/bayside/`,
  ],
  bootstrapQueue: [
    "https://www.raisingqueenskids.com/provider/fierce-dragon-martial-arts-academy/r/recqxbz41qQhTtG3X/",
    "https://www.raisingqueenskids.com/provider/renzo-gracie-bayside/r/recPJfk7SVeYnIsmY/",
    "https://www.raisingqueenskids.com/provider/kings-combat-forest-hills/r/recopyqMHOhx5vtaa/",
    "https://www.raisingqueenskids.com/provider/mayo-kickboxing-mma-academy/r/recCEXWp2WJgsQMkW/",
  ],
  isDetailUrl(url) {
    return /raisingqueenskids\.com\/provider\//i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestProviderUrls(html, BASE);
  },
  extractFacts(html, pageUrl) {
    const f = extractProviderFacts(html, pageUrl);
    return {
      name: f.name,
      address: f.address,
      phone: f.phone,
      website: f.website,
      ageRange: f.ageRange,
      services: f.services,
      neighborhood: f.neighborhood,
      borough: "Queens",
      citationUrl: pageUrl,
      inventoryOnly: true,
    };
  },
};
