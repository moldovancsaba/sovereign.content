/**
 * Fact extraction helpers for Raising Queens Kids provider pages.
 * Fair-use: facts only; official provider website is the Find target.
 */
function slugifyId(name) {
  return String(name || "provider")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function extractProviderFacts(html, pageUrl) {
  const text = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\n+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  const nameMatch =
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
    text.match(/^([^\n]{3,120})\n/);
  const name = (nameMatch && nameMatch[1] ? nameMatch[1] : "").replace(/\s+/g, " ").trim();

  const address =
    (text.match(/Address\s+([^\n]+?(?:NY|New York)\s+\d{5})/i) || [])[1] ||
    (text.match(/(\d{1,5}[-–]?\d{0,4}\s+[^\n,]{3,60}(?:Avenue|Ave|Street|St|Boulevard|Blvd|Road|Rd|Place|Pl)[^\n]{0,40}NY\s+\d{5})/i) ||
      [])[1] ||
    "";

  const phoneRaw =
    (text.match(/Phone\s+(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i) || [])[1] || "";
  const website =
    (text.match(/Website\s+(https?:\/\/\S+)/i) || [])[1] ||
    (html.match(/Website[^<]*<a[^>]+href=["'](https?:\/\/[^"']+)["']/i) || [])[1] ||
    "";

  const ageRange = (text.match(/Age range\s+([^\n]+)/i) || [])[1] || "";

  const services = [];
  const svcBlock = text.match(/Services offered\s+([\s\S]{0,1200}?)(?:Hours|Registration|Disclaimer|Features|$)/i);
  if (svcBlock) {
    for (const line of svcBlock[1].split("\n")) {
      const s = line.replace(/^[-•*\d.\s]+/, "").trim();
      if (s.length >= 3 && s.length <= 80) services.push(s);
    }
  }

  const neighborhood =
    (text.match(/·\s*([A-Za-z][A-Za-z\s'-]{2,40})\s*·\s*Raising Queens Kids/i) || [])[1] ||
    (pageUrl.includes("whitestone") ? "Whitestone" : "") ||
    "";

  return {
    name,
    address: address.replace(/\s+/g, " ").trim(),
    phone: phoneRaw,
    website: website.replace(/[).,]+$/, ""),
    ageRange: ageRange.trim(),
    services: [...new Set(services)].slice(0, 12),
    neighborhood: neighborhood.trim(),
    rqkUrl: pageUrl,
  };
}

function mapActivityTypes(services, name) {
  const blob = `${(services || []).join(" ")} ${name || ""}`.toLowerCase();
  const out = [];
  if (/taekwondo|tae\s*kwon|tkd/.test(blob)) out.push("Taekwondo");
  if (/jiu[\s-]?jitsu|bjj|grappling/.test(blob)) out.push("Brazilian Jiu-Jitsu");
  if (/karate/.test(blob)) out.push("Karate");
  if (/aikido/.test(blob)) out.push("Aikido");
  if (/capoeira/.test(blob)) out.push("Capoeira");
  if (/judo/.test(blob)) out.push("Judo");
  if (/wrestl/.test(blob)) out.push("Wrestling");
  if (/fencing|foil|epee|épée/.test(blob)) out.push("Fencing");
  if (/boxing/.test(blob)) out.push("Boxing");
  if (/kickbox/.test(blob)) out.push("Kickboxing");
  if (/muay\s*thai/.test(blob)) out.push("Muay Thai");
  if (/\bmma\b|(^|[^a-z])martial\b/.test(blob)) out.push("Martial Arts");
  if (/soccer/.test(blob)) out.push("Soccer");
  if (/flag\s*football/.test(blob)) out.push("Flag Football");
  else if (/\bfootball\b/.test(blob)) out.push("Football");
  if (/beach\s*volley|sand\s*volley/.test(blob)) out.push("Beach Volleyball");
  else if (/volley/.test(blob)) out.push("Volleyball");
  if (/softball/.test(blob)) out.push("Softball");
  if (/baseball|tee[\s-]?ball/.test(blob)) out.push("Baseball");
  if (/lacrosse/.test(blob)) out.push("Lacrosse");
  if (/ice\s*hockey|\bhockey\b/.test(blob)) out.push("Ice Hockey");
  if (/water\s*polo/.test(blob)) out.push("Water Polo");
  if (/swim/.test(blob)) out.push("Swimming");
  if (/ultimate|frisbee/.test(blob)) out.push("Ultimate Frisbee");
  if (/handball/.test(blob)) out.push("Handball");
  if (/rugby/.test(blob)) out.push("Rugby");
  if (/horseback|horse\s*rid|equestrian/.test(blob)) out.push("Horseback Riding");
  if (/mini[\s-]?golf/.test(blob)) out.push("Mini-Golf");
  else if (/\bgolf\b/.test(blob)) out.push("Golf");
  if (/sail|sailing/.test(blob)) out.push("Sailing");
  if (/gymnast|tumbling/.test(blob)) out.push("Gymnastics");
  if (/cheer/.test(blob)) out.push("Cheerleading");
  if (/parkour/.test(blob)) out.push("Parkour");
  if (/dance|ballet|hip[\s-]?hop|tap\b/.test(blob)) out.push("Dance");
  if (/theater|theatre|drama|acting/.test(blob)) out.push("Theater");
  if (/\bcook(ing|ery)?\b|chef|culinary/.test(blob)) out.push("Cooking");
  if (/\bart\b|paint|clay|pottery|craft/.test(blob)) out.push("Art");
  if (/music|piano|violin|choir/.test(blob)) out.push("Music");
  if (/\bcoding\b|robot/.test(blob)) out.push("Coding");
  if (/\bchess\b/.test(blob)) out.push("Chess");
  if (/stem|science|steam/.test(blob)) out.push("STEM");
  if (/yoga/.test(blob)) out.push("Yoga");
  // Canonical public vocabulary — bare "Skating" is not a reviewed tag and public-404s.
  if (/roller\s*skat|rollerblad/.test(blob)) out.push("Roller Skating");
  else if (/skateboard/.test(blob)) out.push("Skateboarding");
  else if (/figure\s*skat/.test(blob)) out.push("Figure Skating");
  else if (/ice\s*skat|\brink\b|\bskate|\bskating\b/.test(blob)) out.push("Ice Skating");
  if (/climb|bouldering|ninja/.test(blob)) out.push("Climbing");
  if (/tennis/.test(blob)) out.push("Tennis");
  if (/basketball/.test(blob)) out.push("Basketball");
  if (/\blanguage\b|spanish|french|mandarin|chinese/.test(blob)) out.push("Language");
  if (/tutor/.test(blob)) out.push("Tutoring");
  if (/indoor\s*play|open\s*play|play\s*place|play\s*cafe/.test(blob)) out.push("Indoor Play");
  if (/outdoor\s*activit|outdoor\s*play|nature\s*explor|nature\s*\/\s*outdoor|\bnature\b|greenmarket|farmers?\s*market|farm\s*stand/.test(blob))
    out.push("Outdoor Activities");
  if (/\bmuseum\b/.test(blob)) out.push("Museum");
  if (/library|story\s*time|storytime|storytelling/.test(blob)) out.push("Storytelling");
  if (/early\s*childhood|preschool|multi[\s-]?categor|multi[\s-]?activit|community\s*\/\s*multi/.test(blob))
    out.push("Multi-Activity");
  if (/kayak/.test(blob)) out.push("Kayaking");
  if (/multi[\s-]?sport|athletics/.test(blob)) out.push("Multi-Sport");
  else if (/\bsports?\b/.test(blob) && !out.some((t) => t !== "Sports" && /Soccer|Basketball|Baseball|Tennis|Volleyball|Football|Lacrosse|Softball|Swimming|Gymnastics|Martial|Hockey|Fencing|Rugby|Golf|Climbing|Ice Skating|Roller Skating|Figure Skating|Boxing|Cheer|Parkour|Handball|Water Polo|Ultimate|Horseback|Sailing|Mini-Golf|Multi-Sport/.test(t))) {
    out.push("Sports");
  }
  if (/birthday/.test(blob)) out.push("Birthday Entertainment");
  // Do not map bare "camp" → "Camps" (category name, not an activity tag). Camp directories
  // still map when the provider name/page states swim/dance/martial/etc.
  // Never invent a default activity (Martial Arts was the old RQK-shaped fallback and poisoned
  // Sprout/Mommy Poppins event leads). Empty means: inventory-only or reject at seed build.
  return [...new Set(out)].slice(0, 4);
}

/**
 * Board issue 941: an unmatched/empty `ageText` used to default to the wide bucket
 * `["3–5", "6–8", "9–12"]` (roughly "3–12") — exactly the pattern the audit found repeatedly, e.g. a
 * badge reading 3–12 with no supporting age text at all. `ageRanges: []` already has a real, supported
 * meaning downstream (`src/lib/age/ageMonths.ts`'s `AGE_UNCONFIRMED_LABEL`, "Age not confirmed" — the
 * label several correctly-behaving detail pages in the audit already showed), so returning empty here
 * instead of inventing a bucket makes this path consistent with that existing convention rather than
 * masking missing evidence as a false-precision range.
 */
function mapAgeRanges(ageText) {
  const t = String(ageText || "").toLowerCase();
  const out = [];
  if (/infant|0\s*[-–]\s*2|1\.5|2\s*year|preschool|3\s*year/.test(t)) {
    out.push("0–2", "3–5");
  }
  if (/3\s*year|4\s*year|5\s*year|preschool|and up/.test(t)) out.push("3–5");
  if (/6|7|8|elementary|kids/.test(t) || /and up/.test(t)) out.push("6–8");
  if (/9|10|11|12|and up|teens?|13|14|15|16|17/.test(t)) out.push("9–12");
  if (/teen|13|14|15|16|17|18/.test(t)) out.push("Teens");
  const canon = ["0–2", "3–5", "6–8", "9–12", "Teens"];
  return canon.filter((a) => out.includes(a));
}

function buildInventorySeed(facts) {
  const { stripUrlsFromPublicCopy } = require("../../lib/publicCopyHygiene.cjs");
  const activityTypes = mapActivityTypes(facts.services || [], facts.name);
  const ageRanges = mapAgeRanges(facts.ageRange);
  const id = `prov-rqk-${slugifyId(facts.name)}`;
  const website = facts.website || facts.rqkUrl;
  const shortDescription = stripUrlsFromPublicCopy(
    `${facts.name} offers kids programs in Queens${
      facts.neighborhood ? ` (${facts.neighborhood})` : ""
    }${facts.address ? ` at ${facts.address}.` : "."}`
  ).slice(0, 400);
  const longDescription = stripUrlsFromPublicCopy(
    [
      `${facts.name} is listed on Raising Queens Kids as a Queens family program.`,
      facts.address ? `Address stated on that listing: ${facts.address}.` : "",
      facts.ageRange ? `Listed age range: ${facts.ageRange}.` : "",
      facts.services && facts.services.length
        ? `Listed services include: ${facts.services.slice(0, 6).join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n")
  ).slice(0, 4000);

  return {
    id,
    website,
    name: facts.name,
    category: "Classes",
    borough: "Queens",
    neighborhood: facts.neighborhood || "Queens",
    address: facts.address || "",
    activityTypes,
    ageRanges,
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "After-school"],
    publicTarget: false,
    inventoryOnly: true,
    requiresAddressFromPage: !facts.address,
    researchSources: [facts.rqkUrl, website].filter(Boolean),
    researchNote:
      "Discovered via Raising Queens Kids fair-use one-lead research. Official provider website is the Find target; RQK is citation only. Queens is inventory-only while public toggles hide the borough.",
    shortDescription,
    longDescription,
  };
}

/** Harvest /provider/... links from a category or neighborhood HTML page. */
function harvestProviderUrls(html, base = "https://www.raisingqueenskids.com") {
  const urls = new Set();
  const re = /href=["']([^"']*\/provider\/[^"'#]+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let u = m[1];
    if (u.startsWith("/")) u = base + u;
    if (!u.includes("raisingqueenskids.com/provider/")) continue;
    // Prefer canonical detail URLs that include /r/rec…
    urls.add(u.split("?")[0].replace(/\/$/, "") + "/");
  }
  return [...urls];
}

module.exports = {
  extractProviderFacts,
  buildInventorySeed,
  harvestProviderUrls,
  slugifyId,
  mapActivityTypes,
  mapAgeRanges,
};
