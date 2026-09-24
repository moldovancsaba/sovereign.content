#!/usr/bin/env node
/**
 * Backward-compatible single-source entry (defaults to RQK).
 * Prefer one-pass.cjs for the full multi-source walk.
 *
 * FAIR_USE_ONLY=<sourceId> to target one peer source.
 */
process.env.FAIR_USE_ONLY = process.env.FAIR_USE_ONLY || process.env.RQK_ONLY || "rqk";
// Inter-source delay irrelevant for a single source
process.env.FAIR_USE_INTER_SOURCE_SEC = process.env.FAIR_USE_INTER_SOURCE_SEC || "0";

if (process.env.RQK_CHECK_ROBOTS === "1") {
  process.env.FAIR_USE_CHECK_ROBOTS = "1";
}

require("./one-pass.cjs");
