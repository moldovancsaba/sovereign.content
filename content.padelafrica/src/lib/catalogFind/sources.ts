/**
 * Where to look for new padel venues — encoded into every FIND brief.
 * Cloud Agent must actually open these; the CLI cannot scrape them.
 *
 * Polite multi-source harvest of the same directories:
 * `scripts/fair-use/` (one page/source/pass → needs_verify candidates).
 */

import type { FindSource } from "./types";

export const FIND_SOURCES: readonly FindSource[] = [
  {
    id: "padellands",
    label: "Padel Lands",
    kind: "directory",
    urlTemplate: "https://padellands.com/en/",
    notes: "Strong for North/Central Africa country pages + club cards (worked for LY, GQ).",
  },
  {
    id: "analistas",
    label: "AnalistasPadel",
    kind: "directory",
    urlTemplate: "https://www.analistaspadel.com/",
    notes: "Spanish-language expansion coverage (worked for GQ).",
  },
  {
    id: "padel-without-borders",
    label: "Padel Without Borders",
    kind: "news",
    urlTemplate: "https://www.padelwithoutborders.com/",
    notes: "Country overviews + operator names (worked for LY).",
  },
  {
    id: "ballejaune",
    label: "BalleJaune",
    kind: "booking",
    urlTemplate: "https://ballejaune.com/",
    notes: "Francophone West Africa club cards + contact (worked for SN).",
  },
  {
    id: "playtomic",
    label: "Playtomic",
    kind: "booking",
    urlTemplate: "https://playtomic.io/",
    notes: "Bookable clubs in markets where Playtomic operates (often ZA, MA, EG, KE).",
  },
  {
    id: "matchpoint",
    label: "Matchpoint",
    kind: "booking",
    urlTemplate: "https://www.matchpoint.com.es/",
    notes: "Club booking microsites (worked for SN Dakar Padel Club).",
  },
  {
    id: "osm",
    label: "OpenStreetMap / Overpass",
    kind: "map",
    notes: "sport=padel or leisure=pitch + padel; corroborate only — still need contact/source for research seed.",
  },
  {
    id: "first-party",
    label: "First-party club sites",
    kind: "federation",
    notes: "Google/WebSearch for '{city} padel club' then open the operator site for phone/hours/address.",
  },
] as const;

/** Query templates — Cloud Agent runs these via WebSearch, substituting city/country. */
export function buildSearchQueries(country: string, city: string, cc: string): string[] {
  return [
    `padel club ${city} ${country}`,
    `padel ${city} book court`,
    `padel ${country} clubs directory`,
    `"padel" ${city} (club OR court OR arena)`,
    `site:padellands.com ${country}`,
    `site:ballejaune.com ${city}`,
    `padel ${cc} ${city} WhatsApp OR Instagram`,
    `${city} padel club contact phone`,
  ];
}

export function sourceChecksFor(country: string, city: string): Array<{ label: string; url?: string; notes: string }> {
  return FIND_SOURCES.map((s) => ({
    label: s.label,
    url: s.urlTemplate,
    notes: `${s.notes} — focus ${city}, ${country}.`,
  }));
}
