/**
 * Fixture / research row → structured sourceText for POST /api/ingest.
 *
 * SSOT for header shape: docs/LISTING-STANDARDS.md (mirrors management
 * src/lib/pipeline/structuredSource.ts). Social http(s) URLs become
 * Listing.contactLinks; Instagram is never copied into Website.
 */

export type StructuredListingFixture = {
  name: string;
  city: string;
  region?: string | null;
  countryCode: string;
  countryName?: string;
  line1?: string | null;
  lat: number;
  lng: number;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  twitter?: string | null;
  description?: string | null;
  primarySourceUrl?: string | null;
  secondarySourceUrl?: string | null;
  seasonNote?: string | null;
  researchNotes?: string | null;
};

const COUNTRY_NAMES: Record<string, string> = {
  ZA: "South Africa",
  MA: "Morocco",
  TN: "Tunisia",
  KE: "Kenya",
  SN: "Senegal",
  NG: "Nigeria",
  MU: "Mauritius",
  BW: "Botswana",
  EG: "Egypt",
  ZW: "Zimbabwe",
  ZM: "Zambia",
  UG: "Uganda",
  CI: "Ivory Coast",
  MZ: "Mozambique",
  NA: "Namibia",
  RW: "Rwanda",
  GH: "Ghana",
  TZ: "Tanzania",
  AO: "Angola",
  DZ: "Algeria",
  LY: "Libya",
  CM: "Cameroon",
  ET: "Ethiopia",
  MG: "Madagascar",
  MW: "Malawi",
  SC: "Seychelles",
  SL: "Sierra Leone",
  TG: "Togo",
  BF: "Burkina Faso",
  GA: "Gabon",
  BI: "Burundi",
  DJ: "Djibouti",
  GM: "Gambia",
  GN: "Guinea",
  GQ: "Equatorial Guinea",
  MR: "Mauritania",
  SO: "Somalia",
  SZ: "Eswatini",
  CV: "Cabo Verde",
  CD: "DR Congo",
  CG: "Republic of the Congo",
  NE: "Niger",
  TD: "Chad",
  CF: "Central African Republic",
  LR: "Liberia",
  ML: "Mali",
  ST: "Sao Tome and Principe",
};

/** True when value is already a usable http(s) URL. */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

/**
 * Normalize WhatsApp to an http(s) URL the engine will accept as contactLinks.
 * Bare international numbers → https://wa.me/<digits>. Already-http URLs pass through.
 */
export function normalizeWhatsAppUrl(raw: string | null | undefined): string | undefined {
  const v = String(raw || "").trim();
  if (!v) return undefined;
  if (isHttpUrl(v)) return v;
  const digits = v.replace(/[^\d]/g, "");
  if (digits.length >= 8) return `https://wa.me/${digits}`;
  return undefined;
}

/** Social profile URL, or undefined when only a bare handle was supplied. */
export function normalizeSocialUrl(raw: string | null | undefined): string | undefined {
  const v = String(raw || "").trim();
  if (!v) return undefined;
  if (isHttpUrl(v)) return v;
  return undefined;
}

/** First-party website only — reject social hosts so Instagram never becomes Website. */
export function normalizeWebsite(raw: string | null | undefined): string | undefined {
  const v = String(raw || "").trim();
  if (!v || !isHttpUrl(v)) return undefined;
  try {
    const host = new URL(v).hostname.replace(/^www\./, "").toLowerCase();
    if (
      host.includes("instagram.com") ||
      host.includes("facebook.com") ||
      host === "fb.com" ||
      host.includes("wa.me") ||
      host.includes("whatsapp.com") ||
      host === "x.com" ||
      host.includes("twitter.com")
    ) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return v;
}

export function buildStructuredSourceText(
  row: StructuredListingFixture,
  countryNameOverride?: string,
): string {
  const cc = String(row.countryCode || "").toUpperCase();
  const country =
    (countryNameOverride || row.countryName || COUNTRY_NAMES[cc] || cc).trim();
  const city = String(row.city || "").trim();
  const name = String(row.name || "").trim();
  const website = normalizeWebsite(row.website);
  const citation = String(row.primarySourceUrl || website || "").trim();
  const url = citation && isHttpUrl(citation) ? citation : website || "";
  const instagram = normalizeSocialUrl(row.instagram);
  const facebook = normalizeSocialUrl(row.facebook);
  const whatsapp = normalizeWhatsAppUrl(row.whatsapp);
  const twitter = normalizeSocialUrl(row.twitter);
  const email = String(row.email || "").trim();
  const phone = String(row.phone || "").trim();
  const address = String(row.line1 || (city ? `Near ${city}` : "")).trim();

  return [
    url ? `URL: ${url}` : null,
    "Qualified as: padel-club",
    `Name: ${name}`,
    `Venue: ${name}`,
    address ? `Address: ${address}` : null,
    city ? `Locality: ${city}` : null,
    `Country: ${country}`,
    `CountryCode: ${cc}`,
    `Latitude: ${Number(row.lat)}`,
    `Longitude: ${Number(row.lng)}`,
    website ? `Website: ${website}` : null,
    phone ? `Phone: ${phone}` : null,
    email ? `Email: ${email}` : null,
    instagram ? `Instagram: ${instagram}` : null,
    facebook ? `Facebook: ${facebook}` : null,
    whatsapp ? `WhatsApp: ${whatsapp}` : null,
    twitter ? `Twitter: ${twitter}` : null,
    "",
    String(row.description || "").trim(),
    row.region ? `Admin region: ${String(row.region).trim()}` : null,
    row.secondarySourceUrl
      ? `Secondary source: ${String(row.secondarySourceUrl).trim()}`
      : null,
    row.seasonNote ? `Season note: ${String(row.seasonNote).trim()}` : null,
    row.researchNotes ? `Research notes: ${String(row.researchNotes).trim()}` : null,
  ]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join("\n");
}
