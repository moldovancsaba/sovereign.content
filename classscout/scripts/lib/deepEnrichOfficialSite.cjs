/**
 * Bounded deep enrich of an official provider site — evidence only.
 *
 * Fetches a small set of related pages (home + pricing/classes/contact/schedule)
 * and merges trial / sessions / contacts / price / age extractors into one result.
 * Cap: DEEP_ENRICH_MAX_PAGES (default 6), DEEP_ENRICH_TIMEOUT_MS (default 12000).
 * Never invents contacts or amounts.
 */
const {
  stripHtml,
  extractFromHtml,
  extractHardContacts,
  extractSessions,
  extractPrice,
  extractAgeRanges,
  buildTrialPolicy,
  isBadTrialPolicy,
} = require("./extractOfficialPage.cjs");
const { extractAboutEvidence } = require("./composeListingCopy.cjs");
const { MARKETPLACE_HUB_COPY_RE } = require("./publicCopyHygiene.cjs");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function deepPaths(website) {
  let u;
  try {
    u = new URL(website);
  } catch {
    return [];
  }
  const o = u.origin;
  const home = website.startsWith("http") ? website : `${o}/`;
  // Contact / location pages first after home — address recovery needs them inside
  // the default DEEP_ENRICH_MAX_PAGES=6 window (pricing/tuition used to crowd them out).
  return [
    ...new Set([
      home,
      `${o}/`,
      `${o}/contact`,
      `${o}/contact-us`,
      `${o}/locations`,
      `${o}/location`,
      `${o}/find-us`,
      `${o}/visit`,
      `${o}/visit-us`,
      `${o}/our-locations`,
      `${o}/studios`,
      `${o}/about`,
      `${o}/classes`,
      `${o}/programs`,
      `${o}/pricing`,
      `${o}/prices`,
      `${o}/tuition`,
      `${o}/fees`,
      `${o}/schedule`,
      `${o}/calendar`,
      `${o}/faq`,
      `${o}/faqs`,
      `${o}/trial`,
      `${o}/register`,
      `${o}/registration`,
    ]),
  ];
}

async function fetchText(url, timeoutMs) {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await r.text();
    return {
      ok: r.ok,
      status: r.status,
      url: r.url,
      text: text.slice(0, 450_000),
      blocked: /cdn-cgi\/challenge|just a moment|cf-browser-verification/i.test(text),
    };
  } catch (e) {
    return { ok: false, status: 0, url, text: "", error: String(e.message || e), blocked: false };
  }
}

function mergeTrial(html, sourceUrl, best) {
  const fromHtml = extractFromHtml(html, sourceUrl);
  let policy = buildTrialPolicy(fromHtml.trialSnippets || []);
  if (!policy) {
    const text = stripHtml(html);
    const snippets = [];
    const trialRe =
      /((?:free\s+(?:intro|trial|first)\s+class)|(?:try\s+a\s+(?:free\s+)?class)|(?:\$\s*\d{1,3}\s+(?:one[-\s]?on[-\s]?one\s+)?trial)|(?:trial\s+(?:class|lesson)))[^.!<]{0,100}/gi;
    for (const m of text.matchAll(trialRe)) snippets.push(m[0].replace(/\s+/g, " ").trim().slice(0, 240));
    policy = buildTrialPolicy(snippets);
    if (!policy && snippets.length) {
      const joined = snippets.join(" ").toLowerCase();
      const p = { sourceText: snippets[0].slice(0, 500) };
      if (/\$\s*\d+/.test(joined) && /trial/.test(joined)) {
        p.trialAvailable = true;
        p.trialIsFree = false;
      } else if (/free/.test(joined) && /trial|try a class/.test(joined)) {
        p.trialAvailable = true;
        p.trialIsFree = true;
      } else if (/trial/.test(joined)) {
        p.trialAvailable = true;
      }
      if (Object.keys(p).length > 1) policy = p;
    }
  }
  if (!policy || isBadTrialPolicy(policy)) return best;
  if (!best) return { trialPolicy: policy, sourceUrl };
  if (policy.trialIsFree && !best.trialPolicy.trialIsFree) return { trialPolicy: policy, sourceUrl };
  return best;
}

/**
 * @param {{ id?: string, website: string, name?: string }} item
 * @param {{ maxPages?: number, timeoutMs?: number, htmlCache?: Map<string, {ok:boolean,status:number,url:string,text:string,blocked?:boolean}> }} [opts]
 */
