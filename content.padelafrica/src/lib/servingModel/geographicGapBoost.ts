/**
 * Geographic gap promote factor (sportolok B2 / adoption P1).
 *
 * On a mature catalogue, listings in sparse geo cells get a small boost to
 * `popularityRank` so visitors discover underserved places. This never touches the publish gate —
 * only delivery / promotion ranking.
 *
 * Cell key preference: ISO country code, else locality. Listings with neither get no boost.
 */
import type { Listing } from "@/lib/entity/listing";

/** Max additive boost onto a popularity score in ~[0,1]. Keeps quality/engagement dominant. */
export const GEO_GAP_BOOST_MAX = 0.15;

export type GeoCellKey = string;

/** Stable cell id for gap counting — `cc:ZA` or `loc:cape town`. Null when no usable place. */
export function geoCellKey(listing: Pick<Listing, "venue">): GeoCellKey | null {
  const addr = listing.venue?.address;
  if (!addr) return null;
  const cc = typeof addr.countryCode === "string" ? addr.countryCode.trim().toUpperCase() : "";
  if (cc) return `cc:${cc}`;
  const loc = typeof addr.locality === "string" ? addr.locality.trim().toLowerCase() : "";
  if (loc) return `loc:${loc}`;
  return null;
}

/**
 * Scarcity boost in [0, GEO_GAP_BOOST_MAX]. Pure given peer/densest counts.
 * Alone in a cell (or densest ≤ 0) → max boost; equal to densest → 0.
 */
export function geographicGapBoost(peerCount: number, densestCount: number): number {
  if (peerCount <= 0) return GEO_GAP_BOOST_MAX;
  if (densestCount <= 0) return 0;
  const scarcity = 1 - Math.min(peerCount, densestCount) / densestCount;
  return Math.max(0, Math.min(GEO_GAP_BOOST_MAX, scarcity * GEO_GAP_BOOST_MAX));
}

/** Count published listings per geo cell (listings with no cell are ignored). */
export function countGeoCells(listings: Array<Pick<Listing, "venue">>): Map<GeoCellKey, number> {
  const counts = new Map<GeoCellKey, number>();
  for (const listing of listings) {
    const key = geoCellKey(listing);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Per-listing additive boost from geo-cell scarcity. Pure. Listings outside any cell get 0.
 * `densest` defaults to the max observed cell count.
 */
export function geographicGapBoostByListingId(
  listings: Array<Pick<Listing, "id" | "venue">>,
  counts?: Map<GeoCellKey, number>,
): Map<string, number> {
  const cellCounts = counts ?? countGeoCells(listings);
  let densest = 0;
  for (const n of cellCounts.values()) if (n > densest) densest = n;
  const out = new Map<string, number>();
  for (const listing of listings) {
    const key = geoCellKey(listing);
    if (!key) {
      out.set(listing.id, 0);
      continue;
    }
    out.set(listing.id, geographicGapBoost(cellCounts.get(key) ?? 0, densest));
  }
  return out;
}

/** Apply additive geo boosts onto an existing popularity rank map (mutates a copy). */
export function applyGeographicGapBoosts(ranks: Map<string, number>, boosts: Map<string, number>): Map<string, number> {
  const out = new Map(ranks);
  for (const [id, rank] of out) {
    const boost = boosts.get(id) ?? 0;
    if (boost > 0) out.set(id, rank + boost);
  }
  return out;
}
