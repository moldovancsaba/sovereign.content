/**
 * Határon túl extractors — Hungarian-language sport clubs/venues
 * outside HU (RO, SK, SI, …). Fair-use: structured facts only.
 */

import type { Candidate } from "./common";
import type { ExtractOptions } from "./hungarianExtract";

const SPORT_NAME =
  /sportklub|sportegyesület|sport\s*club|sportcsarnok|uszoda|stadion|jégkorong|labdarúg|kézilabda|kosárlabd|tenisz|edzőterem|fitness|sportközpont|sporttelep|bazen|bazén|športn|dvorana/i;

const JUNK =
  /^főoldal$|^home$|^katalog|^keresés|^sport$|^menü$|^copyright|szurkolók egyesülete/i;

/** Page chrome mistaken for a venue name */
const PAGE_TITLE_JUNK =
  /^(sport\s*[-–|]|voľný čas|szabadka\.rs|oradea\.ro|komarno$|dunaszerdahely|oktatási,\s*kulturális|annak, aki)/i;

function clean(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/gi, "")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, "")
    .replace(/[“”„"]/g, "")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/\*+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

function seedId(title: string, place?: string): string {
  const key = (title + (place || "")).toLowerCase().replace(/\s+/g, "-");
  return `seed-ht-${simpleHash(key)}`;
}

function activityFromTitle(title: string, allowed: string[]): string {
  const t = title.toLowerCase();
  if (/jég|korcsolya|hockey/i.test(t)) return pick(allowed, "ice-sports");
  if (/labdarúg|futball|foci|tsc|dac/i.test(t)) return pick(allowed, "football");
  if (/kézilabda|kezilabda/i.test(t)) return pick(allowed, "handball");
  if (/uszoda|úsz|bazen|bazén|strand/i.test(t)) return pick(allowed, "swimming");
  if (/fitness|edzőterem|kondí/i.test(t)) return pick(allowed, "fitness");
  if (/karate|judo|harcmű|aikido|senshi|fudoshin/i.test(t))
    return pick(allowed, "martial");
  return allowed[0] || "various";
}

function pick(allowed: string[], preferred: string): string {
  if (allowed.includes(preferred)) return preferred;
  if (allowed.includes("various")) return "various";
  return allowed[0] || preferred;
}

function countryFromOpts(opts: ExtractOptions & { countryCode?: string }): string {
  return (
    opts.countryCode ||
    (opts as { countryCode?: string }).countryCode ||
    "XX"
  );
}

function baseCandidate(
  opts: ExtractOptions & { countryCode?: string },
  args: {
    title: string;
    discoveryUrl: string;
    address?: string;
    locality?: string;
    website?: string;
    confidence: "high" | "medium" | "low";
  },
): Candidate {
  const countryCode = countryFromOpts(opts);
  return {
    seedId: seedId(args.title, args.locality || args.address),
    sourceId: opts.sourceId,
    discoveryUrl: args.discoveryUrl,
    territory: "HATARON-TUL",
    activityType: activityFromTitle(args.title, opts.activityTypes),
    title: args.title,
    address: args.address || (args.locality ? `${args.locality}` : undefined),
    contact: args.website ? { website: args.website } : undefined,
    extractedFacts: {
      camera: "hataron-tul",
      countryCode,
      locality: args.locality,
      hasAddress: !!args.address || !!args.locality,
      hasWebsite: !!args.website,
    },
    confidence: args.confidence,
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Erdélystat intézménytár — list rows:
 *   <a ... class="d-block mb-1">Name Sportklub  - Locality</a>
 */
export function extractErdelystatSportClubs(
  html: string,
  pageUrl: string,
  opts: ExtractOptions & { countryCode?: string },
): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const re =
    /href="(https?:\/\/intezmenytar\.erdelystat\.ro\/intezmenyek\/[^"]+\/\d+)"[^>]*class="d-block mb-1"\s*>([^<]+)</gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const raw = clean(m[2]);
    if (!SPORT_NAME.test(raw) || JUNK.test(raw)) continue;
    // Drop fan clubs / pure cultural unless sport-named
    if (/szurkoló/i.test(raw)) continue;

    let title = raw;
    let locality: string | undefined;
    const split = raw.split(/\s+[–-]\s+/);
    if (split.length >= 2) {
      title = clean(split[0]);
      locality = clean(split.slice(1).join(" – "));
    }
    title = title.replace(/\*+\s*$/, "").trim();
    if (title.length < 5 || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());

    out.push(
      baseCandidate(opts, {
        title,
        discoveryUrl: href,
        locality,
        website: href,
        confidence: locality ? "medium" : "low",
      }),
    );
  }
  return out;
}