async function deepEnrichOfficialSite(item, opts = {}) {
  const maxPages = Math.max(2, Number(opts.maxPages || process.env.DEEP_ENRICH_MAX_PAGES || 6));
  const timeoutMs = Math.max(3000, Number(opts.timeoutMs || process.env.DEEP_ENRICH_TIMEOUT_MS || 12000));
  const website = item.website;
  if (!website || !/^https?:/i.test(website)) {
    return { id: item.id, website, notes: "no_website", fieldsFound: [] };
  }

  const urls = deepPaths(website).slice(0, maxPages);
  const pages = [];
  let trialBest = null;
  let sessionsBest = [];
  let phone = "";
  let email = "";
  let priceBest = null;
  let agesBest = [];
  let imageUrl = "";
  let streetAddresses = [];
  let aboutBest = { aboutText: "", source: null, fromSeedUrl: false };

  const seedUrlNorm = String(website || "")
    .replace(/\/$/, "")
    .toLowerCase();

  for (const url of urls) {
    let res;
    if (opts.htmlCache && opts.htmlCache.has(url)) {
      res = opts.htmlCache.get(url);
    } else {
      res = await fetchText(url, timeoutMs);
      if (opts.htmlCache) opts.htmlCache.set(url, res);
    }
    pages.push({ url, status: res.status, ok: Boolean(res.ok && !res.blocked) });
    if (!res.ok || res.blocked || !res.text) continue;
    const sourceUrl = res.url || url;

    trialBest = mergeTrial(res.text, sourceUrl, trialBest);

    const sessions = extractSessions(res.text, item.id || "prov");
    if (sessions.length > sessionsBest.length) sessionsBest = sessions;

    const hard = extractHardContacts(res.text);
    const soft = extractFromHtml(res.text, website);
    if (!phone && (hard.phones[0] || soft.phones[0])) phone = hard.phones[0] || soft.phones[0];
    if (!email && (hard.emails[0] || soft.emails[0])) email = hard.emails[0] || soft.emails[0];
    if (!imageUrl && soft.imageUrl) imageUrl = soft.imageUrl;
    if (soft.streetAddresses && soft.streetAddresses.length) {
      streetAddresses = [...new Set([...streetAddresses, ...soft.streetAddresses])].slice(0, 8);
    }

    const about = extractAboutEvidence(res.text);
    if (about.aboutText) {
      if (MARKETPLACE_HUB_COPY_RE.test(about.aboutText)) {
        // City-hub / discovery-directory homepage marketing — never beats venue meta.
      } else {
        const finalUrl = String(sourceUrl || url)
          .replace(/\/$/, "")
          .toLowerCase();
        const fromSeedUrl =
          finalUrl === seedUrlNorm ||
          finalUrl.startsWith(seedUrlNorm + "?") ||
          finalUrl.startsWith(seedUrlNorm + "#");
        const prefer =
          !aboutBest.aboutText ||
          (fromSeedUrl && !aboutBest.fromSeedUrl) ||
          (fromSeedUrl === aboutBest.fromSeedUrl &&
            about.aboutText.length > (aboutBest.aboutText || "").length);
        if (prefer) {
          aboutBest = { ...about, fromSeedUrl };
        }
      }
    }

    const price = extractPrice(res.text, sourceUrl);
    if (price && price.price && (!priceBest || (price.price.evidence === "stated" && priceBest.price.evidence !== "stated"))) {
      priceBest = price;
    }

    const ages = extractAgeRanges(res.text);
    if (ages.length > agesBest.length) agesBest = ages;
  }

  const fieldsFound = [];
  const out = {
    id: item.id,
    name: item.name,
    website,
    lane: "deep",
    pages: pages.filter((p) => p.ok).map((p) => p.url),
    pageAttempts: pages,
  };
  if (trialBest) {
    out.trialPolicy = trialBest.trialPolicy;
    out.sourceUrl = trialBest.sourceUrl;
    fieldsFound.push("trial");
  }
  if (sessionsBest.length) {
    out.sessions = sessionsBest;
    fieldsFound.push("sessions");
  }
  if (phone || email) {
    out.phone = phone || "";
    out.email = email || "";
    fieldsFound.push("contacts");
  }
  if (priceBest) {
    out.price = priceBest.price;
    if (typeof priceBest.pricePerClass === "number") out.pricePerClass = priceBest.pricePerClass;
    fieldsFound.push("price");
  }
  if (agesBest.length) {
    out.ageRanges = agesBest;
    fieldsFound.push("age");
  }
  if (imageUrl) out.imageUrl = imageUrl;
  if (streetAddresses.length) out.streetAddresses = streetAddresses;
  if (aboutBest.aboutText) {
    out.aboutText = aboutBest.aboutText;
    out.aboutSource = aboutBest.source;
    fieldsFound.push("description");
  }
  out.fieldsFound = fieldsFound;
  out.withEvidence = fieldsFound.length > 0;
  return out;
}

module.exports = {
  deepPaths,
  deepEnrichOfficialSite,
  fetchText,
};
