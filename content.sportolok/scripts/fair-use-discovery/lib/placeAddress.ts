/**
 * Honest place lines for fair-use enrich → ingest.
 *
 * - Phone is optional — never reject for a missing phone.
 * - No street → city-level `Near {city}` + Nominatim locality pin (engine geoPrecision: locality).
 * - Empty fields stay empty (honest debt); never invent streets/phones.
 */

export function isStreetLevel(address?: string): boolean {
  if (!address) return false;
  return (
    /\d{4}\s+\S+/.test(address) ||
    /^\d+\s+\S+/.test(address) ||
    /\s\d+[.,]?\s*(utca|út|útja|tér|körút|krt)/i.test(address)
  );
}

export type PlaceLine = {
  /** Street address, or `Near {city}` when only locality is known. */
  line1: string;
  locality: string;
  streetLevel: boolean;
};

function firstCommaPart(s: string): string {
  return s.split(",")[0]?.trim() || s.trim();
}

/** Settlement token from a venue name when the page gave no street (evidence in the name only). */
export function cityFromName(name?: string): string | undefined {
  if (!name) return undefined;
  const rules: Array<[RegExp, string]> = [
    [/\bSzázhalombatta\b|\bSzazhalombatta\b/i, "Százhalombatta"],
    [/\bBudapest\b/i, "Budapest"],
    [/\bDebrecen\b/i, "Debrecen"],
    [/\bSzeged\b/i, "Szeged"],
    [/\bPécs\b|\bPecs\b/i, "Pécs"],
    [/\bGyőr\b|\bGyor\b/i, "Győr"],
    [/\bVeszprém\b|\bVeszprem\b/i, "Veszprém"],
    [/\bMiskolc\b/i, "Miskolc"],
    [/\bSzékesfehérvár\b|\bSzekesfehervar\b/i, "Székesfehérvár"],
    [/\bNyíregyháza\b|\bNyiregyhaza\b/i, "Nyíregyháza"],
    [/\bKecskemét\b|\bKecskemet\b/i, "Kecskemét"],
    [/\bSzombathely\b/i, "Szombathely"],
    [/\bSopron\b/i, "Sopron"],
    [/\bÉrd\b|\bErd\b/i, "Érd"],
  ];
  for (const [re, city] of rules) {
    if (re.test(name)) return city;
  }
  // NSÜ national swimming complexes without a city token are Budapest except Veszprém (matched above).
  if (/Nemzeti Uszo Es Vizilabda Olimpiai Kozpont|Nemzeti Úszó/i.test(name)) {
    return "Budapest";
  }
  return undefined;
}

/**
 * Best-known settlement for a seed. Territory HUN-BUD → Budapest; HT locality-only
 * addresses; never invents a city from country alone when nothing else exists.
 */
export function deriveLocality(args: {
  address?: string;
  territory?: string;
  countryCode?: string;
  countryLocalityFallback?: string;
  name?: string;
}): string | undefined {
  const addr = args.address?.trim();
  if (addr) {
    const head = firstCommaPart(addr);
    // "Budapest IV" / "Hungary" alone — strip bare country; keep district-bearing locality.
    if (head && !/^(hungary|magyarország)$/i.test(head)) {
      if (/^budapest\b/i.test(head)) return "Budapest";
      return head;
    }
  }
  if (args.territory === "HUN-BUD") return "Budapest";
  const fromName = cityFromName(args.name);
  if (fromName) return fromName;
  if (args.countryLocalityFallback?.trim()) return args.countryLocalityFallback.trim();
  return undefined;
}

/** Resolve line1 + locality for structured sourceText headers. */
export function resolvePlaceLine(args: {
  address?: string;
  territory?: string;
  countryCode?: string;
  name?: string;
  /** e.g. HT country label in HU when no city is known */
  countryLocalityFallback?: string;
  /**
   * Absolute last resort (country name). Prefer omitting over `Near Hungary` for itthon —
   * country pins are too coarse. HT may pass a country label when that is the only fact.
   */
  countryName?: string;
}): PlaceLine | null {
  const addr = args.address?.trim();
  if (addr && isStreetLevel(addr)) {
    // Prefer territory / HU postal city over raw "1234 Budapest" first segment.
    const postalCity = addr.match(/\b\d{4}\s+([A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű-]{2,})\b/)?.[1];
    const locality =
      deriveLocality({ ...args, address: undefined }) ||
      postalCity ||
      (args.countryName?.trim() ? args.countryName.trim() : undefined);
    if (!locality) return null;
    return { line1: addr, locality, streetLevel: true };
  }

  const locality =
    deriveLocality(args) ||
    (args.countryName?.trim() ? args.countryName.trim() : undefined);
  if (!locality) return null;

  // City-level or missing street — honest Near pin; empty phone stays empty.
  // Prefer deriveLocality (normalizes "Budapest IV" → Budapest) over raw first segment.
  return { line1: `Near ${locality}`, locality, streetLevel: false };
}
