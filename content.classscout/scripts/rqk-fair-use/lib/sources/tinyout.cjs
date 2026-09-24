/**
 * tinyout — NYC toddler/kids studio directory (studio detail pages).
 */
const { extractGenericFacts, harvestByHrefPattern } = require("../genericExtract.cjs");

const BASE = "https://tinyout.com";

module.exports = {
  id: "tinyout",
  name: "tinyout",
  base: BASE,
  boroughDefault: "Manhattan",
  robotsBase: BASE,
  discoveryPages: [
    `${BASE}/studios`,
    `${BASE}/studios?page=2`,
    `${BASE}/studios?page=3`,
    `${BASE}/browse`,
  ],
  bootstrapQueue: [],
  isDetailUrl(url) {
    return /tinyout\.com\/studios\/[a-z0-9-]+\/?$/i.test(url);
  },
  harvestDetailUrls(html) {
    return harvestByHrefPattern(html, BASE, [/tinyout\.com\/studios\/[a-z0-9-]+/i]).filter(
      (u) => !/\/studios\/?(\?|$)/i.test(u) && !/page=/i.test(u)
    );
  },
  extractFacts(html, pageUrl) {
    const f = extractGenericFacts(html, pageUrl, { sourceHost: "tinyout.com" });
    // Subtitle under H1: "Union Square · Swim", "Fresh Meadows · Language", or bare "Cooking"/"Theater".
    const subtitle =
      (String(html || "").match(
        /<h1[^>]*>[\s\S]*?<\/h1>\s*<p[^>]*class="[^"]*text-text-mid[^"]*"[^>]*>\s*([^<]{2,80})\s*<\/p>/i
      ) || [])[1] ||
      "";
    const sub = String(subtitle || "").replace(/\s+/g, " ").trim();
    const ACTIVITY_WORD =
      /theater|theatre|cook|language|swim|dance|art|sport|music|stem|yoga|camp|martial|gym|athlet|food|soccer|basketball|tennis|climb|skate|science|coding|chess|fencing|baseball|football|lacrosse|hockey|boxing|cheer|parkour|tutoring|indoor\s*play|open\s*play|outdoor|library|museum|greenmarket|farmers?\s*market|multi(?:ple)?[\s-]?activit|multi[\s-]?sport/i;

    function pushActivity(label) {
      const t = String(label || "").trim();
      if (!t) return;
      if (/^multiple\s+activit/i.test(t) || /^multi(?:ple)?[\s-]?activit/i.test(t)) {
        f.activityHints = [...new Set([...(f.activityHints || []), "Multi-Activity"])];
        f.services = [...new Set([...(f.services || []), "Multi-Activity"])];
        return;
      }
      if (/^open\s*play$/i.test(t)) {
        f.activityHints = [...new Set([...(f.activityHints || []), "Indoor Play"])];
        f.services = [...new Set([...(f.services || []), "Indoor Play"])];
        return;
      }
      if (/library/i.test(t)) {
        f.activityHints = [...new Set([...(f.activityHints || []), "Storytelling"])];
        f.services = [...new Set([...(f.services || []), "Storytelling"])];
        return;
      }
      if (/museum/i.test(t)) {
        f.activityHints = [...new Set([...(f.activityHints || []), "Museum"])];
        f.services = [...new Set([...(f.services || []), "Museum"])];
        return;
      }
      f.activityHints = [...new Set([...(f.activityHints || []), t])];
      f.services = [...new Set([...(f.services || []), t])];
    }

    if (sub) {
      const parts = sub.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        f.neighborhood = f.neighborhood || parts[0];
        pushActivity(parts.slice(1).join(" "));
      } else if (parts.length === 1) {
        if (ACTIVITY_WORD.test(parts[0])) pushActivity(parts[0]);
        else f.neighborhood = f.neighborhood || parts[0];
      }
    }
    // Fallback neighborhood from older "X · Y" scrape when subtitle class changes.
    if (!f.neighborhood) {
      const hood =
        (String(html || "").match(/<h1[^>]*>[\s\S]*?<\/h1>\s*<[^>]*>\s*([^·<\n]{2,40})\s*·/i) || [])[1] ||
        "";
      if (hood) f.neighborhood = hood.trim();
    }
    if (/brooklyn/i.test(f.neighborhood || "")) f.borough = "Brooklyn";
    else if (/queens|long island city|astoria|flushing|fresh meadows/i.test(f.neighborhood || pageUrl))
      f.borough = "Queens";
    else if (/bronx/i.test(f.neighborhood || pageUrl)) f.borough = "Bronx";
    else if (/staten/i.test(f.neighborhood || pageUrl)) f.borough = "Staten Island";
    if (/^multiple\s+activit/i.test(f.neighborhood || "")) f.neighborhood = "";

    // Website path / name cues when the subtitle is empty or only "Multiple activities".
    const blob = `${f.name || ""} ${f.website || ""} ${(f.services || []).join(" ")} ${pageUrl || ""}`;
    if (/chinese|mandarin|spanish|french|language/i.test(blob) && !(f.services || []).some((s) => /language|chinese|mandarin/i.test(s))) {
      pushActivity("Language");
    }
    if (/food\s*tour|cook/i.test(blob) && !(f.services || []).some((s) => /cook/i.test(s))) {
      pushActivity("Cooking");
    }
    if (/athletics|multi[\s-]?sport/i.test(blob) && !(f.services || []).length) {
      pushActivity("Multi-Sport");
    }
    if (/builder|lego|maker|stem|robot/i.test(blob) && !(f.services || []).length) {
      pushActivity("STEM");
    }
    if (/museum/i.test(blob) && !(f.services || []).some((s) => /museum/i.test(s))) {
      pushActivity("Museum");
    }
    if (/library/i.test(blob) && !(f.services || []).some((s) => /story|library/i.test(s))) {
      pushActivity("Storytelling");
    }
    if (/open\s*play|indoor\s*play|play\s*place|play\s*cafe/i.test(blob) && !(f.services || []).some((s) => /play/i.test(s))) {
      pushActivity("Indoor Play");
    }
    if (/greenmarket|farmers?\s*market|farm\s*stand/i.test(blob) && !(f.services || []).some((s) => /outdoor|nature/i.test(s))) {
      pushActivity("Outdoor Activities");
    }
    if (/^park$/i.test(String((f.services || [])[0] || ""))) {
      f.services = ["Outdoor Activities"];
      f.activityHints = ["Outdoor Activities"];
    }
    // "Multiple activities" alone is too vague for Find — prefer name cues above; if still only Multi-Activity and name is a market/library/museum, replace.
    if ((f.services || []).length === 1 && /multi[\s-]?activit/i.test(f.services[0])) {
      if (/greenmarket|farmers?\s*market|farm\s*stand/i.test(blob)) f.services = ["Outdoor Activities"];
      else if (/library/i.test(blob)) f.services = ["Storytelling"];
      else if (/museum/i.test(blob)) f.services = ["Museum"];
      else if (/health\s*center|therapy|clinic/i.test(blob)) f.services = []; // not a kids class venue
      else if (/athlet|sport|gym|fitness/i.test(blob)) f.services = ["Multi-Sport"];
    }
    return f;
  },
};
