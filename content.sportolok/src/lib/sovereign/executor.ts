/**
 * Smart task executor — QUARANTINED.
 *
 * Migrated out of moldovancsaba/management. Must NOT open Mongo or write listings directly.
 * Use sovereign.content/sportolok/ingest/client.ts (POST /api/ingest) and
 * scheduleToRecurringSlots before any content write.
 *
 * @deprecated Mongo execution paths — rewrite to ingest before use.
 */

import type { Db } from "mongodb";
import type { TaskClassification } from "./lessons.js";

export interface ExecutionResult {
  taskId: string;
  status: "success" | "partial" | "failed";
  summary: string;
  affected: number;
  succeeded: number;
  failed: number;
  details: Array<{
    listingId: string;
    name: string;
    action: string;
    outcome: "success" | "failed";
    before?: unknown;
    after?: unknown;
    reasoning?: string;
    error?: string;
  }>;
  executionTimeMs: number;
  reviewDocPath?: string;
}

export interface TaskExecutor {
  execute(db: Db, task: TaskClassification, dryRun: boolean): Promise<ExecutionResult>;
}

function quarantined(): never {
  throw new Error(
    "sportolok sovereign executor is quarantined — use ingest/client.ts (POST /api/ingest), not Mongo",
  );
}

/** @deprecated */
export class MediaEnrichExecutor implements TaskExecutor {
  async execute(_db: Db, _task: TaskClassification, _dryRun: boolean): Promise<ExecutionResult> {
    return quarantined();
  }
}

/** @deprecated */
export async function executeTask(
  _db: Db,
  _task: TaskClassification,
  _dryRun = false,
): Promise<ExecutionResult> {
  return quarantined();
}

/** @deprecated */
export async function executeTaskBatch(
  _db: Db,
  _tasks: TaskClassification[],
  _dryRun = false,
): Promise<ExecutionResult[]> {
  return quarantined();
}
