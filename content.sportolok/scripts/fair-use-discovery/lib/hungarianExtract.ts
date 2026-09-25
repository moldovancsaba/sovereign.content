/**
 * Hungarian-specific fact extraction from HTML
 * Fair-use: extract structured facts, never verbatim copyrighted copy
 */

import type { Candidate } from "./common";

export interface ExtractOptions {
  sourceId: string;
  sourceUrl: string;
  territory: string;
  activityTypes: string[];
}

const JUNK_TITLES = [
  /^fürdőhelyek itt/i,
  /^főoldal/i,
  /^magyar uszodák/i,
  /^nsü$/i,
  /^keresés/i,
];

/**
 * Route to the right extractor based on URL / markup.
 * Detail pages first — listing pages also embed nearby `.pcard`s which must NOT win.
 */
export function extractHungarianSportFacility(
  html: string,
  url: string,
  opts: ExtractOptions
): Candidate[] {
  if (/magyaruszodak\.hu\/uszoda\//i.test(url)) {
    const detail = extractMagyarUszodakDetail(html, url, opts);
    if (detail.length) return detail;
  }

  if (/nsu\.hu\/letesitmeny\//i.test(url) || /Helyszín:/i.test(html)) {
    const detail = extractNsuFacilityDetail(html, url, opts);
    if (detail.length) return detail;
  }

  if (/nsu\.hu\/letesitmenyek\//i.test(url)) {
    const listing = extractNsuCategoryListing(html, url, opts);
    if (listing.length) return listing;
  }

  if (
    /budapest13\.hu\/intezmeny-kategoria\//i.test(url) ||
    /class="card-text card-white"/i.test(html)
  ) {
    const cards = extractBp13InstitutionCards(html, url, opts);
    if (cards.length) return cards;
  }

  if (
    /ujpest\.hu\/sport/i.test(url) ||
    /önkormányzati tulajdonú sportlétesítmények/i.test(html) ||
    /onkormanyzati tulajdonu sportletesitmenyek/i.test(html)
  ) {
    const venues = extractUjpestSportVenues(html, url, opts);
    if (venues.length) return venues;
  }

  if (
    /hegyvideksport\.hu/i.test(url) ||
    /obudasport\.hu\/letesitmenyeink/i.test(url)
  ) {
    const muni = extractMunicipalSportCompany(html, url, opts);
    if (muni.length) return muni;
  }

  if (
    /oktatas-neveles\/iskolak/i.test(url) ||
    /intezmeny-kategoria\/altalanos-iskolak/i.test(url) ||
    /intezmeny-kategoria\/kozepiskolak/i.test(url)
  ) {
    const schools = extractSchoolDirectory(html, url, opts);
    if (schools.length) return schools;
  }

  if (/magyaruszodak\.hu/i.test(url) || /class="pcard"/i.test(html)) {
    const cards = extractMagyarUszodakCards(html, url, opts);
    if (cards.length) return cards;
  }

  return extractSinglePageFallback(html, url, opts);
}

/**
 * NSÜ category listing HTML (/letesitmenyek/uszodak|tanuszodak|sportletesitmenyek|…)
 * Detail URLs only — titles from slug / nearby heading when present.
 */
