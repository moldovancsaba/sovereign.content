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

  // Only treat as NSÜ detail on nsu.hu URLs (Helyszín: appears on many municipal pages)
  if (/nsu\.hu\/letesitmeny\//i.test(url)) {
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

  if (/miskolc\.hu\/.*sportletesitmenyek/i.test(url)) {
    const miskolc = extractMiskolcSportFacilities(html, url, opts);
    if (miskolc.length) return miskolc;
  }

  if (/sport13\.hu\/telephelyeink/i.test(url)) {
    const sites = extractSport13Sites(html, url, opts);
    if (sites.length) return sites;
  }

  if (/debrecen\.hu\/.*aktiv-kikapcsolodas/i.test(url)) {
    const deb = extractDebrecenAktivFacilities(html, url, opts);
    if (deb.length) return deb;
  }

  if (/bp16\.hu\/intezmenyek/i.test(url) || /intezmeny__field-cim/i.test(html)) {
    const bp16 = extractBp16InstitutionCards(html, url, opts);
    if (bp16.length) return bp16;
  }

  if (
    /oktatas-neveles\/iskolak/i.test(url) ||
    /intezmeny-kategoria\/altalanos-iskolak/i.test(url) ||
    /intezmeny-kategoria\/kozepiskolak/i.test(url) ||
    /gyor\.hu\/.*\/iskolak/i.test(url) ||
    /szekesfehervar\.hu\/.*iskolak/i.test(url) ||
    /veszprem\.hu\/.*iskolak/i.test(url) ||
    /kecskemet\.hu\/.*iskolak/i.test(url) ||
    /pesterzsebet\.hu\/intezmenyek\/iskolak/i.test(url) ||
    /budafokteteny\.hu\/.*oktatas/i.test(url) ||
    /bp16\.hu\/intezmenyek\/(altalanos|kozep)/i.test(url)
  ) {
    const schools = extractSchoolDirectory(html, url, opts);
    if (schools.length) return schools;
  }

  if (/jozsefvaros\.hu\/.*uszodak/i.test(url)) {
    const pools = extractJozsefvarosPools(html, url, opts);
    if (pools.length) return pools;
  }

  if (/gyor\.hu\/.*\/letesitmenyek/i.test(url)) {
    const gyor = extractGyorFacilityLinks(html, url, opts);
    if (gyor.length) return gyor;
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
  /(sportuszoda|tanuszoda|uszoda|sportközpont|sportcent|sporttelep|csarnok|stadion|edzőközpont|edzokozpont|atlétikai|atletikai|pálya|palya|strand|fürdő|jégcentrum|jegcentrum|jégcsarnok|jegcsarnok|sípálya|sipalya|grund|munkacsarnok|sportbázis|szabadidő|szabadido|pihenőpark|tornaterem|vendégház|motel|aréna|arena)/i;
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
  const schoolOpts = {
    ...opts,
    activityTypes: ["school-sport", ...opts.activityTypes],
  };

  // Prefer structured BP13 cards when present
  const cards = extractBp13InstitutionCards(html, pageUrl, schoolOpts, limit);
  if (cards.length) {
    return cards.map((c) => ({
      ...c,
      activityType: "school-sport",
      extractedFacts: { ...c.extractedFacts, schoolLinked: true, from: "school-directory" },
    }));
  }

  if (/intezmeny__field-cim/i.test(html) || /bp16\.hu\/intezmenyek/i.test(pageUrl)) {
    const bp16 = extractBp16InstitutionCards(html, pageUrl, schoolOpts, limit);
    if (bp16.length) return bp16.map((c) => ({ ...c, activityType: "school-sport" }));
  }

  if (/gyor\.hu\/.*iskolak/i.test(pageUrl) || /width="511"/i.test(html)) {
    const gyor = extractGyorSchoolTable(html, pageUrl, schoolOpts, limit);
    if (gyor.length) return gyor;
  }

  if (/szekesfehervar\.hu/i.test(pageUrl) || /Cím:\s*\d{4}\s+Székesfehérvár/i.test(html)) {
    const szfv = extractSzfvSchoolDirectory(html, pageUrl, schoolOpts, limit);
    if (szfv.length) return szfv;
  }

  if (/veszprem\.hu/i.test(pageUrl)) {
    const vp = extractVeszpremSchoolDirectory(html, pageUrl, schoolOpts, limit);
    if (vp.length) return vp;
  }

  if (/kecskemet\.hu\/.*iskolak/i.test(pageUrl)) {
    const kec = extractKecskemetSchoolHeadings(html, pageUrl, schoolOpts, limit);
    if (kec.length) return kec;
  }

  if (/pesterzsebet\.hu\/intezmenyek\/iskolak/i.test(pageUrl)) {
    const pe = extractSchoolWebsiteLinks(html, pageUrl, schoolOpts, {
      locality: "Budapest XX",
      from: "pesterzsebet-schools",
      limit,
    });
    if (pe.length) return pe;
  }

  if (/budafokteteny\.hu/i.test(pageUrl)) {
    const bt = extractBudafokSchoolDirectory(html, pageUrl, schoolOpts, limit);
    if (bt.length) return bt;
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
      address: defaultLocalityAddress(opts.territory, pageUrl),
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

function defaultLocalityAddress(territory: string, pageUrl: string): string {
  if (/miskolc/i.test(pageUrl)) return "Miskolc, Hungary";
  if (/gyor\.hu/i.test(pageUrl)) return "Győr, Hungary";
  if (/szekesfehervar/i.test(pageUrl)) return "Székesfehérvár, Hungary";
  if (/veszprem/i.test(pageUrl)) return "Veszprém, Hungary";
  if (/kecskemet/i.test(pageUrl)) return "Kecskemét, Hungary";
  if (/debrecen/i.test(pageUrl)) return "Debrecen, Hungary";
  if (territory === "HUN-BUD" || /budapest|bp\d|ujpest|jozsefvaros|pesterzsebet|hegyvidek|sport13|budafok/i.test(pageUrl)) {
    return "Budapest, Hungary";
  }
  return "Hungary";
}

function schoolCandidate(
  title: string,
  pageUrl: string,
  opts: ExtractOptions,
  extra: {
    address?: string;
    discoveryUrl?: string;
    phone?: string;
    email?: string;
    website?: string;
    from: string;
    streetLevel?: boolean;
  }
): Candidate {
  const address = extra.address
    ? /hungary$/i.test(extra.address)
      ? extra.address
      : `${extra.address}, Hungary`
    : defaultLocalityAddress(opts.territory, pageUrl);
  return {
    seedId: generateSeedId(title, address || pageUrl),
    sourceId: opts.sourceId,
    discoveryUrl: extra.discoveryUrl || extra.website || pageUrl,
    territory: opts.territory,
    activityType: "school-sport",
    title,
    address,
    contact: {
      phone: extra.phone,
      email: extra.email,
      website: extra.website,
    },
    extractedFacts: {
      hasPhone: !!extra.phone,
      hasEmail: !!extra.email,
      hasAddress: !!address,
      streetLevel: !!extra.streetLevel,
      schoolLinked: true,
      from: extra.from,
    },
    confidence: calculateConfidence({
      title,
      address,
      phone: extra.phone,
      email: extra.email,
    }),
    discoveredAt: new Date().toISOString(),
  };
}

/** Miskolc Önkormányzat — sportlétesítmények listing (h2 titles + detail paths). */
export function extractMiskolcSportFacilities(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 30
): Candidate[] {
  const origin = "https://www.miskolc.hu";
  const out: Candidate[] = [];
  const seen = new Set<string>();

  // Prefer accented h2 titles; attach matching detail path when present after the heading
  for (const hm of html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)) {
    if (out.length >= limit) break;
    const title = cleanText(hm[1]);
    if (
      !FACILITY_NAME.test(title) &&
      !/stadion|centrum|sporttelep|szabadidő|edzőközpont/i.test(title)
    ) {
      continue;
    }
    if (!isCleanLabel(title) || /navig|lábléc|fő navig/i.test(title)) continue;
    const key = normKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    const after = html.slice(hm.index! + hm[0].length, hm.index! + hm[0].length + 500);
    const path =
      after.match(
        /href="(\/elet-a-varosban\/sport\/sportletesitmenyek\/[a-z0-9\-]+)"/i
      )?.[1] ||
      // listing often links the *next* card; also try path whose slug matches title
      undefined;
    let discoveryUrl = pageUrl;
    const slugGuess = key;
    for (const pm of html.matchAll(
      /href="(\/elet-a-varosban\/sport\/sportletesitmenyek\/([a-z0-9\-]+))"/gi
    )) {
      if (normKey(pm[2]) === slugGuess || normKey(pm[2]).includes(slugGuess.slice(0, 12))) {
        discoveryUrl = origin + pm[1];
        break;
      }
    }
    if (path && discoveryUrl === pageUrl) discoveryUrl = origin + path;
    out.push({
      seedId: generateSeedId(title, discoveryUrl),
      sourceId: opts.sourceId,
      discoveryUrl,
      territory: opts.territory,
      activityType: detectActivityType(title, title, opts.activityTypes),
      title,
      address: "Miskolc, Hungary",
      contact: { website: discoveryUrl },
      extractedFacts: {
        hasPhone: false,
        hasEmail: false,
        hasAddress: true,
        locality: "Miskolc",
        from: "miskolc-sportletesitmenyek",
      },
      confidence: "medium",
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

/** Sport13 (BP XIII municipal sport) telephelyeink — "X története" + address. */
export function extractSport13Sites(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 20
): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(
    /<h3[^>]*>\s*([^<]{5,90}?története)\s*<\/h3>/gi
  )) {
    if (out.length >= limit) break;
    let title = cleanText(m[1]).replace(/\s*története\s*$/i, "").trim();
    // Drop leading chrome occasionally glued into the heading
    title = title.replace(/^.*?(?=(?:Angyalföldi|Népszigeti|Nővér|Petőfi|Radnóti|Újpalotai|Velencei))/i, "");
    if (!isCleanLabel(title) || title.length < 6) continue;
    if (/nyitvatartás|házirend|rólunk|informat/i.test(title)) continue;
    const key = normKey(title);
    if (seen.has(key)) continue;
    seen.add(key);

    const after = html.slice(m.index! + m[0].length, m.index! + m[0].length + 1000);
    const addrRaw =
      after.match(/(\d{4}\s+Budap?est[^<\n]{0,90})/i)?.[1] || "";
    let address = cleanText(addrRaw)
      .replace(/Budapet/gi, "Budapest")
      .replace(/<\/?u>/gi, "")
      .replace(/\s+/g, " ")
      .replace(/[.,\s]+$/, "");
    // Incomplete "1138 Budapest," without street — keep locality only
    if (address && /^(\d{4})\s+Budapest,?\s*$/i.test(address)) {
      address = "Budapest, Hungary";
    } else if (address && !/hungary$/i.test(address)) {
      address = `${address}, Hungary`;
    }
    if (!address) address = "Budapest XIII, Hungary";

    const phone =
      cleanText(after.match(/(\+36[\s\d\-]{8,18})/)?.[1] || "") || undefined;

    const isSchoolPool = /tanuszoda/i.test(title);
    out.push({
      seedId: generateSeedId(title, address),
      sourceId: opts.sourceId,
      discoveryUrl: pageUrl,
      territory: opts.territory,
      activityType: isSchoolPool
        ? "swimming"
        : detectActivityType(title, title, opts.activityTypes),
      title,
      address,
      contact: { phone, website: "https://sport13.hu/" },
      extractedFacts: {
        hasPhone: !!phone,
        hasEmail: false,
        hasAddress: true,
        streetLevel: /\d/.test(address) && /utca|út|ter|tér|Margitsziget/i.test(address),
        from: "sport13-telephelyeink",
      },
      confidence: phone || /\d/.test(address) ? "high" : "medium",
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

/** Debrecen Önkormányzat — aktív kikapcsolódás / sportcsarnokok facility links. */
export function extractDebrecenAktivFacilities(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 25
): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(
    /<a[^>]+href="(https:\/\/www\.debrecen\.hu\/hu\/debreceni\/aktiv-kikapcsolodas\/([a-z0-9\-]+))"[^>]*>([\s\S]*?)<\/a>/gi
  )) {
    if (out.length >= limit) break;
    const discoveryUrl = m[1].replace(/\/$/, "");
    const slug = m[2];
    if (/^kategoria\b|kiemelt-sportegyesuletek|^uszas$/i.test(slug)) continue;
    if (seen.has(discoveryUrl)) continue;
    seen.add(discoveryUrl);
    let title = cleanText(m[3]);
    if (!isCleanLabel(title) || title.length < 5 || title.length > 80) {
      title = cleanText(
        slug.replace(/-\d+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      );
    }
    if (!isCleanLabel(title) || title.length < 5) continue;
    if (
      !FACILITY_NAME.test(title) &&
      !/stadion|aréna|arena|jégcsarnok|jegcsarnok|sportuszoda|szabadidő|fonix|főnix|hodos|hódos/i.test(
        title
      )
    ) {
      continue;
    }
    out.push({
      seedId: generateSeedId(title, discoveryUrl),
      sourceId: opts.sourceId,
      discoveryUrl,
      territory: opts.territory,
      activityType: detectActivityType(title, title, opts.activityTypes),
      title,
      address: "Debrecen, Hungary",
      contact: { website: discoveryUrl },
      extractedFacts: {
        hasPhone: false,
        hasEmail: false,
        hasAddress: true,
        locality: "Debrecen",
        from: "debrecen-aktiv-kikapcsolodas",
      },
      confidence: "medium",
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

/** Budapest XVI. institution cards (name + street + phone + email). */
export function extractBp16InstitutionCards(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 40
): Candidate[] {
  const origin = "https://www.bp16.hu";
  const out: Candidate[] = [];
  // Drupal listings use class="my-listing views-row" (views-row not first)
  const blocks = html.split(/views-row/i).slice(1);
  for (const block of blocks) {
    if (out.length >= limit) break;
    const title = cleanText(
      block.match(/<h2[^>]*>[\s\S]*?<span>([^<]+)<\/span>/i)?.[1] ||
        block.match(/<h2[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ||
        ""
    );
    if (!title || title.length < 6 || isJunkTitle(title)) continue;
    // Skip bare category titles ("Általános iskola") without a proper school name
    if (/^(általános iskola|középiskola|óvoda|bölcsőde)$/i.test(title)) continue;
    // Skip uszoda chrome on school pages unless activity allows swimming
    const path = block.match(/href="(\/intezmenyek\/[^"]+)"/i)?.[1];
    const street = cleanText(
      block.match(/class="address"[^>]*>\s*([^<]+)/i)?.[1] || ""
    );
    const postal = cleanText(
      block.match(/Budapest\s+(\d{4})/i)?.[1] ||
        block.match(/(\d{4})\s*<br/i)?.[1] ||
        ""
    );
    const phone =
      cleanText(
        block.match(/field__item[^>]*>\s*([\d\/\-\s]{6,16})\s*</i)?.[1] || ""
      ) || undefined;
    const email = block
      .match(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i)?.[1]
      ?.toLowerCase();
    let address: string | undefined;
    if (street && postal) {
      address = `${postal} Budapest, ${street}, Hungary`;
    } else if (street) {
      address = `${street}, Budapest, Hungary`;
    } else {
      address = "Budapest XVI, Hungary";
    }
    const discoveryUrl = path ? origin + path : pageUrl;
    const isSchool = /iskola|gimnázium|óvoda|tanoda/i.test(title);
    const isPool = /uszoda|strand/i.test(title);
    out.push({
      seedId: generateSeedId(title, address),
      sourceId: opts.sourceId,
      discoveryUrl,
      territory: opts.territory,
      activityType: isPool
        ? "swimming"
        : isSchool
          ? "school-sport"
          : detectActivityType(title, title, opts.activityTypes),
      title,
      address,
      contact: { phone, email, website: discoveryUrl },
      extractedFacts: {
        hasPhone: !!phone,
        hasEmail: !!email,
        hasAddress: true,
        streetLevel: !!street,
        schoolLinked: isSchool,
        from: "bp16-intezmeny-card",
      },
      confidence: calculateConfidence({ title, address, phone, email }),
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

/** Győr Önkormányzat iskolák — numbered table cells. */
export function extractGyorSchoolTable(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 40
): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<td[^>]*width="511"[^>]*>([\s\S]*?)<\/td>/gi)) {
    if (out.length >= limit) break;
    const title = cleanText(m[1]);
    if (!title || title.length < 8 || title.length > 160) continue;
    if (!/Iskola|Gimnázium|Technikum|Szakképző|Kollégium|Szakgimnázium/i.test(title)) {
      continue;
    }
    const key = normKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      schoolCandidate(title, pageUrl, opts, {
        address: "Győr, Hungary",
        from: "gyor-iskolak-table",
      })
    );
  }
  return out;
}

/** Székesfehérvár városportál — tankerületi iskolák (Name + Cím:). */
export function extractSzfvSchoolDirectory(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 40
): Candidate[] {
  const text = cleanText(html.replace(/<script[\s\S]*?<\/script>/gi, " "));
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const re =
    /((?:[A-ZÁÉÍÓÖŐÚÜŰ][\w\-áéíóöőúüűÁÉÍÓÖŐÚÜŰ. ]{2,80}?)(?:Általános Iskola|Gimnázium és Alapfokú Művészeti Iskola|EGYMI[^C]{0,60}?Iskola))\s+Cím:\s*(\d{4}\s+Székesfehérvár[^TF]{5,70}?)(?:\s+Telephely:|\s+Főigazgató:|\s+Igazgató:|\s+Tel)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && out.length < limit) {
    let title = m[1].trim();
    title = title.replace(
      /^.*?(?=[A-ZÁÉÍÓÖŐÚÜŰ][\w].{3,}(?:Általános Iskola|Gimnázium))/u,
      ""
    );
    if (!isCleanLabel(title) || title.length < 10) continue;
    const key = normKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    const street = cleanText(m[2]).replace(/[.,\s]+$/, "");
    out.push(
      schoolCandidate(title, pageUrl, opts, {
        address: street,
        from: "szfv-tankerulet-iskolak",
        streetLevel: true,
      })
    );
  }
  return out;
}

/** Veszprém — általános (website links) + közép (li>strong + address). */
export function extractVeszpremSchoolDirectory(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 40
): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(
    /<li[^>]*>\s*<strong>([^<]{8,120})<\/strong>\s*([^<]{5,80})/gi
  )) {
    if (out.length >= limit) break;
    const title = cleanText(m[1]);
    const rest = cleanText(m[2]);
    if (!/Iskola|Gimnázium|Technikum|Szakképző|Kollégium/i.test(title)) continue;
    if (/egészségügyi|szociális|családsegítő|oktatás, nevelés/i.test(title)) continue;
    const key = normKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    const street = /Veszprém/i.test(rest) ? rest : undefined;
    out.push(
      schoolCandidate(title, pageUrl, opts, {
        address: street || "Veszprém, Hungary",
        from: "veszprem-kozepiskolak-li",
        streetLevel: !!street,
      })
    );
  }

  for (const m of html.matchAll(
    /<a[^>]+href="(https?:\/\/(?!veszprem\.hu|facebook|twitter|wp-json)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  )) {
    if (out.length >= limit) break;
    const title = cleanText(m[2]);
    const website = m[1];
    if (!/Iskola|Gimnázium|Technikum/i.test(title)) continue;
    if (title.length < 10 || title.length > 120) continue;
    if (/főiskola|egyetem/i.test(title) && !/általános|gimnázium/i.test(title)) continue;
    const key = normKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      schoolCandidate(title, pageUrl, opts, {
        address: "Veszprém, Hungary",
        website,
        discoveryUrl: website,
        from: "veszprem-altalanos-iskolak",
      })
    );
  }
  return out;
}

/** Kecskemét város — iskolák / középiskolák h2 headings. */
export function extractKecskemetSchoolHeadings(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 40
): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const origin = "https://kecskemet.hu";
  for (const m of html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)) {
    if (out.length >= limit) break;
    const title = cleanText(m[1]);
    if (!/Iskola|Gimnázium|Technikum|Kollégium|Szakképző/i.test(title)) continue;
    if (/fenntartó|main navigation|honlapja/i.test(title)) continue;
    if (title.length < 10 || title.length > 140) continue;
    const key = normKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    const after = html.slice(m.index! + m[0].length, m.index! + m[0].length + 600);
    const path = after.match(
      /href="(https:\/\/kecskemet\.hu\/varosunk\/oktatas-neveles\/[^"]+)"/i
    )?.[1];
    const email = after
      .match(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i)?.[1]
      ?.toLowerCase();
    out.push(
      schoolCandidate(title, pageUrl, opts, {
        address: "Kecskemét, Hungary",
        discoveryUrl: path || pageUrl,
        website: path,
        email,
        from: "kecskemet-iskolak-h2",
      })
    );
  }
  return out;
}

/** Generic school website-link extractor (Pesterzsébet, …). */
export function extractSchoolWebsiteLinks(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  cfg: { locality: string; from: string; limit?: number }
): Candidate[] {
  const limit = cfg.limit ?? 40;
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const host = pageUrl.match(/^https?:\/\/(?:www\.)?([^/]+)/i)?.[1] || "";
  for (const m of html.matchAll(
    /<a[^>]+href="(https?:\/\/(?!facebook|youtube|instagram|kk\.gov|kormany|wp-content)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  )) {
    if (out.length >= limit) break;
    const website = m[1];
    if (host && new URL(website, pageUrl).hostname.replace(/^www\./, "").includes(host.replace(/^www\./, "")) && !/iskola|gimnazium|technikum|sulinet|edu\.hu/i.test(website)) {
      // Same-host uploads / nav — skip unless it looks like a school site path
      if (/uploads|felveteli|korzet|etkezes|efizetes/i.test(website)) continue;
    }
    const title = cleanText(m[2]);
    if (!/(?:Általános\s+)?Iskola|Gimnázium|Technikum|Szakképző|Szakgimnázium|Szakközép|Tanoda|Akadémia/i.test(title)) {
      continue;
    }
    if (title.length < 8 || title.length > 120) continue;
    if (
      /felvételi|körzethatár|beiskoláz|beiratkoz|felhívás|kormány|magyarország|étkezés|befizetés|^főiskola$/i.test(
        title
      )
    ) {
      continue;
    }
    // Bare "Főiskola" / college without school-stage marker
    if (/főiskola/i.test(title) && !/általános|gimnázium|közép|szak/i.test(title)) continue;
    const key = normKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      schoolCandidate(title, pageUrl, opts, {
        address: `${cfg.locality}, Hungary`,
        website,
        discoveryUrl: website,
        from: cfg.from,
      })
    );
  }
  return out;
}

/** Budafok-Tétény (BP XXII) oktatási intézmények. */
export function extractBudafokSchoolDirectory(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 30
): Candidate[] {
  const linked = extractSchoolWebsiteLinks(html, pageUrl, opts, {
    locality: "Budapest XXII",
    from: "budafok-oktatasi-intezmenyek",
    limit,
  });
  if (linked.length) return linked;

  const text = cleanText(html.replace(/<script[\s\S]*?<\/script>/gi, " "));
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const re =
    /((?:[A-ZÁÉÍÓÖŐÚÜŰ][^.]{5,90}?)(?:Általános Iskola|Gimnázium|Technikum|Szakközépiskola|Szakgimnázium)[^.]*?)\s+(\d{4}\s+Budapest[^.]{5,70})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && out.length < limit) {
    let title = m[1].replace(/^.*?:\s*/, "").trim();
    if (title.length < 10 || title.length > 120) continue;
    const key = normKey(title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      schoolCandidate(title, pageUrl, opts, {
        address: cleanText(m[2]),
        from: "budafok-oktatasi-text",
        streetLevel: true,
      })
    );
  }
  return out;
}

/** Józsefváros uszodák page — named municipal / partner pools. */
export function extractJozsefvarosPools(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 15
): Candidate[] {
  const known: Array<{ title: string; address?: string; website?: string }> = [
    {
      title: "Nemzeti Közszolgálati Egyetem Uszoda (Ludovika)",
      address: "1083 Budapest, Üllői út 82.",
      website: "https://sportosegyetem.uni-nke.hu/letesitmenyek/uszoda",
    },
    {
      title: "Losonci Téri Általános Iskola Uszoda",
      address: "1083 Budapest, Losonci tér",
      website: "https://losialtisk.hu/iskolai-elet/uszoda/",
    },
  ];
  const text = cleanText(html);
  const out: Candidate[] = [];
  for (const k of known) {
    if (out.length >= limit) break;
    const needle = k.title.split(" ")[0];
    if (!new RegExp(needle, "i").test(text) && !/uszoda/i.test(text)) continue;
    // Only emit if page mentions the venue or is the uszodák listing
    if (
      !new RegExp(k.title.slice(0, 12), "i").test(text) &&
      !/ludovika|losonci|nke/i.test(text)
    ) {
      continue;
    }
    out.push({
      seedId: generateSeedId(k.title, k.address || pageUrl),
      sourceId: opts.sourceId,
      discoveryUrl: k.website || pageUrl,
      territory: opts.territory,
      activityType: "swimming",
      title: k.title,
      address: k.address ? `${k.address}, Hungary` : "Budapest VIII, Hungary",
      contact: { website: k.website },
      extractedFacts: {
        hasPhone: false,
        hasEmail: false,
        hasAddress: true,
        streetLevel: !!k.address,
        from: "jozsefvaros-uszodak",
      },
      confidence: "medium",
      discoveredAt: new Date().toISOString(),
    });
  }
  // Also catch any bold/heading uszoda names on the page
  for (const m of html.matchAll(
    /<(?:h[2-4]|strong)[^>]*>([^<]*(?:[Uu]szoda)[^<]*)<\/(?:h[2-4]|strong)>/g
  )) {
    if (out.length >= limit) break;
    const title = cleanText(m[1]);
    if (!isCleanLabel(title) || title.length < 8) continue;
    if (out.some((c) => normKey(c.title) === normKey(title))) continue;
    out.push({
      seedId: generateSeedId(title, pageUrl),
      sourceId: opts.sourceId,
      discoveryUrl: pageUrl,
      territory: opts.territory,
      activityType: "swimming",
      title,
      address: "Budapest VIII, Hungary",
      contact: {},
      extractedFacts: {
        hasPhone: false,
        hasEmail: false,
        hasAddress: true,
        from: "jozsefvaros-uszodak-heading",
      },
      confidence: "low",
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

/** Győr sport létesítmények — child facility pages. */
export function extractGyorFacilityLinks(
  html: string,
  pageUrl: string,
  opts: ExtractOptions,
  limit = 20
): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(
    /href="(https:\/\/gyor\.hu\/gyor\/sport\/letesitmenyek\/([a-z0-9\-]+)\/)"[^>]*>([\s\S]*?)<\/a>/gi
  )) {
    if (out.length >= limit) break;
    const discoveryUrl = m[1];
    const slug = m[2];
    if (seen.has(discoveryUrl)) continue;
    seen.add(discoveryUrl);
    let title = cleanText(m[3]);
    if (!isCleanLabel(title) || title.length < 4) {
      title = cleanText(
        slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      );
    }
    if (!isCleanLabel(title)) continue;
    out.push({
      seedId: generateSeedId(title, discoveryUrl),
      sourceId: opts.sourceId,
      discoveryUrl,
      territory: opts.territory,
      activityType: detectActivityType(title, title, opts.activityTypes),
      title,
      address: "Győr, Hungary",
      contact: { website: discoveryUrl },
      extractedFacts: {
        hasPhone: false,
        hasEmail: false,
        hasAddress: true,
        locality: "Győr",
        from: "gyor-sport-letesitmenyek",
      },
      confidence: "medium",
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

  // Prefer "Helyszín (cím):" / "Helyszín:" — never fall back to NSÜ HQ footer (Petzvál / 1119).
  const helyRaw =
    html.match(/Helyszín\s*\([^)]*\)\s*:\s*<\/[^>]+>\s*([^<]+)/i)?.[1] ||
    html.match(/Helyszín\s*\([^)]*\)\s*:\s*([^<\n]{8,140})/i)?.[1] ||
    html.match(/Helyszín:\s*<\/strong>\s*([^<]+)/i)?.[1] ||
    html.match(/Helyszín:\s*([^<\n]{10,120})/i)?.[1];
  let address = helyRaw
    ? cleanText(helyRaw)
        .replace(/\s*•\s*$/, "")
        .replace(/,\s*\d+\s*\/\d+\.?\s*hrsz\.?/i, "")
        // Cut NSÜ narrative that follows the address on the same line
        .replace(/\s+(Átadva|Kedves|Befogadóképesség|Fizikai jellemzők|Az uszoda).*$/i, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    : undefined;
  // Reject NSÜ Budapest HQ / footer mistaken as facility address
  if (
    address &&
    (/Petzvál\s*József/i.test(address) ||
      /^1119\s+Budapest/i.test(address) ||
      /info@\s*nsu\.hu/i.test(address))
  ) {
    address = undefined;
  }

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
    .replace(/&quot;/g, '"')
    .replace(/&#8222;|&bdquo;/g, "„")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&aacute;/gi, "á")
    .replace(/&eacute;/gi, "é")
    .replace(/&iacute;/gi, "í")
    .replace(/&oacute;/gi, "ó")
    .replace(/&ouml;/gi, "ö")
    .replace(/&otilde;/gi, "õ")
    .replace(/&uacute;/gi, "ú")
    .replace(/&uuml;/gi, "ü")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
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
