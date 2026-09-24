/**
 * Open unified debt recommendations from job residue (contact/media/geo evidence walls).
 * Never invents contacts — only records what needs agent research.
 */
import {
  recommendationId,
  type QualityKind,
  type QualityListingSnapshot,
  type QualityRecommendation,
} from "@/lib/listingQuality/types";

export type ContactEnrichLikeResult = {
  listingId: string;
  status: "applied" | "skipped" | "failed";
  fields?: string[];
  reason?: string;
};

export type MediaCurateLikeResult = {
  listingId: string;
  status: "applied" | "skipped" | "failed";
  reason?: string;
};

function baseRec(
  listingId: string,
  kind: QualityKind,
  message: string,
  evidence: string[],
  now: string,
  severity: "high" | "medium" | "low" = "medium",
): QualityRecommendation {
  return {
    id: recommendationId(listingId, kind),
    listingId,
    kind,
    severity,
    scoreBefore: 0,
    message,
    evidence: evidence.slice(0, 12),
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
}

/** Contact enrich `no_evidence` → contact_gap + research_needed (agent brief).
 * Skip when the published listing already has phone/website/email (false-positive wall).
 */
export function recommendationsFromContactEnrich(
  results: ContactEnrichLikeResult[],
  snapshots: Map<string, QualityListingSnapshot | null>,
  now: string,
  opts: { maxListings?: number } = {},
): QualityRecommendation[] {
  const maxListings = Math.max(1, opts.maxListings ?? 5);
  const out: QualityRecommendation[] = [];
  let listings = 0;
  for (const row of results) {
    if (row.status !== "skipped" || row.reason !== "no_evidence") continue;
    if (listings >= maxListings) break;
    const snap = snapshots.get(row.listingId);
    const hasContact = Boolean(
      snap?.phone?.trim() || snap?.website?.trim() || (snap as { email?: string } | null)?.email?.trim(),
    );
    if (hasContact) continue;
    listings += 1;
    const name = snap?.name?.trim() || row.listingId;
    out.push(
      baseRec(
        row.listingId,
        "contact_gap",
        `${name}: missing phone/website/email with no sourceText evidence`,
        [`reason:no_evidence`, `fields:${(row.fields || []).join(",") || "none"}`],
        now,
        "medium",
      ),
    );
    out.push(
      baseRec(
        row.listingId,
        "research_needed",
        `${name}: agent research required for contact evidence`,
        [`from:contact_enrich`, `reason:no_evidence`],
        now,
        "low",
      ),
    );
  }
  return out;
}

/** Media curate failures / empty skips → media_thin when still empty after a pass. */
export function recommendationsFromMediaCurate(
  results: MediaCurateLikeResult[],
  now: string,
): QualityRecommendation[] {
  const out: QualityRecommendation[] = [];
  for (const row of results) {
    if (row.status === "applied") continue;
    if (row.status === "skipped" && row.reason === "already_has_media") continue;
    out.push(
      baseRec(
        row.listingId,
        "media_thin",
        `${row.listingId}: media curate ${row.status}${row.reason ? ` (${row.reason})` : ""}`,
        [`status:${row.status}`, row.reason ? `reason:${row.reason}` : "reason:unknown"].filter(Boolean),
        now,
        row.status === "failed" ? "high" : "low",
      ),
    );
  }
  return out;
}
