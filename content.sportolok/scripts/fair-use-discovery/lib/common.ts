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
  if (!headers.has("User-Agent")) {
    headers.set(
      "User-Agent",
      "SportolokDiscoveryBot/1.0 (content.sportolok; research use; +https://sport.doneisbetter.com)"
    );
  }

  return fetch(url, {
    ...opts,
    headers,
  });
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
