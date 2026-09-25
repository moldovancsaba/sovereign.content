/**
 * Ingest-backed task execution for sportolok (replacement path for quarantined Mongo executor).
 *
 * Usage (dry):
 *   INGEST_BASE_URL=https://sport.doneisbetter.com INGEST_API_KEY=… \
 *     npx tsx scripts/run-executor-ingest.ts --dry-run --listing-id=<id>
 *
 * Does not open Mongo. Schedule fields must pass scheduleToRecurringSlots before patch.
 */
import {
  ingestPatch,
  type IngestConfig,
} from "../../../ingest/client.ts";
import { scheduleToRecurringSlots } from "../../../ingest/scheduleToRecurringSlots.ts";

export type IngestExecutorTask = {
  listingId: string;
  /** Deep-merge patch for an already-PUBLISHED listing */
  patch: Record<string, unknown>;
  reason: string;
};

export type IngestExecutorResult = {
  listingId: string;
  outcome: "dry-run" | "success" | "failed";
  reason: string;
  error?: string;
  response?: unknown;
};

function loadConfig(): IngestConfig {
  const baseUrl =
    process.env.INGEST_BASE_URL ||
    process.env.SPORT_INGEST_BASE_URL ||
    "https://sport.doneisbetter.com";
  const apiKey = process.env.INGEST_API_KEY || process.env.SPORT_INGEST_API_KEY || "";
  if (!apiKey) {
    throw new Error("INGEST_API_KEY required (never use MONGODB_URI from agent home)");
  }
  return { baseUrl, apiKey };
}

/** Normalize schedule patches if present. */
export function normalizePatch(patch: Record<string, unknown>): Record<string, unknown> {
  const next = { ...patch };
  const schedule = next.schedule;
  if (schedule && typeof schedule === "object") {
    const s = schedule as Record<string, unknown>;
    if ("recurring" in s) {
      next.schedule = {
        ...s,
        recurring: scheduleToRecurringSlots(s.recurring),
      };
    }
  }
  return next;
}

export async function executeIngestTask(
  task: IngestExecutorTask,
  opts: { dryRun?: boolean; cfg?: IngestConfig } = {},
): Promise<IngestExecutorResult> {
  const patch = normalizePatch(task.patch);
  if (opts.dryRun) {
    return {
      listingId: task.listingId,
      outcome: "dry-run",
      reason: task.reason,
      response: { wouldPatch: patch },
    };
  }
  const cfg = opts.cfg ?? loadConfig();
  try {
    const response = await ingestPatch(cfg, { id: task.listingId, patch });
    return {
      listingId: task.listingId,
      outcome: "success",
      reason: task.reason,
      response,
    };
  } catch (err) {
    return {
      listingId: task.listingId,
      outcome: "failed",
      reason: task.reason,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
