/**
 * Public read helpers for sportolok — no Mongo.
 * Listing IDs from sitemap; facts from public listing HTML / JSON-LD.
 */

const BASE = (
  process.env.INGEST_BASE_URL ||
  process.env.SPORT_INGEST_BASE_URL ||
  "https://sport.doneisbetter.com"
).replace(/\/$/, "");

export type PublicListing = {
  id: string;
  name: string;
  description: string;
  website?: string;
  locality?: string;
};

export async function listPublishedIds(limit = 50): Promise<string[]> {
  const res = await fetch(`${BASE}/sitemap.xml`, {
    headers: { "user-agent": "SportolokAgent/1.0 (+https://sport.doneisbetter.com)" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  const xml = await res.text();
  const ids: string[] = [];
  const re = /\/listing\/(l-[a-zA-Z0-9._-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (!ids.includes(m[1])) ids.push(m[1]);
    if (ids.length >= limit) break;
  }
  return ids;
}

export async function fetchPublicListing(id: string): Promise<PublicListing | null> {
  try {
    const res = await fetch(`${BASE}/listing/${encodeURIComponent(id)}`, {
      headers: { "user-agent": "SportolokAgent/1.0 (+https://sport.doneisbetter.com)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const ldMatch = html.match(
      /<script type="application\/ld\+json">(\{[\s\S]*?"@type"\s*:\s*"LocalBusiness"[\s\S]*?\})<\/script>/,
    );
    let name = "";
    let description = "";
    let website: string | undefined;
    let locality: string | undefined;

    if (ldMatch?.[1]) {
      try {
        const ld = JSON.parse(ldMatch[1]) as Record<string, unknown>;
        name = String(ld.name || "");
        description = String(ld.description || "");
        if (typeof ld.sameAs === "string") website = ld.sameAs;
        const addr = ld.address as Record<string, unknown> | undefined;
        if (addr?.addressLocality) locality = String(addr.addressLocality);
      } catch {
        /* fall through */
      }
    }

    if (!name) {
      const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1];
      name = h1?.trim() || id;
    }
    if (!description) {
      const meta = html.match(
        /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i,
      )?.[1];
      description = meta?.trim() || "";
    }
    if (!website) {
      const same = html.match(/"sameAs"\s*:\s*"(https?:[^"]+)"/)?.[1];
      website = same;
    }

    return { id, name, description, website, locality };
  } catch {
    return null;
  }
}

export function scoreAbout(description: string): number {
  if (!description || description.length < 40) return 0;
  if (description.length < 80) return 15;
  let score = 40;
  if (description.length >= 120) score += 15;
  if (description.length >= 200) score += 15;
  if (description.length >= 300) score += 10;
  const sentences = description.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length >= 2) score += 10;
  if (sentences.length >= 3) score += 5;
  if (/\d{1,2}:\d{2}/.test(description)) score += 5;
  if (/\b(Budapest|Hungary|Magyarország|uszoda|fitness|tenisz)\b/i.test(description)) score += 5;
  return Math.min(100, score);
}
