/**
 * Hungarian-specific fact extraction from HTML
 * Fair-use: extract structured facts, never verbatim copyrighted copy
 */

import type { Candidate } from "./common";

export interface ExtractOptions {
  sourceId: string;
  sourceUrl: string;
  territory: string;
  activityTypes: string[];
}

/**
 * Generic Hungarian sport facility extractor
 * Extracts structured facts without copying descriptions or URLs
 */
export function extractHungarianSportFacility(
  html: string,
  url: string,
  opts: ExtractOptions
): Candidate[] {
  const candidates: Candidate[] = [];

  // Basic patterns for Hungarian facility data
  const titlePatterns = [
    /<h[1-3][^>]*>([^<]+(?:uszoda|medence|edzőterem|fitness|sportközpont)[^<]*)<\/h[1-3]>/gi,
    /<title>([^<]+)<\/title>/i,
  ];

  const addressPatterns = [
    /(?:cím|address|helyszín)[:：]\s*([^<\n]{10,100})/gi,
    /(\d{4}\s+[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+[^<\n]{10,80})/g,
  ];

  const phonePatterns = [
    /(?:tel|telefon|phone)[:：]?\s*([\d\s\+\-\(\)]{8,20})/gi,
    /\+36[\s\-]?\d{1,2}[\s\-]?\d{3}[\s\-]?\d{4}/g,
  ];

  const emailPatterns = [
    /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi,
  ];

  // Extract titles
  let title: string | undefined;
  for (const pattern of titlePatterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      title = cleanText(match[1]);
      if (title.length > 5) break;
    }
  }

  if (!title) return candidates;

  // Extract address
  let address: string | undefined;
  for (const pattern of addressPatterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      address = cleanText(match[1]);
      if (address.length >= 10) break;
    }
  }

  // Extract phone
  let phone: string | undefined;
  for (const pattern of phonePatterns) {
    const match = pattern.exec(html);
    if (match?.[1] || match?.[0]) {
      phone = cleanText(match[1] || match[0]);
      break;
    }
  }

  // Extract email
  let email: string | undefined;
  for (const pattern of emailPatterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      email = match[1].toLowerCase();
      break;
    }
  }

  // Detect activity type
  const activityType = detectActivityType(html, title, opts.activityTypes);

  // Build candidate
  const seedId = generateSeedId(title, address);
  candidates.push({
    seedId,
    sourceId: opts.sourceId,
    discoveryUrl: url,
    territory: opts.territory,
    activityType,
    title,
    address,
    contact: {
      phone,
      email,
    },
    extractedFacts: {
      hasPhone: !!phone,
      hasEmail: !!email,
      hasAddress: !!address,
    },
    confidence: calculateConfidence({ title, address, phone, email }),
    discoveredAt: new Date().toISOString(),
  });

  return candidates;
}

/**
 * Clean extracted text
 */
function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect activity type from content
 */
function detectActivityType(
  html: string,
  title: string,
  allowed: string[]
): string {
  const combined = (html + title).toLowerCase();

  const keywords: Record<string, string[]> = {
    swimming: ["uszoda", "medence", "úszás", "swimming"],
    fitness: ["edzőterem", "fitness", "konditerem", "gym"],
    tennis: ["tenisz", "tennis"],
    "water-polo": ["vízilabda", "waterpolo"],
    yoga: ["yoga", "jóga"],
    martial: ["harcművészet", "karate", "judo", "aikido"],
    dance: ["tánc", "dance"],
    team: ["csapatsport", "foci", "football", "kosár", "basketball"],
  };

  for (const [type, words] of Object.entries(keywords)) {
    if (allowed.includes(type) || allowed.includes("various")) {
      for (const word of words) {
        if (combined.includes(word)) {
          return type;
        }
      }
    }
  }

  return allowed[0] || "various";
}

/**
 * Generate deterministic seed ID
 */
function generateSeedId(title: string, address?: string): string {
  const key = (title + (address || "")).toLowerCase().replace(/\s+/g, "-");
  const hash = simpleHash(key);
  return `seed-hun-${hash}`;
}

/**
 * Simple hash for ID generation
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Calculate confidence score
 */
function calculateConfidence(data: {
  title: string;
  address?: string;
  phone?: string;
  email?: string;
}): "high" | "medium" | "low" {
  let score = 0;
  if (data.title) score += 1;
  if (data.address) score += 2;
  if (data.phone) score += 1;
  if (data.email) score += 1;

  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}
