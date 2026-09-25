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
 * Route to the right extractor based on URL / markup
 */
export function extractHungarianSportFacility(
  html: string,
  url: string,
  opts: ExtractOptions
): Candidate[] {
  if (/magyaruszodak\.hu/i.test(url) || /class="pcard"/i.test(html)) {
    const cards = extractMagyarUszodakCards(html, url, opts);
    if (cards.length) return cards;
  }

  if (/nsu\.hu\/letesitmeny\//i.test(url) || /Helyszín:/i.test(html)) {
    const detail = extractNsuFacilityDetail(html, url, opts);
    if (detail.length) return detail;
  }

  return extractSinglePageFallback(html, url, opts);
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
  const address = hely ? cleanText(hely).replace(/\s*•\s*$/, "").replace(/,\s*\d+\s*\/\d+\.?\s*hrsz\.?/i, "").trim() : undefined;

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
    swimming: ["uszoda", "medence", "úszás", "swimming", "strandfürdő", "fürdő"],
    fitness: ["edzőterem", "fitness", "konditerem", "gym"],
    tennis: ["tenisz", "tennis"],
    "water-polo": ["vízilabda", "waterpolo"],
    yoga: ["yoga", "jóga"],
    martial: ["harcművészet", "karate", "judo", "aikido"],
    dance: ["tánc", "dance"],
    team: ["csapatsport", "foci", "football", "kosár", "basketball"],
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
