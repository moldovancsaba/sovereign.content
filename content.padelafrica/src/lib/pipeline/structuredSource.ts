/**
 * Deterministic extraction from structured source headers (OpenClaw / research enrich format).
 *
 * Seed and enrich writers already put facts on the first lines of `sourceText`:
 *
 *   URL: …
 *   Qualified as: padel-club
 *   Name: …
 *   Venue: …
 *   Address: …
 *   Locality: …
 *   Country: …
 *   CountryCode: ZA
 *   Latitude: …
 *   Longitude: …
 *   Website: …
 *   Phone: …
 *
 * Autopilot / Cloud Agent timed jobs use this path so extraction does NOT need AI Gateway.
 * LLM extraction remains available when auth is configured and no usable header is present.
 */
import { ExtractionResultSchema, type ExtractionResult } from "./extraction";
import type { VerticalPack } from "@/lib/vertical/pack";
import { AFRICA } from "@/lib/geo/territoryScope";
import { isPlaceholderPhone } from "@/lib/catalogHygiene/contactReject";

const HEADER_KEYS = [
  "URL",
  "Qualified as",
  "Name",
  "Venue",
  "Address",
  "Locality",
  "Country",
  "CountryCode",
  "Latitude",
  "Longitude",
  "Website",
  "Phone",
] as const;

export type StructuredSourceHeaders = Partial<Record<(typeof HEADER_KEYS)[number], string>>;

/** True when sourceText carries the Name header used by seed/enrich writers. */
export function hasStructuredSourceHeaders(sourceText: string): boolean {
  return /^Name:\s*\S/m.test(sourceText);
}

/**
 * Parse the leading `Key: value` block. Stops at the first blank line or a line that is not a
 * known header (page dump begins after the structured block).
 */
export function parseStructuredSourceHeaders(sourceText: string): StructuredSourceHeaders | null {
  const headers: StructuredSourceHeaders = {};
  const known = new Set<string>(HEADER_KEYS);
  for (const line of sourceText.split(/\r?\n/)) {
    if (!line.trim()) {
      if (Object.keys(headers).length) break;
      continue;
    }
    const m = /^([A-Za-z][A-Za-z ]*?):\s*(.*)$/.exec(line);
    if (!m) {
      if (Object.keys(headers).length) break;
      continue;
    }
    const key = m[1].trim();
    if (!known.has(key)) {
      if (Object.keys(headers).length) break;
      continue;
    }
    const value = m[2].trim();
    if (value) headers[key as (typeof HEADER_KEYS)[number]] = value;
  }
  return headers.Name ? headers : null;
}

let countryNameToCode: Map<string, string> | null = null;

function countryLookup(): Map<string, string> {
  if (countryNameToCode) return countryNameToCode;
  const map = new Map<string, string>();
  const en = new Intl.DisplayNames(["en"], { type: "region" });
  for (const code of AFRICA) {
    const name = en.of(code);
    if (name) map.set(normalizeCountryKey(name), code);
  }
  // Common aliases seed/enrich writers actually print (not always DisplayNames' official form).
  const aliases: Record<string, string> = {
    "democratic republic of the congo": "CD",
    "dr congo": "CD",
    drc: "CD",
    "congo-kinshasa": "CD",
    "republic of the congo": "CG",
    "congo-brazzaville": "CG",
    "cote divoire": "CI",
    "côte d'ivoire": "CI",
    "ivory coast": "CI",
    eswatini: "SZ",
    swaziland: "SZ",
    "cabo verde": "CV",
    "cape verde": "CV",
    "sao tome and principe": "ST",
    "são tomé and príncipe": "ST",
  };
  for (const [k, v] of Object.entries(aliases)) map.set(normalizeCountryKey(k), v);
  countryNameToCode = map;
  return map;
}