/** Civilportal category database — sportklub lines in anchors */
export function extractCivilportalSportClubs(
  html: string,
  pageUrl: string,
  opts: ExtractOptions & { countryCode?: string },
): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const re = /href="(https?:\/\/civilportal\.ro\/[^"]+)"[^>]*>([^<]{8,120})</gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const raw = clean(m[2])
      .replace(/^["„"\s]+|["”"\s]+$/g, "")
      .replace(/&quot;/g, "");
    if (!SPORT_NAME.test(raw) || JUNK.test(raw)) continue;
    let title = raw;
    let locality: string | undefined;
    const split = raw.split(/,\s+/);
    if (split.length >= 2) {
      title = clean(split[0]).replace(/^["„"*\s]+|["”"*\s]+$/g, "");
      locality = clean(split[split.length - 1]);
    }
    title = title.replace(/^["„]+|["”*]+$/g, "").trim();
    if (title.length < 5 || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    out.push(
      baseCandidate(opts, {
        title,
        discoveryUrl: href,
        locality,
        website: href,
        confidence: locality ? "medium" : "low",
      }),
    );
  }
  return out;
}

/** Single-club site (e.g. sportclub.ro) — one venue candidate from title */
export function extractHataronClubHome(
  html: string,
  pageUrl: string,
  opts: ExtractOptions & { countryCode?: string },
  defaults: { title: string; locality: string; countryCode: string },
): Candidate[] {
  const og =
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] ||
    html.match(/<title>([^|<]+)/i)?.[1];
  const title = clean(og || defaults.title);
  if (!title || JUNK.test(title)) {
    return [
      baseCandidate(
        { ...opts, countryCode: defaults.countryCode },
        {
          title: defaults.title,
          discoveryUrl: pageUrl,
          locality: defaults.locality,
          website: pageUrl,
          confidence: "medium",
        },
      ),
    ];
  }
  const resolved =
    /hivatalos honlap|official/i.test(title) || !/sportklub|sport club/i.test(title)
      ? defaults.title
      : title;
  return [
    baseCandidate(
      { ...opts, countryCode: defaults.countryCode },
      {
        title: resolved,
        discoveryUrl: pageUrl,
        locality: defaults.locality,
        website: pageUrl,
        confidence: "medium",
      },
    ),
  ];
}

/** Lendava multipurpose hall + pool page */
export function extractLendavaSportHall(
  html: string,
  pageUrl: string,
  opts: ExtractOptions & { countryCode?: string },
): Candidate[] {
  return [
    baseCandidate(
      { ...opts, countryCode: "SI" },
      {
        title: "Lendvai többfunkciós sportcsarnok uszodával",
        discoveryUrl: pageUrl,
        locality: "Lendva",
        address: "Lendva, Szlovénia",
        website: pageUrl,
        confidence: "medium",
      },
    ),
  ];
}

/** KOMSPORT home — municipal sport company */
export function extractKomsportHome(
  html: string,
  pageUrl: string,
  opts: ExtractOptions & { countryCode?: string },
): Candidate[] {
  return [
    baseCandidate(
      { ...opts, countryCode: "SK" },
      {
        title: "KOMSPORT — Komáromi sportlétesítmények",
        discoveryUrl: pageUrl,
        locality: "Komárom",
        address: "Komárom, Szlovákia",
        website: pageUrl,
        confidence: "medium",
      },
    ),
  ];
}

/**
 * Route Határon túl pages. Returns [] when URL is not an HT specialist page
 * (caller may fall through to generic extract).
 */
export function extractHataronTul(
  html: string,
  url: string,
  opts: ExtractOptions & { countryCode?: string },
): Candidate[] {
  if (/intezmenytar\.erdelystat\.ro/i.test(url)) {
    return extractErdelystatSportClubs(html, url, {
      ...opts,
      countryCode: opts.countryCode || "RO",
    });
  }
  if (/civilportal\.ro\/category\/database/i.test(url)) {
    return extractCivilportalSportClubs(html, url, {
      ...opts,
      countryCode: opts.countryCode || "RO",
    });
  }
  if (/sportclub\.ro/i.test(url)) {
    return extractHataronClubHome(html, url, opts, {
      title: "Csíkszeredai Sportklub",
      locality: "Csíkszereda",
      countryCode: "RO",
    });
  }
  if (/lendava\.si\/.*sportna-dvorana/i.test(url)) {
    return extractLendavaSportHall(html, url, opts);
  }
  if (/komsport\.eu/i.test(url)) {
    return extractKomsportHome(html, url, opts);
  }
  // Known HT municipal hubs without a facility list yet — do not invent from <title>
  if (
    /oradea\.ro\/.*\/sport/i.test(url) ||
    /dunaszerdahely\.sk\/volny-cas-sport/i.test(url) ||
    /komarno\.sk\/hu\/varosi-hivatal/i.test(url) ||
    /szabadka\.rs\/?$/i.test(url)
  ) {
    return [];
  }
  return [];
}

/** Drop chrome / portal titles that slipped past extractors */
export function isHataronTulJunkTitle(title: string): boolean {
  const t = clean(title);
  return !t || JUNK.test(t) || PAGE_TITLE_JUNK.test(t) || t.length < 5;
}
