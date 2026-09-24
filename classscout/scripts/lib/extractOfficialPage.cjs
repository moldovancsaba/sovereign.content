/**
 * Official-page extractors for the catalog loop — evidence only.
 * Shared by Find, Improve lanes, and fixture tests.
 */
const CANONICAL_AGE_RANGES = Object.freeze(["0–2", "3–5", "6–8", "9–12", "Teens"]);

/** House number: plain digits, Queens hyphenates (67-09), or spelled One–Twelve. */
const HOUSE_NUMBER_RE =
  /^(?:\d{1,5}(?:-\d{1,2})?|(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve))\s+\S+/i;

/**
 * NYC street-type vocabulary (word-boundary). `Pl` without a period is allowed only after CSS
 * utility rejection below — bare `pl-2` must never pass.
 * `Way` is matched separately (capitalized street name only) so prose "the Brooklyn way" fails.
 */
const STREET_TYPE_RE =
  /\b(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Place|Pl\.?|Broadway|Parkway|Pkwy\.?|Plaza|Bowery|Court|Ct\.?|Terrace|Ter\.?|Concourse|Square|Circle|Cir\.?|Highway|Hwy\.?|Expressway|Expy\.?|Island)\b/i;

function hasStreetTypeToken(a) {
  if (STREET_TYPE_RE.test(a)) return true;
  return /\b[A-Z][A-Za-z0-9.'\-]*\s+Way\b/.test(a);
}

/** Strip JSON/HTML chrome that often trails a real street match (e.g. `Avenue"}`). */
function cleanStreetAddress(raw) {
  if (!raw || typeof raw !== "string") return "";
  let a = raw
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u002f/gi, "/")
    .replace(/\\n/g, " ");
  // Decode common entities before tag strip so `&lt;p&gt;` becomes removable markup.
  for (let i = 0; i < 3; i += 1) {
    const before = a;
    a = a
      .replace(/&#(\d+);/g, (_, code) => {
        const n = Number(code);
        return Number.isFinite(n) && n > 0 && n < 0x10ffff ? String.fromCodePoint(n) : " ";
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const n = parseInt(hex, 16);
        return Number.isFinite(n) && n > 0 && n < 0x10ffff ? String.fromCodePoint(n) : " ";
      })
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&");
    if (a === before) break;
  }
  a = a
    .replace(/<[^>]+>/g, " ")
    // JSON key bleed: `United States","email` or `Avenue"}}.` / `Boulevard".`
    .replace(/[\\]*["']\s*,\s*[\\]*["']?\s*(?:email|phone|address|url|website)\b.*$/i, "")
    .replace(/[\\]*["']+\s*(?:email|phone|address)\b.*$/i, "")
    // Strip trailing JSON braces/quotes — not possessive apostrophes (`Randall's Island`).
    .replace(/["}\\\]]+.*$/g, "")
    .replace(/^["{\\\[]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*$/g, "")
    .trim();

  // Venue-prefix peel: "Peter Jay Sharp Dock, 3579 Harlem River Drive…" → numbered street.
  if (a && !HOUSE_NUMBER_RE.test(a)) {
    const embedded = a.match(
      /(?:,\s*|\s+)(\d{1,5}(?:-\d{1,2})?\s+[A-Za-z].{6,})$/
    );
    if (embedded && HOUSE_NUMBER_RE.test(embedded[1].trim())) {
      a = embedded[1].trim();
    }
  }
  return a;
}

/** True when the cleaned street line is usable (ignores whether the raw storage form was dirty). */
function isUsableStreetLine(cleaned) {
  const a = String(cleaned || "").trim();
  if (a.length < 8 || a.length > 200) return false;
  if (/^(Brooklyn|Manhattan|Queens|Bronx|Staten Island|New York),?\s*NY\.?$/i.test(a)) return false;
  // CSS / utility-class scrap before street-token checks (so `pl-md-2` never looks like Place).
  if (
    /\b(?:grid|flex|d-flex|col-\d|md-col|sm-col|lg-col|xl-col|border(?:-left|-right|-top|-bottom)?(?:-md)?-\d|h-\d+|w-\d+|pl-\d+|pr-\d+|px-\d+|py-\d+|m[trblxy]?-\d+)\b/i.test(
      a
    )
  ) {
    return false;
  }
  if (/[{}<>]|class=|style=/i.test(a)) return false;
  if (/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i.test(a)) return false;
  if (/\bemail\b/i.test(a)) return false;
  // Dual-site blurbs are not a single deliverable street.
  if (/\band\s+\d{1,5}\b/i.test(a)) return false;
  if (/\b(minutes?|hours?|please|click|sign\s*up|register|schedule)\b/i.test(a)) return false;
  if (/\b(year|years|month|months|old|players?|students?|am:|pm:)\b/i.test(a)) return false;
  // Marketing / sentence scrap mistakenly treated as a street ("2025 and learn about…").
  if (/\b(learn|about|welcome|explore|discover)\b/i.test(a)) return false;
  if (/\bon\s+Broadway\b/i.test(a)) return false;
  if (/^(?:19|20)\d{2}\s+The\s+/i.test(a)) return false;
  // Venue marketing glued onto a street ("75 Richmond Terrace – home of the FerryHawks! As a ch").
  if (/\bhome of the\b/i.test(a)) return false;
  if (/[–—].{0,40}\b(home|hawks|yankees|mets|ferry|stadium|arena)\b/i.test(a)) return false;
  if (/\bas a ch\b/i.test(a)) return false;
  // Truncated sentence chrome after a street token.
  if (/\b(?:street|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|terrace|ter\.?)\b.+\b(?:as a|is a|was a|for the|with the)\b/i.test(a)) {
    return false;
  }

  if (HOUSE_NUMBER_RE.test(a) && hasStreetTypeToken(a)) return true;

  // Intersection / corner form without a house number (park field venues).
  // Requires two street-ish sides joined by & / and / at, plus a NYC place token.
  if (
    a.length >= 12 &&
    /\b(?:NY|New York|Brooklyn|Manhattan|Queens|Bronx|Staten Island|\d{5})\b/i.test(a) &&
    /\s+(?:&|and|at|@)\s+/i.test(a) &&
    hasStreetTypeToken(a)
  ) {
    const parts = a.split(/\s+(?:&|and|at|@)\s+/i);
    const streetish = (p) =>
      hasStreetTypeToken(p) ||
      /\b(?:West|East|North|South|W\.?|E\.?|N\.?|S\.?)\s+\d{1,3}(?:st|nd|rd|th)?\b/i.test(p);
    if (parts.filter(streetish).length >= 2) return true;
  }
  return false;
}

function hasStreetAddress(addr) {
  if (!addr || typeof addr !== "string") return false;
  // Reject dirty storage forms so Improve rewrites them (entities, JSON scrap, markup).
  if (/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i.test(addr) || /<[^>]+>/.test(addr)) return false;
  if (/[\\]*["'].*(?:email|phone)\b/i.test(addr) || /["'}{\\]]/.test(addr)) return false;
  return isUsableStreetLine(cleanStreetAddress(addr));
}

/**
 * Prefer a street that matches the seed's borough / neighborhood / NYC tokens.
 * Candidates are cleaned; unusable strings are dropped.
 */
function pickStreetAddress(candidates, seed = {}) {
  const cleaned = [];
  for (const c of candidates || []) {
    const a = cleanStreetAddress(c);
    if (isUsableStreetLine(a) && !cleaned.includes(a)) cleaned.push(a);
  }
  if (!cleaned.length) return "";
  const borough = String(seed.borough || "").toLowerCase();
  const neighborhood = String(seed.neighborhood || "").toLowerCase();
  const preferNyc = (a) => /brooklyn|manhattan|new york|\bny\b/i.test(a);
  const preferBorough = (a) => (borough ? a.toLowerCase().includes(borough) : false);
  const preferNeighborhood = (a) => {
    if (!neighborhood || neighborhood === borough) return false;
    const tokens = neighborhood.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
    const hay = a.toLowerCase();
    return tokens.length > 0 && tokens.every((t) => hay.includes(t));
  };
  const scored = cleaned.map((a, index) => {
    let score = 0;
    if (preferNeighborhood(a)) score += 50;
    if (preferBorough(a)) score += 30;
    if (preferNyc(a)) score += 10;
    // Soft city/ZIP bonus — must not overturn a homepage JSON-LD stub ("273 Bowery")
    // in favor of a national HQ footer line found later in deep enrich.
    if (/,\s*(Brooklyn|Manhattan|New York)/i.test(a)) score += 2;
    if (/\b11\d{3}\b|\b10\d{3}\b/.test(a)) score += 1;
    // Homepage / earlier candidates beat footer HQ addresses from later deep pages.
    score += Math.max(0, 50 - index * 20);
    // Soft penalty when the seed names a borough and the candidate names a different one.
    if (borough) {
      const named = [];
      if (/\bbrooklyn\b/i.test(a)) named.push("brooklyn");
      if (/\bqueens\b/i.test(a)) named.push("queens");
      if (/\bbronx\b/i.test(a)) named.push("bronx");
      if (/\bstaten island\b/i.test(a)) named.push("staten island");
      if (/\bmanhattan\b/i.test(a)) named.push("manhattan");
      if (named.length && !named.includes(borough)) score -= 40;
    }
    return { a, score, index };
  });
  scored.sort((x, y) => y.score - x.score || x.index - y.index);
  return scored[0].a;
}

function normalizePhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  let n = "";
  if (digits.length === 10) n = `+1${digits}`;
  else if (digits.length === 11 && digits.startsWith("1")) n = `+${digits}`;
  else if (String(raw).startsWith("+") && digits.length >= 10 && digits.length <= 15) n = `+${digits}`;
  if (!n) return "";
  // US NANP: country 1 + area code cannot start with 0 or 1.
  if (n.startsWith("+1") && n.length === 12) {
    const area = n.slice(2, 5);
    if (/^[01]/.test(area)) return "";
  }
  return n;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFromHtml(html, website) {
  const out = {
    phones: [],
    emails: [],
    imageUrl: "",
    title: "",
    streetAddresses: [],
    trialSnippets: [],
  };
  if (!html) return out;

  const ogImage =
    html.match(/property=["']og:image["'][^>]*content=["']([^"']+)/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogImage) out.imageUrl = ogImage[1].replace(/&amp;/g, "&");

  const title =
    html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title) out.title = title[1].replace(/\s+/g, " ").trim().slice(0, 160);

  const phoneHits = html.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
  const phoneSet = new Set();
  for (const p of phoneHits) {
    const n = normalizePhone(p);
    if (n && n.startsWith("+1") && n.length === 12) phoneSet.add(n);
  }
  out.phones = [...phoneSet].slice(0, 4);

  const emailHits = html.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  const emailSet = new Set();
  for (const e of emailHits) {
    const low = e.toLowerCase();
    if (low.endsWith(".png") || low.endsWith(".jpg") || low.endsWith(".css") || low.endsWith(".js")) continue;
    if (low.includes("sentry") || low.includes("wixpress") || low.includes("example.com")) continue;
    if (low.includes("wordpress") || low.includes("schema.org")) continue;
    emailSet.add(e);
  }
  out.emails = [...emailSet].slice(0, 4);

  const addrPatterns = [
    // Bare Broadway / Bowery — stop before "and 890 Broadway" dual-site blurbs.
    /(\d{1,5}(?:-\d{1,2})?\s+(?:Broadway|Bowery)\b(?:\s*,\s*(?:New York|Brooklyn|Manhattan|NY)[^<\n]{0,40})?)/gi,
    /(\d{1,5}(?:-\d{1,2})?\s+[A-Za-z0-9.'\-]+(?:\s+[A-Za-z0-9.'\-]+){0,5}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Place|Pl|Way|Broadway|Parkway|Pkwy|Bowery|Court|Ct|Terrace|Ter|Concourse|Square|Circle|Cir)\.?[^<\n,]{0,40}(?:,?\s*(?:New York|Brooklyn|NY)[^<\n]{0,30})?)/gi,
    /(\d{1,5}(?:-\d{1,2})?\s+(?:West|East|North|South|W\.?|E\.?|N\.?|S\.?)\s+\d{1,3}(?:st|nd|rd|th)?\s+(?:Street|St\.?)[^<\n,]{0,40})/gi,
  ];
  const addrSet = new Set();
  for (const re of addrPatterns) {
    for (const m of html.matchAll(re)) {
      const a = cleanStreetAddress(m[1]);
      // Drop dual-site blurbs ("280 Broadway … and 890 Broadway").
      if (/\band\s+\d{1,5}\b/i.test(a)) continue;
      if (hasStreetAddress(a)) addrSet.add(a.slice(0, 200));
    }
  }
  // JSON-LD PostalAddress — common on YMCA / institution location pages.
  for (const m of html.matchAll(/"streetAddress"\s*:\s*"([^"]{5,120})"/gi)) {
    const a = cleanStreetAddress(m[1]);
    if (hasStreetAddress(a)) addrSet.add(a.slice(0, 200));
  }
  for (const m of html.matchAll(
    /itemprop=["']streetAddress["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*itemprop=["']streetAddress["']/gi
  )) {
    const a = cleanStreetAddress(m[1] || m[2] || "");
    if (hasStreetAddress(a)) addrSet.add(a.slice(0, 200));
  }
  out.streetAddresses = [...addrSet].slice(0, 8);

  // Match trial language on stripped text so attribute chrome like FREE TRIAL CLASS"> never lands.
  const plain = stripHtml(html);
  const trialRe =
    /((?:free\s+(?:intro|trial|first)\s+class)|(?:first\s+(?:visit|class)\s+is\s+free)|(?:trial\s+class)|(?:guest\s+experience)|(?:drop\s+in\s+anytime)|(?:sibling\s+discount))[^.!?]{0,120}/gi;
  for (const m of plain.matchAll(trialRe)) {
    const snip = m[0].replace(/\s+/g, " ").trim().slice(0, 240);
    if (snip && !/[<>]|["']\s*>/.test(snip)) out.trialSnippets.push(snip);
  }

  if (!out.imageUrl) {
    const abs = html.match(/https?:\/\/[^"' ]+\.(?:jpg|jpeg|png|webp)(?:\?[^"' ]*)?/gi);
    if (abs) {
      const prefer = abs.find(
        (u) => /upload|media|wp-content|cdn|images/i.test(u) && !/logo|icon|sprite|favicon/i.test(u)
      );
      out.imageUrl = prefer || abs[0];
    }
  }

  out.imageUrl = absoluteUrl(out.imageUrl, website);
  return out;
}

/** Resolve relative og:image / img paths against the page URL. Empty → "". */
function absoluteUrl(maybeUrl, base) {
  const raw = String(maybeUrl || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!base) return raw.startsWith("//") ? `https:${raw}` : "";
  try {
    return new URL(raw, base).href;
  } catch {
    return "";
  }
}

/** tel: / mailto: / schema.org Telephone + email — never invent. */
function extractHardContacts(html) {
  const phones = new Set();
  const emails = new Set();
  if (!html) return { phones: [], emails: [] };

  for (const m of html.matchAll(/href=["']tel:([^"']+)["']/gi)) {
    const n = normalizePhone(decodeURIComponent(m[1]));
    if (n && n.startsWith("+1") && n.length === 12) phones.add(n);
  }
  for (const m of html.matchAll(/href=["']mailto:([^"'?]+)/gi)) {
    const e = decodeURIComponent(m[1]).trim().toLowerCase();
    if (e.includes("@") && !e.includes("example.com") && !e.includes("sentry")) emails.add(e);
  }
  for (const m of html.matchAll(
    /"telephone"\s*:\s*"([^"]+)"|"email"\s*:\s*"([^"]+)"/gi
  )) {
    if (m[1]) {
      const n = normalizePhone(m[1]);
      if (n && n.startsWith("+1") && n.length === 12) phones.add(n);
    }
    if (m[2]) {
      const e = m[2].trim().toLowerCase();
      if (e.includes("@") && !e.includes("example.com")) emails.add(e);
    }
  }
  return { phones: [...phones].slice(0, 4), emails: [...emails].slice(0, 4) };
}

/**
 * Conservative session extraction — only dated blocks with a title-like phrase.
 * @returns {Array<{id:string,title:string,startDate?:string,endDate?:string,sourceText:string}>}
 */
function extractSessions(html, providerId) {
  const text = stripHtml(html);
  if (!text || text.length < 40) return [];
  const sessions = [];
  const seen = new Set();
  // e.g. "Fall Session: September 8 – November 21, 2026" or "Session runs Sep 8 - Nov 21 2026"
  const re =
    /\b((?:Fall|Winter|Spring|Summer|Spring\/Summer|Fall\/Winter)?\s*(?:Session|Term|Semester|Camp)\b[^.]{0,80}?(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?(?:\s*[–\-—to]+\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)?)/gi;
  let m;
  let i = 0;
  while ((m = re.exec(text)) && i < 6) {
    const sourceText = m[1].replace(/\s+/g, " ").trim().slice(0, 240);
    if (sourceText.length < 20) continue;
    const key = sourceText.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    const year = (sourceText.match(/\b(20\d{2})\b/) || [])[1];
    const months = {
      january: "01",
      jan: "01",
      february: "02",
      feb: "02",
      march: "03",
      mar: "03",
      april: "04",
      apr: "04",
      may: "05",
      june: "06",
      jun: "06",
      july: "07",
      jul: "07",
      august: "08",
      aug: "08",
      september: "09",
      sep: "09",
      sept: "09",
      october: "10",
      oct: "10",
      november: "11",
      nov: "11",
      december: "12",
      dec: "12",
    };
    const dateBits = [
      ...sourceText.matchAll(
        /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?/gi
      ),
    ];
    let startDate;
    let endDate;
    if (dateBits.length >= 1) {
      const mo = months[dateBits[0][1].toLowerCase()];
      const day = String(dateBits[0][2]).padStart(2, "0");
      const y = dateBits[0][3] || year;
      if (mo && y) startDate = `${y}-${mo}-${day}`;
    }
    if (dateBits.length >= 2) {
      const mo = months[dateBits[1][1].toLowerCase()];
      const day = String(dateBits[1][2]).padStart(2, "0");
      const y = dateBits[1][3] || year;
      if (mo && y) endDate = `${y}-${mo}-${day}`;
    }
    if (!startDate) continue;
    const titleMatch = sourceText.match(
      /^((?:Fall|Winter|Spring|Summer|Spring\/Summer|Fall\/Winter)?\s*(?:Session|Term|Semester|Camp)[^:]{0,40})/i
    );
    const title = (titleMatch ? titleMatch[1] : sourceText.slice(0, 60)).trim();
    i += 1;
    sessions.push({
      id: `${providerId || "prov"}-sess-${startDate.replace(/-/g, "")}-${i}`,
      title: title.slice(0, 120),
      startDate,
      ...(endDate ? { endDate } : {}),
      sourceText,
    });
  }

  // Age-banded class blocks with a concrete start date nearby (e.g. "ages 5-9 … September 12").
  if (sessions.length < 6) {
    const ageClassRe =
      /\b((?:ages?\s+\d{1,2}\s*[–\-to]+\s*\d{1,2}|\d{1,2}\s*[–\-]\s*\d{1,2}\s+year\s+olds?)[^.]{0,100}?(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*20\d{2})?)/gi;
    let am;
    while ((am = ageClassRe.exec(text)) && sessions.length < 6) {
      const sourceText = am[1].replace(/\s+/g, " ").trim().slice(0, 240);
      const key = sourceText.toLowerCase().slice(0, 80);
      if (seen.has(key) || sourceText.length < 24) continue;
      const year = (sourceText.match(/\b(20\d{2})\b/) || [])[1];
      const months = {
        january: "01", jan: "01", february: "02", feb: "02", march: "03", mar: "03",
        april: "04", apr: "04", may: "05", june: "06", jun: "06", july: "07", jul: "07",
        august: "08", aug: "08", september: "09", sep: "09", sept: "09",
        october: "10", oct: "10", november: "11", nov: "11", december: "12", dec: "12",
      };
      const dm = sourceText.match(
        /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d{2}))?/i
      );
      if (!dm) continue;
      const mo = months[dm[1].toLowerCase()];
      const day = String(dm[2]).padStart(2, "0");
      const y = dm[3] || year;
      if (!mo || !y) continue;
      const startDate = `${y}-${mo}-${day}`;
      seen.add(key);
      sessions.push({
        id: `${providerId || "prov"}-sess-age-${startDate.replace(/-/g, "")}-${sessions.length + 1}`,
        title: sourceText.slice(0, 80),
        startDate,
        sourceText,
      });
    }
  }
  return sessions;
}

/**
 * Stated price or free — never invent an amount.
 * Accepts "$X per class/session/week/month", "$X/mo", and "$X for N weeks" session packages.
 * @returns {{price: object, pricePerClass?: number}|null}
 */
function extractPrice(html, sourceUrl) {
  const text = stripHtml(html);
  if (!text) return null;
  if (
    /\b((?:classes?\s+are\s+free)|(?:free\s+class(?:es)?\s+(?:every|on|for|each))|(?:free\s+(?:drop[-\s]?in|admission))|(?:complimentary\s+class)|(?:no\s+charge\s+for\s+(?:class|classes|drop)))\b/i.test(
      text
    )
  ) {
    const idx = text
      .toLowerCase()
      .search(
        /classes?\s+are\s+free|free\s+class(?:es)?\s+(?:every|on|for|each)|free\s+drop|complimentary\s+class|no\s+charge\s+for/
      );
    const sourceText = text.slice(Math.max(0, idx), Math.max(0, idx) + 100).trim().slice(0, 200);
    // Do not treat "try a free class" / free trial marketing as a free price — that is trialPolicy.
    if (!/\btry\s+a\s+free\b|\bfree\s+trial\b|\bfree\s+intro\b/i.test(sourceText)) {
      return {
        price: {
          evidence: "stated_free",
          sourceText,
          sourceUrl,
          observedAt: new Date().toISOString(),
        },
        pricePerClass: 0,
      };
    }
  }

  const patterns = [
    /\$\s*(\d{1,4}(?:\.\d{2})?)\s*(?:\/\s*|\s+per\s+)(class|session|week|month|visit|day)\b/i,
    /\$\s*(\d{1,4}(?:\.\d{2})?)\s*\/\s*(mo|month)\b/i,
    /\$\s*(\d{1,4}(?:\.\d{2})?)\s+(?:for|\/)\s*(?:a\s+)?(\d{1,2})\s*-?\s*weeks?\b/i,
    /(?:are|is|tuition(?:\s+is)?|cost(?:s)?|priced?\s+at)\s+\$\s*(\d{1,4}(?:\.\d{2})?)\b/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const amount = Math.round(Number(m[1]));
    if (!Number.isFinite(amount) || amount < 0 || amount > 50000) continue;
    let unit = null;
    if (m[2]) {
      const u = String(m[2]).toLowerCase();
      if (u === "class") unit = "class";
      else if (u === "session") unit = "session";
      else if (u === "week") unit = "week";
      else if (u === "month" || u === "mo") unit = "month";
      else if (u === "day") unit = "day";
      else if (u === "visit") unit = "visit";
      else if (/^\d+$/.test(u)) unit = "session"; // "$375 for 10 weeks"
    }
    const idx = m.index || 0;
    const sourceText = text.slice(idx, idx + m[0].length + 48).trim().slice(0, 200);
    return {
      price: {
        amount,
        currency: "USD",
        ...(unit ? { unit } : {}),
        evidence: "stated",
        sourceText,
        sourceUrl,
        observedAt: new Date().toISOString(),
      },
      pricePerClass: unit === "class" ? amount : amount,
    };
  }
  return null;
}

/** Map stated age copy onto closed CURATOR_AGE_RANGES only. */
function extractAgeRanges(html) {
  const text = stripHtml(html);
  if (!text) return [];
  const found = new Set();
  const pushRange = (lo, hi) => {
    const a = Number(lo);
    const b = Number(hi);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a > b || a < 0 || b > 18) return;
    for (let n = a; n <= b; n++) {
      if (n <= 2) found.add("0–2");
      else if (n <= 5) found.add("3–5");
      else if (n <= 8) found.add("6–8");
      else if (n <= 12) found.add("9–12");
      else found.add("Teens");
    }
  };
  for (const m of text.matchAll(/\bages?\s+(\d{1,2})\s*[–\-to]+\s*(\d{1,2})\b/gi)) {
    pushRange(m[1], m[2]);
  }
  for (const m of text.matchAll(/\bfor\s+ages?\s+(\d{1,2})\s*[–\-to]+\s*(\d{1,2})\b/gi)) {
    pushRange(m[1], m[2]);
  }
  if (/\bteens?\b/i.test(text) && /\b(ages?|years?\s+old|youth)\b/i.test(text)) found.add("Teens");
  return CANONICAL_AGE_RANGES.filter((r) => found.has(r));
}

function buildTrialPolicy(snippets) {
  if (!snippets || !snippets.length) return null;
  const joined = snippets.join(" | ").toLowerCase();
  const policy = { sourceText: snippets[0].slice(0, 500) };
  if (
    /free\s+(intro|trial|first)|first\s+(visit|class)\s+is\s+free|guest\s+experience|try\s+a\s+free\s+class|try\s+us\s+out\s+free/.test(
      joined
    )
  ) {
    policy.trialAvailable = true;
    policy.trialIsFree = true;
  } else if (/trial\s+class|try\s+a\s+class/.test(joined)) {
    policy.trialAvailable = true;
  }
  if (/drop\s+in\s+anytime/.test(joined)) policy.dropInAllowed = true;
  if (/sibling\s+discount/.test(joined)) policy.siblingDiscount = true;
  const keys = Object.keys(policy).filter((k) => k !== "sourceText");
  return keys.length ? policy : null;
}

/** Trial false-positive filter (same discipline as apply-trial-fix). */
function isBadTrialPolicy(policy) {
  const st = String((policy && policy.sourceText) || "").toLowerCase().trim();
  if (!st) return true;
  // HTML/attribute leftovers (e.g. FREE TRIAL CLASS">) or punctuation-only scraps.
  if (/[<>]|["']\s*>|\\["']/.test(st)) return true;
  if (st.length < 12) return true;
  // Bare "trial class?" / "trial class" with no offer framing is nav/FAQ chrome, not a policy.
  if (/^\s*trial\s+class\s*[?]?\s*$/i.test(st)) return true;
  if (/time trial\b/.test(st) && !/\btrial class\b/.test(st) && !/\bfree trial\b/.test(st)) return true;
  if (/drop-in play/.test(st) && !/\btrial\b/.test(st)) return true;
  if (/supportfreetrial|currencart|specs\.stores/.test(st)) return true;
  if (
    /brought my (daughter|son|kid) for a trial/.test(st) &&
    !/\bwe offer\b/.test(st) &&
    !/\bfree trial class\b/.test(st)
  ) {
    return true;
  }
  return false;
}

function stripBirthdayCopy(text) {
  return String(text || "")
    .replace(/\bbirthday parties\b/gi, "family events")
    .replace(/\bbirthday party\b/gi, "family event")
    .replace(/\bbirthdays\b/gi, "family events")
    .replace(/\bbirthday\b/gi, "family");
}

module.exports = {
  CANONICAL_AGE_RANGES,
  cleanStreetAddress,
  hasStreetAddress,
  isUsableStreetLine,
  pickStreetAddress,
  normalizePhone,
  stripHtml,
  extractFromHtml,
  extractHardContacts,
  extractSessions,
  extractPrice,
  extractAgeRanges,
  buildTrialPolicy,
  isBadTrialPolicy,
  stripBirthdayCopy,
  absoluteUrl,
};
