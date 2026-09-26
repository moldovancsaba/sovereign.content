/**
 * Seed builder - transform candidates to find-seeds.json format
 * Based on ClassScout pattern for deep enrichment queue
 */

import type { Candidate } from "./common";
import fs from "fs";
import path from "path";

export interface FindSeed {
  seedId: string;
  discoveryDate: string;
  researchSources: Array<{
    sourceId: string;
    url: string;
    discoveredAt: string;
  }>;
  territory: string;
  /** Product camera when set (itthon default / hataron-tul) */
  camera?: "itthon" | "hataron-tul";
  /** ISO country for Határon túl seeds */
  countryCode?: string;
  activityType: string;
  initialFacts: {
    name: string;
    address?: string;
    contact?: {
      phone?: string;
      email?: string;
      website?: string;
    };
  };
  confidence: "high" | "medium" | "low";
  status: "pending" | "enriching" | "ingested" | "rejected";
}

/**
 * Load existing find-seeds.json
 */
export function loadFindSeeds(filePath: string): Record<string, FindSeed> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Save find-seeds.json
 */
export function saveFindSeeds(
  filePath: string,
  seeds: Record<string, FindSeed>
): void {
  fs.writeFileSync(filePath, JSON.stringify(seeds, null, 2));
}

/**
 * Add or merge candidate into find-seeds
 */
export function addCandidateToSeeds(
  seeds: Record<string, FindSeed>,
  candidate: Candidate
): void {
  const existing = seeds[candidate.seedId];

  if (existing) {
    // Merge: add new research source if not duplicate
    const sourceExists = existing.researchSources.some(
      (s) => s.url === candidate.discoveryUrl
    );
    if (!sourceExists) {
      existing.researchSources.push({
        sourceId: candidate.sourceId,
        url: candidate.discoveryUrl,
        discoveredAt: candidate.discoveredAt,
      });
    }

    // Upgrade confidence if new is higher
    if (
      candidate.confidence === "high" ||
      (candidate.confidence === "medium" && existing.confidence === "low")
    ) {
      existing.confidence = candidate.confidence;
    }

    // Merge contact info
    if (candidate.contact?.phone && !existing.initialFacts.contact?.phone) {
      existing.initialFacts.contact = existing.initialFacts.contact || {};
      existing.initialFacts.contact.phone = candidate.contact.phone;
    }
    if (candidate.contact?.email && !existing.initialFacts.contact?.email) {
      existing.initialFacts.contact = existing.initialFacts.contact || {};
      existing.initialFacts.contact.email = candidate.contact.email;
    }
  } else {
    // New seed
    const camera =
      candidate.extractedFacts?.camera === "hataron-tul" ||
      candidate.territory === "HATARON-TUL"
        ? ("hataron-tul" as const)
        : undefined;
    const countryCode =
      typeof candidate.extractedFacts?.countryCode === "string"
        ? candidate.extractedFacts.countryCode
        : undefined;
    seeds[candidate.seedId] = {
      seedId: candidate.seedId,
      discoveryDate: candidate.discoveredAt.split("T")[0],
      researchSources: [
        {
          sourceId: candidate.sourceId,
          url: candidate.discoveryUrl,
          discoveredAt: candidate.discoveredAt,
        },
      ],
      territory: candidate.territory,
      ...(camera ? { camera } : {}),
      ...(countryCode ? { countryCode } : {}),
      activityType: candidate.activityType,
      initialFacts: {
        name: candidate.title,
        address: candidate.address,
        contact: candidate.contact,
      },
      confidence: candidate.confidence,
      status: "pending",
    };
  }
}

/**
 * Get pending seeds ready for enrichment (high confidence first)
 */
export function getPendingSeeds(seeds: Record<string, FindSeed>): FindSeed[] {
  return Object.values(seeds)
    .filter((s) => s.status === "pending")
    .sort((a, b) => {
      const confOrder = { high: 0, medium: 1, low: 2 };
      return confOrder[a.confidence] - confOrder[b.confidence];
    });
}

/**
 * Mark seed as enriching
 */
export function markSeedEnriching(
  seeds: Record<string, FindSeed>,
  seedId: string
): void {
  if (seeds[seedId]) {
    seeds[seedId].status = "enriching";
  }
}

/**
 * Mark seed as ingested
 */
export function markSeedIngested(
  seeds: Record<string, FindSeed>,
  seedId: string
): void {
  if (seeds[seedId]) {
    seeds[seedId].status = "ingested";
  }
}

/**
 * Mark seed as rejected
 */
export function markSeedRejected(
  seeds: Record<string, FindSeed>,
  seedId: string
): void {
  if (seeds[seedId]) {
    seeds[seedId].status = "rejected";
  }
}
