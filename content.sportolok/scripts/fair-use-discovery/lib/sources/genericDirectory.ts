/**
 * Generic directory source processor
 * Fetches one page and extracts facility candidates
 */

import type { SourceConfig, Candidate } from "../common";
import { politeFetch } from "../common";
import { extractHungarianSportFacility } from "../hungarianExtract";

export interface ProcessResult {
  sourceId: string;
  success: boolean;
  candidates: Candidate[];
  error?: string;
}

/**
 * Process one page from a generic directory source
 */
export async function processGenericDirectory(
  source: SourceConfig,
  dryRun: boolean = false
): Promise<ProcessResult> {
  console.log(`🔍 Processing source: ${source.name} (${source.id})`);

  try {
    if (dryRun) {
      console.log(`   [DRY RUN] Would fetch: ${source.url}`);
      return {
        sourceId: source.id,
        success: true,
        candidates: [],
      };
    }

    const response = await politeFetch(source.url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`   ✓ Fetched ${html.length} bytes`);

    // Extract candidates
    const candidates = extractHungarianSportFacility(html, source.url, {
      sourceId: source.id,
      sourceUrl: source.url,
      territory: source.territory,
      activityTypes: source.activityTypes,
    });

    console.log(`   ✓ Extracted ${candidates.length} candidate(s)`);

    return {
      sourceId: source.id,
      success: true,
      candidates,
    };
  } catch (error: any) {
    console.error(`   ✗ Error processing ${source.id}:`, error.message);
    return {
      sourceId: source.id,
      success: false,
      candidates: [],
      error: error.message,
    };
  }
}