export function extractNsuCategoryListing(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 50
): Candidate[] {
  const links = [
    ...html.matchAll(/href="(https:\/\/nsu\.hu\/letesitmeny\/[^"#?]+)"/gi),
  ].map((m) => m[1].replace(/\/$/, "") + "/");
  const unique = [...new Set(links)];
  const out: Candidate[] = [];
  for (const discoveryUrl of unique) {
    if (out.length >= limit) break;
    const slug = discoveryUrl.split("/letesitmeny/")[1]?.replace(/\/$/, "") || "";
    const title = cleanText(
      slug
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
    if (!title || title.length < 4) continue;
    out.push({
      seedId: generateSeedId(title, discoveryUrl),
      sourceId: opts.sourceId,
      discoveryUrl,
      territory: opts.territory,
      activityType: detectActivityType(pageUrl + " " + title, title, opts.activityTypes),
      title,
      address: undefined,
      contact: {},
      extractedFacts: {
        hasPhone: false,
        hasEmail: false,
        hasAddress: false,
        from: "nsu-category-html",
        categoryUrl: pageUrl,
      },
      confidence: "medium",
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

/**
 * Budapest XIII. kerület institution cards (sport színterek, schools, …)
 */
export function extractBp13InstitutionCards(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 40
): Candidate[] {
  const out: Candidate[] = [];
  const blocks = html.split(/class="card-text card-white"/i).slice(1);
  for (const block of blocks) {
    if (out.length >= limit) break;
    const title = cleanText(
      block.match(/card-text__title[^>]*>([\s\S]*?)<\//i)?.[1] || ""
    );
    if (!title || title.length < 4 || isJunkTitle(title)) continue;

    const addrMatch =
      block.match(/query=(\d{4}\s+[^"&]+)/i)?.[1] ||
      block.match(/(\d{4}\s+(?:Budapest|Velence)[^<]{5,80})/i)?.[1];
    const address = addrMatch
      ? cleanText(decodeURIComponent(addrMatch)).replace(/&amp;/g, "&")
      : undefined;

    const phone =
      cleanText(
        block.match(/information-row__text[^>]*>\s*(\d{1,3}[\/\-\s]?\d{3}[-\s]?\d{3,4})\s*</i)?.[1] ||
          ""
      ) || undefined;

    const website = block.match(
      /href="(https?:\/\/(?:www\.)?sport13\.hu\/[^"]+)"/i
    )?.[1];

    const isSchool = /iskola|gimnázium|óvoda/i.test(title);
    const activityType = isSchool
      ? "school-sport"
      : detectActivityType(title, title, opts.activityTypes);

    out.push({
      seedId: generateSeedId(title, address || pageUrl),
      sourceId: opts.sourceId,
      discoveryUrl: website || pageUrl,
      territory: opts.territory,
      activityType,
      title,
      address: address ? (/hungary$/i.test(address) ? address : `${address}, Hungary`) : undefined,
      contact: { phone, website },
      extractedFacts: {
        hasPhone: !!phone,
        hasEmail: false,
        hasAddress: !!address,
        from: "bp13-institution-card",
        schoolLinked: isSchool,
      },
      confidence: calculateConfidence({ title, address, phone }),
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

const FACILITY_NAME =
  /\b(uszoda|tanuszoda|sportközpont|sportcent|sporttelep|csarnok|stadion|pálya|palya|strand|fürdő|jégcentrum|jegcentrum|sípálya|sipalya|grund|munkacsarnok|sportbázis|szabadidőpark|pihenőpark|tornaterem|vendégház|motel)\b/i;
const CLUB_ONLY =
  /\b(egyesület|egyesulet|\bse\b|\bdse\b|sportkör|sportegylet|alapítvány|klub)\b/i;

function isCleanLabel(label: string): boolean {
  if (!label || label.length < 4 || label.length > 90) return false;
  if (/[{};]|function|wpemoji|font-size|!important/i.test(label)) return false;
  return true;
}

function normKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Újpest Önkormányzat sport institutions — prefer létesítmények over clubs.
 * Also keep school Diáksport entries as school-sport seeds.
 */
export function extractUjpestSportVenues(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 40
): Candidate[] {
  const out: Candidate[] = [];
  const headings = [
    ...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi),
  ].map((m) => cleanText(m[1]));

  for (const title of headings) {
    if (out.length >= limit) break;
    if (!title || title.length < 5) continue;
    const isFacility = FACILITY_NAME.test(title);
    const isSchoolSport =
      /diáksport|diaksport|iskola|gimnázium/i.test(title) && CLUB_ONLY.test(title);
    if (!isFacility && !isSchoolSport) continue;
    if (isJunkTitle(title)) continue;

    out.push({
      seedId: generateSeedId(title, pageUrl),
      sourceId: opts.sourceId,
      discoveryUrl: pageUrl,
      territory: opts.territory,
      activityType: isSchoolSport
        ? "school-sport"
        : detectActivityType(title, title, opts.activityTypes),
      title,
      address: "Budapest IV, Hungary",
      contact: {},
      extractedFacts: {
        hasPhone: false,
        hasEmail: false,
        hasAddress: true,
        locality: "Budapest",
        from: "ujpest-onkormanyzat-sport",
        venueKind: isFacility ? "municipal-facility" : "school-sport-club",
      },
      confidence: isFacility ? "medium" : "low",
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

/**
 * Municipal sport companies (Hegyvidéki Sportközpont, Óbudai Sport, …)
 */
export function extractMunicipalSportCompany(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 20
): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const origin = pageUrl.match(/^https?:\/\/[^/]+/)?.[0] || "";

  const push = (title: string, discoveryUrl: string) => {
    if (out.length >= limit) return;
    if (!isCleanLabel(title)) return;
    if (!FACILITY_NAME.test(title)) return;
    const key = normKey(title);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({
      seedId: generateSeedId(title, discoveryUrl),
      sourceId: opts.sourceId,
      discoveryUrl,
      territory: opts.territory,
      activityType: detectActivityType(title, title, opts.activityTypes),
      title,
      address: opts.territory === "HUN-BUD" ? "Budapest, Hungary" : undefined,
      contact: { website: discoveryUrl },
      extractedFacts: {
        hasPhone: false,
        hasEmail: false,
        hasAddress: opts.territory === "HUN-BUD",
        from: "municipal-sport-company",
      },
      confidence: "medium",
      discoveredAt: new Date().toISOString(),
    });
  };

  for (const hm of html.matchAll(/<h[23][^>]*>([^<]+)<\/h[23]>/gi)) {
    push(cleanText(hm[1]), pageUrl);
  }

  // Prefer short link labels to known facility paths
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1];
    let label = cleanText(m[2]);
    if (
      !/letesitmen|tanuszoda|sportpalya|tornaterem|szabadido|strand|vendeghaz|motel|pihenopark|uszoda/i.test(
        href + " " + label
      )
    ) {
      continue;
    }
    let discoveryUrl = href;
    if (discoveryUrl.startsWith("/")) discoveryUrl = origin + discoveryUrl;
    if (!/^https?:\/\//i.test(discoveryUrl)) continue;
    if (!isCleanLabel(label)) {
      // Derive from path: /letesitmenyeink/obudai-strand → Óbudai Strand
      const slug = discoveryUrl.split("/").filter(Boolean).pop() || "";
      if (!/letesitmen|tanuszoda|sportpalya|tornaterem|szabadido|strand|vendeghaz|motel|pihenopark/i.test(slug) && !FACILITY_NAME.test(slug)) {
        continue;
      }
      label = cleanText(slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    }
    if (!isCleanLabel(label)) continue;
    push(label, discoveryUrl);
  }


  return out;
}

/**
 * School directories (Hegyvidék iskolák, BP13 általános/középiskolák, …)
 * Schools are seeds for school-sport / gym access — deepen later for halls.
 */
export function extractSchoolDirectory(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 40
): Candidate[] {
  // Prefer structured BP13 cards when present
  const cards = extractBp13InstitutionCards(html, pageUrl, {
    ...opts,
    activityTypes: ["school-sport", ...opts.activityTypes],
  }, limit);
  if (cards.length) {
    return cards.map((c) => ({
      ...c,
      activityType: "school-sport",
      extractedFacts: { ...c.extractedFacts, schoolLinked: true, from: "school-directory" },
    }));
  }

  const out: Candidate[] = [];
  const seen = new Set<string>();
  const headingRe = /<h[23][^>]*>([^<]*(?:Iskola|Gimnázium|Szakközép|Technikum)[^<]*)<\/h[23]>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = headingRe.exec(html)) !== null && out.length < limit) {
    const title = cleanText(hm[1]);
    if (!title || title.length < 8) continue;
    if (seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    out.push({
      seedId: generateSeedId(title, pageUrl),
      sourceId: opts.sourceId,
      discoveryUrl: pageUrl,
      territory: opts.territory,
      activityType: "school-sport",
      title,
      address: "Budapest, Hungary",
      contact: {},
      extractedFacts: {
        hasPhone: false,
        hasEmail: false,
        hasAddress: true,
        schoolLinked: true,
        from: "school-directory-heading",
      },
      confidence: "low",
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

/**
 * Magyar Uszodák facility detail — PublicSwimmingPool JSON-LD + Cím eyebrow.
 * Never use nearby `.pcard` listings on the same page.
 */
export function extractMagyarUszodakDetail(
  html: string,
  url: string,
  opts: ExtractOptions
): Candidate[] {
  const pool = parseJsonLdPublicPool(html);
  const h1 = cleanText(html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] || "");
  const og = cleanText(
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] || ""
  );
  const title = cleanText(pool?.name || h1 || og.split("|")[0] || "");
  if (!title || isJunkTitle(title) || title.length < 4) return [];

  const streetFromLd = cleanText(pool?.streetAddress || "");
  const postal = cleanText(pool?.postalCode || "");
  const locality = cleanText(pool?.addressLocality || "Budapest") || "Budapest";

  const cimEyebrow =
    cleanText(
      html.match(
        /<div class="eyebrow">\s*Cím\s*<\/div>\s*<div>([^<]+)<\/div>/i
      )?.[1] || ""
    ) || undefined;

  let address: string | undefined;
  if (streetFromLd && postal) {
    address = `${postal} ${locality}, ${streetFromLd}, Hungary`;
  } else if (streetFromLd) {
    address = `${streetFromLd}, ${locality}, Hungary`;
  } else if (cimEyebrow && !/^budapest,?\s*budapest$/i.test(cimEyebrow)) {
    // "272 Királyok útja, Budapest, Budapest" → keep; skip locality-only chrome
    address = /hungary$/i.test(cimEyebrow) ? cimEyebrow : `${cimEyebrow}, Hungary`;
  } else if (postal) {
    address = `${postal} ${locality}, Hungary`;
  } else {
    address = `${locality}, Hungary`;
  }

  const phone =
    cleanText(
      html.match(
        /<div class="eyebrow">\s*Telefon\s*<\/div>\s*<div>([^<]+)<\/div>/i
      )?.[1] ||
        pool?.telephone ||
        html.match(/(\+36[\s\d]{8,18})/)?.[1] ||
        ""
    ) || undefined;

  const email =
    html.match(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase();

  const streetLevel = !!(streetFromLd || (cimEyebrow && /\d/.test(cimEyebrow)));

  return [
    {
      seedId: generateSeedId(title, address || url),
      sourceId: opts.sourceId,
      discoveryUrl: url,
      territory: opts.territory,
      activityType: detectActivityType(html, title, opts.activityTypes),
      title,
      address,
      contact: { phone, email },
      extractedFacts: {
        hasPhone: !!phone,
        hasEmail: !!email,
        hasAddress: !!address,
        streetLevel,
        postalCode: postal || undefined,
        locality,
        from: "magyaruszodak-detail-jsonld",
      },
      confidence: streetLevel || phone ? "high" : address ? "medium" : "low",
      discoveredAt: new Date().toISOString(),
    },
  ];
}

type PoolAddress = {
  name?: string;
  streetAddress?: string;
  addressLocality?: string;
  postalCode?: string;
  telephone?: string;
};

function parseJsonLdPublicPool(html: string): PoolAddress | null {
  const blocks = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!blocks) return null;
  for (const block of blocks) {
    const raw = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    try {
      const data = JSON.parse(raw) as Record<string, unknown> | Record<string, unknown>[];
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const type = String(node["@type"] || "");
        if (!/PublicSwimmingPool|SportsActivityLocation|LocalBusiness|Place/i.test(type)) {
          continue;
        }
        const addr = (node.address || {}) as Record<string, unknown>;
        return {
          name: typeof node.name === "string" ? node.name : undefined,
          streetAddress:
            typeof addr.streetAddress === "string" ? addr.streetAddress : undefined,
          addressLocality:
            typeof addr.addressLocality === "string" ? addr.addressLocality : undefined,
          postalCode: typeof addr.postalCode === "string" ? addr.postalCode : undefined,
          telephone: typeof node.telephone === "string" ? node.telephone : undefined,
        };
      }
    } catch {
      /* ignore bad json-ld */
    }
  }
  return null;
}

/**
 * Magyar Uszodák directory cards:
 * <a href="/uszoda/…"><div class="nm">Name</div><div class="lo">Budapest</div></a>
 * One page → many structured candidates (fair-use facts only).
 */
export function extractMagyarUszodakCards(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 25
): Candidate[] {
  const origin = "https://www.magyaruszodak.hu";
  const re =
    /<a\s+href="(\/uszoda\/[^"]+)"[^>]*>[\s\S]*?<div class="nm">([^<]+)<\/div>\s*<div class="lo">([^<]*)<\/div>/gi;

  const seen = new Set<string>();
  const out: Candidate[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null && out.length < limit) {
    const path = m[1];
    const title = cleanText(m[2]);
    const locality = cleanText(m[3] || "Budapest");
    if (!title || title.length < 4) continue;
    if (isJunkTitle(title)) continue;
    // Skip generic pool-type fragments without a proper venue name
    if (/^(tanmedence|úszómedence|hullámmedence|élménymedence|gyermekmedence|wellness|termál|kültéri|kiúszó|versenymedence|műugró medence|bemelegítő medence|\d+-as medence|\d+ fokos)/i.test(title)) {
      continue;
    }

    const discoveryUrl = origin + path;
    if (seen.has(discoveryUrl)) continue;
    seen.add(discoveryUrl);

    const address = locality ? `${locality}, Hungary` : undefined;
    out.push({
      seedId: generateSeedId(title, address || discoveryUrl),
      sourceId: opts.sourceId,
      discoveryUrl,
      territory: opts.territory,
      activityType: detectActivityType(title, title, opts.activityTypes),
      title,
      address,
      contact: {},
      extractedFacts: {
        hasPhone: false,
        hasEmail: false,
        hasAddress: !!address,
        locality,
        listingPath: path,
      },
      confidence: address ? "medium" : "low",
      discoveredAt: new Date().toISOString(),
    });
  }

  return out;
}

/**
 * NSÜ facility detail page — name + Helyszín + phone/email
 */
export function extractNsuFacilityDetail(
  html: string,
  url: string,
  opts: ExtractOptions
): Candidate[] {
  const og =
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] ||
    html.match(/<h2[^>]*>([^<]+)<\/h2>/i)?.[1] ||
    html.match(/<title>([^|<]+)/i)?.[1];
  const title = cleanText(og || "");
  if (!title || isJunkTitle(title)) return [];

  const hely =
    html.match(/Helyszín:\s*<\/strong>\s*([^<]+)/i)?.[1] ||
    html.match(/Helyszín:\s*([^<\n]{10,120})/i)?.[1] ||
    html.match(/(\d{4}\s+Budapest[^<\n]{5,80})/i)?.[1];
  const address = hely
    ? cleanText(hely)
        .replace(/\s*•\s*$/, "")
        .replace(/,\s*\d+\s*\/\d+\.?\s*hrsz\.?/i, "")
        // Cut NSÜ narrative that follows the address on the same line
        .replace(/\s+(Átadva|Kedves|Befogadóképesség|Fizikai jellemzők|Az uszoda).*$/i, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    : undefined;

  const phone =
    cleanText(
      html.match(/Telefon:\s*([^<\n]+)/i)?.[1] ||
        html.match(/Mobil:\s*([^<\n]+)/i)?.[1] ||
        html.match(/(\+36[\s\d]{8,18})/)?.[1] ||
        ""
    ) || undefined;

  const email = html.match(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase();

  return [
    {
      seedId: generateSeedId(title, address || url),
      sourceId: opts.sourceId,
      discoveryUrl: url,
      territory: opts.territory,
      activityType: detectActivityType(html, title, opts.activityTypes),
      title,
      address,
      contact: { phone, email },
      extractedFacts: {
        hasPhone: !!phone,
        hasEmail: !!email,
        hasAddress: !!address,
      },
      confidence: calculateConfidence({ title, address, phone, email }),
      discoveredAt: new Date().toISOString(),
    },
  ];
}

function extractSinglePageFallback(
  html: string,
  url: string,
  opts: ExtractOptions
): Candidate[] {
  const titlePatterns = [
    /<h[1-3][^>]*>([^<]+(?:uszoda|medence|edzőterem|fitness|sportközpont)[^<]*)<\/h[1-3]>/gi,
    /<meta\s+property="og:title"\s+content="([^"]+)"/i,
    /<title>([^|<]+)/i,
  ];

  let title: string | undefined;
  for (const pattern of titlePatterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      title = cleanText(match[1]);
      if (title.length > 5 && !isJunkTitle(title)) break;
      title = undefined;
    }
  }
  if (!title) return [];

  const addressPatterns = [
    /(?:cím|address|helyszín)[:：]\s*([^<\n]{10,100})/gi,
    /(\d{4}\s+[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+[^<\n]{10,80})/g,
  ];
  let address: string | undefined;
  for (const pattern of addressPatterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      address = cleanText(match[1]);
      if (address.length >= 10) break;
    }
  }

  const phone =
    cleanText(
      html.match(/(?:tel|telefon|phone|mobil)[:：]?\s*([\d\s+\-()]{8,20})/i)?.[1] ||
        html.match(/(\+36[\s\-]?\d{1,2}[\s\-]?\d{3}[\s\-]?\d{4})/)?.[0] ||
        ""
    ) || undefined;
  const email = html.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase();

  return [
    {
      seedId: generateSeedId(title, address),
      sourceId: opts.sourceId,
      discoveryUrl: url,
      territory: opts.territory,
      activityType: detectActivityType(html, title, opts.activityTypes),
      title,
      address,
      contact: { phone, email },
      extractedFacts: {
        hasPhone: !!phone,
        hasEmail: !!email,
        hasAddress: !!address,
      },
      confidence: calculateConfidence({ title, address, phone, email }),
      discoveredAt: new Date().toISOString(),
    },
  ];
}

function isJunkTitle(title: string): boolean {
  return JUNK_TITLES.some((re) => re.test(title));
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectActivityType(
  html: string,
  title: string,
  allowed: string[]
): string {
  const combined = (html + title).toLowerCase();
  const keywords: Record<string, string[]> = {
    swimming: ["uszoda", "medence", "úszás", "swimming", "strandfürdő", "fürdő", "tanuszoda", "strand"],
    fitness: ["edzőterem", "fitness", "konditerem", "gym", "egészségközpont"],
    tennis: ["tenisz", "tennis"],
    "water-polo": ["vízilabda", "waterpolo"],
    "water-sports": ["kajak", "kenu", "evez", "vízisport", "vizisport"],
    handball: ["kézilabda", "kezilabda", "munkacsarnok"],
    football: ["labdarúg", "futball", "foci", "stadion", "műfüves"],
    "ice-sports": ["jég", "korcsolya", "jégcsarnok", "jégcentrum"],
    basketball: ["kosár", "kosárlabda", "basketball"],
    volleyball: ["röplabda", "volleyball"],
    "school-sport": ["diáksport", "iskola", "gimnázium", "tanoda", "tornaterem"],
    "training-camp": ["edzőtábor", "olimpiai központ", "tábora"],
    yoga: ["yoga", "jóga"],
    martial: ["harcművészet", "karate", "judo", "aikido"],
    dance: ["tánc", "dance"],
    team: ["csapatsport", "kosár", "basketball"],
    various: ["sportközpont", "sporttelep", "csarnok", "sportlétesítmény"],
  };

  for (const [type, words] of Object.entries(keywords)) {
    if (allowed.includes(type) || allowed.includes("various")) {
      for (const word of words) {
        if (combined.includes(word)) return type;
      }
    }
  }
  return allowed[0] || "various";
}

function generateSeedId(title: string, address?: string): string {
  const key = (title + (address || "")).toLowerCase().replace(/\s+/g, "-");
  return `seed-hun-${simpleHash(key)}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

function calculateConfidence(data: {
  title: string;
  address?: string;
  phone?: string;
  email?: string;
}): "high" | "medium" | "low" {
  let score = 0;
  if (data.title) score += 1;
  if (data.address) score += 2;
  if (data.phone) score += 1;
  if (data.email) score += 1;
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}
