/**
 * Persist FIND attempt log — rotates zero-result cells on the continent plan.
 * File-backed under scripts/data so Cloud Agent ticks share state without a new Mongo schema.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { FindAttempt } from "./plan";

export const DEFAULT_ATTEMPTS_PATH = resolve("scripts/data/padel-africa-find-attempts.json");

export function loadAttempts(path = DEFAULT_ATTEMPTS_PATH): FindAttempt[] {
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { attempts?: FindAttempt[] } | FindAttempt[];
    if (Array.isArray(raw)) return raw;
    return Array.isArray(raw.attempts) ? raw.attempts : [];
  } catch {
    return [];
  }
}

export function recordAttempt(
  attempt: FindAttempt,
  path = DEFAULT_ATTEMPTS_PATH,
): FindAttempt[] {
  const prev = loadAttempts(path);
  const next = [...prev, attempt];
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ updatedAt: new Date().toISOString(), attempts: next }, null, 2) + "\n");
  return next;
}
