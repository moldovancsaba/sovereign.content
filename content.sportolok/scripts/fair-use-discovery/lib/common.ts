/**
 * Fair-use discovery shared utilities
 * Based on content.classscout/scripts/rqk-fair-use pattern
 */

import { setTimeout } from "node:timers/promises";
import fs from "fs";
import path from "path";

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  cooldownSec: number;
  territory: string;
  activityTypes: string[];
  status: "planned" | "active" | "paused";
}

export interface SourceRegistry {
  updatedAt: string;
  description: string;
  defaultInterSourceSec: number;
  defaultPassSleepSec: number;
  defaultCooldownSec: number;
  sources: SourceConfig[];
}

export interface SourceState {
  sourceId: string;
  lastFetchMs?: number;
  lastStatus?: "ok" | "error";
  lastError?: string;
}

export interface Candidate {
  seedId: string;
  sourceId: string;
  discoveryUrl: string;
  territory: string;
  activityType: string;
  title: string;
  address?: string;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  extractedFacts: Record<string, any>;
  confidence: "high" | "medium" | "low";
  discoveredAt: string;
}

/**
 * Polite HTTP fetch with User-Agent disclosure
 */
export async function politeFetch(
  url: string,
  opts: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(opts.headers);
  // Disclose research purpose; some municipal CDNs 403 bare bot tokens — keep contact URL.
  if (!headers.has("User-Agent")) {
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (compatible; SportolokFairUse/1.0; +https://sport.doneisbetter.com; research)"
    );
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8");
  }
  if (!headers.has("Accept-Language")) {
    headers.set("Accept-Language", "hu-HU,hu;q=0.9,en;q=0.5");
  }

  try {
    return await fetch(url, {
      ...opts,
      headers,
      redirect: "follow",
    });
  } catch (err: unknown) {
    // Some kerület sites present incomplete TLS chains in Node.
    const cause = err as { cause?: { code?: string }; code?: string; message?: string };
    const code = cause?.cause?.code || cause?.code || "";
    const msg = String(cause?.message || err);
    if (
      /UNABLE_TO_VERIFY|CERT_|SSL|TLS/i.test(code + msg) &&
      /\.hu(\/|$)/i.test(url) &&
      process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0"
    ) {
      console.warn(`   ⚠️  TLS verify failed — retry with NODE_TLS_REJECT_UNAUTHORIZED=0 for ${new URL(url).hostname}`);
      const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      try {
        return await fetch(url, {
          ...opts,
          headers,
          redirect: "follow",
        });
      } finally {
        if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
      }
    }
    throw err;
  }
}

/**
 * Rate-limit sleep between sources
 */
export async function sleepBetweenSources(sec: number): Promise<void> {
  console.log(`⏸️  Sleeping ${sec}s between sources...`);
  await setTimeout(sec * 1000);
}

/**
 * Check if source is ready (cooldown elapsed)
 */
export function isSourceReady(
  state: SourceState | undefined,
  cooldownSec: number,
  nowMs: number
): boolean {
  if (!state?.lastFetchMs) return true;
  const elapsedSec = (nowMs - state.lastFetchMs) / 1000;
  return elapsedSec >= cooldownSec;
}

/**
 * Load source state from disk
 */
export function loadSourceState(
  stateFile: string
): Record<string, SourceState> {
  try {
    if (!fs.existsSync(stateFile)) return {};
    return JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  } catch {
    return {};
  }
}

/**
 * Save source state to disk
 */
export function saveSourceState(
  stateFile: string,
  state: Record<string, SourceState>
): void {
  const dir = path.dirname(stateFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}
