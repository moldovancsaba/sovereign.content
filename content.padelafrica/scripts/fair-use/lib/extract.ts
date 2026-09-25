/**
 * Generic HTML helpers for directory / booking citation pages.
 */

import { hostOf } from "./common.ts";

const BLOCKED_HOST_RE =
  /google|facebook|instagram|twitter|youtube|tiktok|pinterest|linkedin|eventbrite|meetup\.com|cdn\.|fonts\.|gtag|sentry|wixpress|schema\.org|cloudflare|gravatar|doubleclick|googletagmanager|gmpg\.org|w3\.org|x\.com|whatsapp|wa\.me|apple\.com|play\.google/i;

export function decodeHtmlEntities(value: string): string {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

export function stripToText(html: string): string {
  const decoded = decodeHtmlEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n"),
  );
  return decoded
    .replace(/\n+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function pickExternalWebsite(html: string, pageUrl: string, sourceHost: string): string {
  const links = [...String(html || "").matchAll(/href=["'](https?:\/\/[^"'#\s]+)["']/gi)].map(
    (m) => m[1],
  );
  const pageHost = hostOf(pageUrl);
  const srcHost = (sourceHost || pageHost || "").replace(/^www\./, "");
  const scored: Array<{ u: string; score: number }> = [];
  for (const raw of links) {
    const u = raw.replace(/&amp;/g, "&");
    const h = hostOf(u);
    if (!h) continue;
    if (h === pageHost || h === srcHost) continue;
    if (BLOCKED_HOST_RE.test(h) || BLOCKED_HOST_RE.test(u)) continue;
    let score = 1;
    if (/padel/i.test(h) || /padel/i.test(u)) score += 3;
    if (/club|court|arena|sport/i.test(h)) score += 2;
    if (/\.(com|co|net|org|io|africa|ma|za|eg|ke|sn|ng|gh|tz)(\/|$)/i.test(h)) score += 1;
    scored.push({ u, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.u || "";
}

export type ExtractedFacts = {
  name: string;
  website: string;
  address?: string;
  cityHint?: string;
  countryHint?: string;
  citationUrl: string;
};

export function extractGenericFacts(
  html: string,
  pageUrl: string,
  { sourceHost }: { sourceHost: string },
): ExtractedFacts {
  const h1 =
    (String(html).match(/<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i) || [])[1] || "";
  const ogTitle =
    (String(html).match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    ) ||
      String(html).match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      ) ||
      [])[1] || "";
  const title =
    (String(html).match(/<title[^>]*>\s*([\s\S]*?)\s*<\/title>/i) || [])[1] || "";
  let name = decodeHtmlEntities(
    stripToText(h1 || ogTitle || title)
      .split(/[|\-–—]/)[0]
      .trim(),
  ).slice(0, 120);

  // Drop site chrome from name
  name = name
    .replace(/\s*[|\-–—]\s*(Padel Lands|AnalistasPadel|BalleJaune|Actu Padel|Playtomic).*$/i, "")
    .trim();

  const website = pickExternalWebsite(html, pageUrl, sourceHost);
  const text = stripToText(html).slice(0, 4000);

  const addressMatch =
    text.match(
      /(?:Address|Adresse|Dirección|Situated at|Located at)[:\s]+([^\n.]{8,120})/i,
    ) || null;
  const cityMatch =
    text.match(
      /\b(Casablanca|Rabat|Marrakech|Cairo|Giza|Nairobi|Mombasa|Lagos|Accra|Dakar|Cape Town|Johannesburg|Durban|Dar es Salaam|Arusha|Kampala|Kigali|Addis Ababa|Tunis|Algiers|Luanda|Maputo|Windhoek|Gaborone|Harare|Lusaka|Abidjan|Douala|Yaoundé|Tripoli|Malabo)\b/i,
    ) || null;
  const countryMatch =
    text.match(
      /\b(Morocco|Egypt|Kenya|Nigeria|Ghana|Senegal|South Africa|Tanzania|Libya|Equatorial Guinea|Ivory Coast|Côte d'Ivoire|Tunisia|Algeria|Uganda|Rwanda|Botswana|Namibia|Mozambique|Zambia|Zimbabwe|Angola|Cameroon|Gabon|Mauritius)\b/i,
    ) || null;

  return {
    name: name || "Unknown club",
    website,
    address: addressMatch?.[1]?.trim(),
    cityHint: cityMatch?.[1],
    countryHint: countryMatch?.[1],
    citationUrl: pageUrl,
  };
}

export function harvestByHrefPattern(
  html: string,
  base: string,
  patterns: RegExp[],
): string[] {
  const hrefs = [...String(html || "").matchAll(/href=["']([^"'#]+)["']/gi)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
  const out = new Set<string>();
  for (const raw of hrefs) {
    let abs = raw;
    try {
      abs = new URL(raw, base).href;
    } catch {
      continue;
    }
    if (patterns.some((re) => re.test(abs))) out.add(abs.split("#")[0]!);
  }
  return [...out];
}

/** Prefer club-like path segments when harvesting discovery pages. */
export function harvestPadelClubLinks(html: string, base: string, sourceHost: string): string[] {
  const hrefs = [...String(html || "").matchAll(/href=["']([^"'#]+)["']/gi)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
  const out: string[] = [];
  for (const raw of hrefs) {
    let abs = raw;
    try {
      abs = new URL(raw, base).href;
    } catch {
      continue;
    }
    const h = hostOf(abs);
    const path = abs.toLowerCase();
    const sameHost = h === hostOf(base) || h === sourceHost.replace(/^www\./, "");
    if (!sameHost && !/padel/i.test(path)) continue;
    if (
      /club|venue|court|centro|centre|annuaire|directory|countries\/|padel-club|\bclubs?\b/i.test(
        path,
      ) ||
      (sameHost && /padel/i.test(path) && path.split("/").filter(Boolean).length >= 2)
    ) {
      out.push(abs.split("#")[0]!);
    }
  }
  return [...new Set(out)].slice(0, 40);
}
