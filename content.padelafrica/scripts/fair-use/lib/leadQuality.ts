/**
 * Reject directory chrome / hub pages / one-off events before they become candidates.
 */

import { hostOf } from "./common.ts";

const HUB_NAME_RE =
  /^(home|index|directory|annuaire|clubs?|countries|africa|blog|category|search|about|contact|login|sign.?up|what.?s?\s+is|quiénes|qui\s+sommes)$/i;

const ONE_OFF_RE =
  /\b(tournament|open|championship|cup\s+20\d{2}|festival|expo|one[\s-]?off|pop[\s-]?up)\b/i;

const GUIDE_RE =
  /\b(best\s+padel|guide\s+to|top\s+\d+|where\s+to\s+play|how\s+to|complete\s+list|what.?s?\s+is\s+padel|about\s+us|privacy|cookie|terms|padel\s+courts?\s+in|pistas?\s+de\s+padel|padel\s+live|padel\s+results?)\b/i;

export function isJunkWebsite(website: string, sourceHost: string): boolean {
  const h = hostOf(website);
  if (!h) return true;
  if (h === sourceHost.replace(/^www\./, "")) return true;
  if (/wa\.me|whatsapp|facebook|instagram|twitter|youtube|tiktok|linkedin/i.test(h)) return true;
  return false;
}

export function isAcceptableLead(facts: {
  name: string;
  website: string;
  citationUrl: string;
}): { ok: true } | { ok: false; reason: string } {
  const name = String(facts.name || "")
    .trim()
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'");
  if (!name || name.length < 3) return { ok: false, reason: "empty_name" };
  if (HUB_NAME_RE.test(name)) return { ok: false, reason: "guide_or_hub_name" };
  if (ONE_OFF_RE.test(name)) return { ok: false, reason: "one_off_event" };
  if (GUIDE_RE.test(name)) return { ok: false, reason: "guide_or_hub_name" };
  if (!/padel|club|court|arena|sport|tennis|complexe|centro|centre/i.test(name)) {
    // Allow booking-network studio names without "padel" if website looks like a club page
    if (!facts.website || !/club|padel|court/i.test(facts.website)) {
      return { ok: false, reason: "not_club_like_name" };
    }
  }
  return { ok: true };
}

export function isDeadHubUrl(url: string): boolean {
  if (/\.(css|js|mjs|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|pdf|xml|txt|php)(\?|$)/i.test(url)) {
    return true;
  }
  if (/\/(wp-content|wp-includes|wp-json|cdn-cgi|assets\/|static\/|cart\/?|checkout|my-account|xmlrpc)/i.test(url)) {
    return true;
  }
  if (
    /\/(tag|category|author|page\/\d+|feed|whats?-?is|what-is|about|privacy|cookie|terms|padel-live|padel-results|llms)(\/|$)/i.test(
      url,
    )
  ) {
    return true;
  }
  // Non-Africa padel lands region indices
  if (/padellands\.com\/.+\/(espana|spain|francia|france|italia|italy|portugal|uk|usa|basque-country)\b/i.test(url)) {
    return true;
  }
  // Spain / EU court indices only — Africa lives under otros-paises/
  if (/\/pistas-de-padel\/(?!otros-paises)/i.test(url)) return true;
  return false;
}

/** Detail URLs worth fetching — club/venue cards only. */
export function isPromisingDetailUrl(url: string): boolean {
  if (isDeadHubUrl(url)) return false;
  const path = url.toLowerCase();
  if (/\/(countries|country|annuaire-des-clubs|directory\/?$|clubs\/?$|en-us\/padel\/?$)(\/?$|\?)/i.test(path)) {
    return false;
  }
  // Country court indices are discovery pages, not club cards
  if (/\/pistas-de-padel\/otros-paises\/[a-z-]+\/?$/i.test(path)) return false;
  // Explicit club-card patterns
  if (/padel-club|\/clubs?\/[a-z0-9][\w-]+\/?$|\/club\/[a-z0-9]|\/venues?\/[a-z0-9]|\/providers?\/[a-z0-9]/i.test(path)) {
    return true;
  }
  // Actu / directory club cards
  if (/\/directory\/.+\/padel-club\//i.test(path)) return true;
  // Padel Lands club slug pages (root /club-name/ or /sxm-padel-club/)
  if (/padellands\.com\/(club-[a-z0-9][\w-]+|[a-z0-9][\w-]*padel[\w-]*)\/?$/i.test(path)) {
    return true;
  }
  // Country club listing pages on padellands that still need another hop are OK as discovery only —
  // do not treat bare country pages as detail seeds.
  if (/\/countries\/[a-z-]+\/?$/i.test(path)) return false;
  // WordPress ?p= permalinks rarely carry usable club H1 without chrome — skip
  if (/[?&]p=\d+/i.test(path)) return false;
  return false;
}