function normalizeCountryKey(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveCountryCode(headers: StructuredSourceHeaders): string | undefined {
  const raw = headers.CountryCode?.trim().toUpperCase();
  if (raw && /^[A-Z]{2}$/.test(raw)) return raw;
  const name = headers.Country?.trim();
  if (!name) return undefined;
  return countryLookup().get(normalizeCountryKey(name));
}

/**
 * Build an ExtractionResult from structured headers. Returns null when Name is absent (not this
 * format). Pack taxonomy filters `Qualified as` the same way LLM extraction does.
 */
export function extractionFromStructuredHeaders(
  sourceText: string,
  pack: VerticalPack,
): ExtractionResult | null {
  const headers = parseStructuredSourceHeaders(sourceText);
  if (!headers?.Name) return null;

  const qualified = headers["Qualified as"]?.trim();
  const activityTypes =
    qualified && qualified in pack.taxonomy ? [qualified] : Object.keys(pack.taxonomy).slice(0, 1);

  const lat = headers.Latitude !== undefined ? Number(headers.Latitude) : undefined;
  const lng = headers.Longitude !== undefined ? Number(headers.Longitude) : undefined;

  const locality = headers.Locality || headers.Country;
  const countryCode = resolveCountryCode(headers);
  const venue = headers.Venue || headers.Name;
  // AddressSchema requires line1 + locality + countryCode. Enrich writers often leave Address/
  // Locality blank when Latitude/Longitude are present (OSM). Prefer a geocodeable line
  // (Address → Locality → Country → venue name) so Nominatim can resolve cards that only
  // carried a city, and synthesize the minimum so coords-without-street still form a venue.
  const addressLine1 = headers.Address || headers.Locality || headers.Country || venue;
  const descriptionParts = [
    `${headers.Name} is a ${pack.listingNoun.singular}${locality ? ` in ${locality}` : ""}${headers.Country ? `, ${headers.Country}` : ""}.`,
  ];
  if (headers.Address) descriptionParts.push(`Address: ${headers.Address}.`);

  const candidate = {
    name: headers.Name,
    description: descriptionParts.join(" ").slice(0, 2000),
    activityTypes,
    venueName: venue,
    addressLine1: addressLine1 || undefined,
    locality: locality || undefined,
    countryCode,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    priceModel: "unknown" as const,
    // Completeness: missing schedule + thin description is a hard block. Structured headers rarely
    // carry hours; a short honest note keeps the card publishable (publish-now-enrich-later).
    scheduleNote: "Opening hours not listed on the source page.",
    website: headers.Website || undefined,
    // SC #17 — never promote all-zero / placeholder phones from structured headers.
    phone: headers.Phone && !isPlaceholderPhone(headers.Phone) ? headers.Phone : undefined,
  };

  return ExtractionResultSchema.parse(candidate);
}

/**
 * Upsert `Key: value` lines in the leading structured header block. Preserves unknown headers and
 * the page dump after the first blank line. Used by Cloud Agent geo-repair to fill Address /
 * CountryCode / Latitude / Longitude / Phone from research prose without rewriting the dump.
 */
export function upsertStructuredSourceHeaders(
  sourceText: string,
  patch: Partial<Record<(typeof HEADER_KEYS)[number], string>>,
): string {
  const lines = sourceText.split(/\r?\n/);
  const headerEnd = (() => {
    const known = new Set<string>(HEADER_KEYS);
    let seen = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        if (seen) return i;
        continue;
      }
      const m = /^([A-Za-z][A-Za-z ]*?):\s*(.*)$/.exec(line);
      if (!m || !known.has(m[1].trim())) {
        if (seen) return i;
        continue;
      }
      seen = true;
    }
    return lines.length;
  })();

  const headerLines = lines.slice(0, headerEnd);
  const rest = lines.slice(headerEnd);
  const byKey = new Map<string, number>();
  for (let i = 0; i < headerLines.length; i++) {
    const m = /^([A-Za-z][A-Za-z ]*?):\s*(.*)$/.exec(headerLines[i]);
    if (m) byKey.set(m[1].trim(), i);
  }

  for (const [key, value] of Object.entries(patch) as Array<[(typeof HEADER_KEYS)[number], string]>) {
    if (!value?.trim()) continue;
    const line = `${key}: ${value.trim()}`;
    const idx = byKey.get(key);
    if (idx !== undefined) headerLines[idx] = line;
    else {
      headerLines.push(line);
      byKey.set(key, headerLines.length - 1);
    }
  }

  // Keep a blank line between headers and dump when dump exists.
  if (rest.length && rest[0].trim() !== "") rest.unshift("");
  return [...headerLines, ...rest].join("\n");
}
