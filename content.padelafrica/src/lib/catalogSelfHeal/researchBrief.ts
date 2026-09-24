/**
 * Agent research brief for evidence-wall debt (contact/geo/media) — FIND-style honesty bar.
 */
import type { QualityKind, QualityListingSnapshot } from "@/lib/listingQuality/types";
import type { ResearchGapBrief } from "./types";

export const RESEARCH_EVIDENCE_BAR = [
  "Named operating venue already in the catalogue (do not invent a new club here).",
  "Contact/geo/media fact printed on a first-party or booking page — never invent phones/emails.",
  "Prefer two independent sources when claiming a new phone or website.",
  "If no public evidence: leave the gap; record process lesson evidence_wall — do not guess.",
] as const;

export function buildResearchGapBrief(
  listing: QualityListingSnapshot,
  kind: QualityKind = "research_needed",
): ResearchGapBrief {
  const name = listing.name.trim() || listing.id;
  const city = listing.locality?.trim() || "";
  const cc = listing.countryCode?.trim() || "";
  const place = [city, cc].filter(Boolean).join(" ");
  const queries = [
    `"${name}" padel ${place}`.trim(),
    `"${name}" ${place} (phone OR WhatsApp OR book OR contact)`.trim(),
    listing.website ? `site:${safeHost(listing.website)} contact OR phone` : `"${name}" official website`,
    `"${name}" padel Instagram OR Facebook`,
  ].filter(Boolean);

  return {
    job: "catalog:self-heal",
    mode: "research-brief",
    agentRequired: true,
    listingId: listing.id,
    kind,
    name,
    locality: listing.locality,
    countryCode: listing.countryCode,
    searchQueries: queries,
    evidenceBar: [...RESEARCH_EVIDENCE_BAR],
    neverInvent: ["phone", "email", "court counts", "prices", "ages"],
    steps: [
      "Run each searchQueries entry via WebSearch. Open first-party / booking pages only.",
      `Focus listing ${listing.id} (${name}${place ? ` — ${place}` : ""}). Kind: ${kind}.`,
      "If phone/website/email is printed, apply via catalog:contact-enrich evidence path or a verified fixture patch — never invent.",
      "If still no evidence: leave contact_gap open; record process lesson evidence_wall.",
      "Do not invent a new venue — this brief heals an existing published card.",
    ],
  };
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || url;
  }
}
