#!/usr/bin/env node
/**
 * Retire Find seeds that already failed a terminal gate (no street / 404 / blocked /
 * fetch error / duplicate). Marks findAttempts.done and pauses address-less Drive
 * seeds so forever stops burning ~98% of the batch on them (rule 438).
 *
 * Usage:
 *   node scripts/catalog-loop/retire-failed-find-seeds.cjs
 *   node scripts/catalog-loop/retire-failed-find-seeds.cjs --apply
 *   node scripts/catalog-loop/retire-failed-find-seeds.cjs --apply --from-events
 */
require("../load-env.cjs");
const fs = require("fs");
const {
  SEEDS_PATH,
  STATE_PATH,
  EVENTS_PATH,
  ensureDir,
  migrateTmpStateIfNeeded,
} = require("./lib/paths.cjs");
const { appendEvent } = require("./lib/events.cjs");
const {
  HARD_TERMINAL_FIND_SKIP_CODES,
  looksLikeStreetAddress,
  seedFamily,
  shouldRetireFindAttempt,
} = require("./lib/findSeedPriority.cjs");

const APPLY = process.argv.includes("--apply");
const FROM_EVENTS = process.argv.includes("--from-events");

function loadJson(path, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function main() {
  migrateTmpStateIfNeeded();
  ensureDir(require("path").dirname(STATE_PATH));

  const seedsDoc = loadJson(SEEDS_PATH, { seeds: [] });
  const state = loadJson(STATE_PATH, { findAttempts: {} });
  state.findAttempts = state.findAttempts || {};

  const now = new Date().toISOString();
  const report = {
    apply: APPLY,
    markedDone: [],
    pausedDrive: [],
    fromEvents: 0,
  };

  // 1) From live findAttempts — retire terminal skips
  for (const [id, att] of Object.entries(state.findAttempts)) {
    if (!att || att.done) continue;
    const code = att.lastReasonCode || "";
    if (!shouldRetireFindAttempt(att, code)) continue;
    report.markedDone.push({ id, reasonCode: code, tries: att.tries || 0 });
    if (APPLY) {
      att.done = true;
      att.retiredAt = now;
      att.retireReason = code;
      state.findAttempts[id] = att;
    }
  }

  // 2) Optional: scan recent events for skips not yet in state
  if (FROM_EVENTS && fs.existsSync(EVENTS_PATH)) {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lines = fs.readFileSync(EVENTS_PATH, "utf8").trim().split("\n").filter(Boolean);
    const eventTries = new Map();
    for (const line of lines) {
      let e;
      try {
        e = JSON.parse(line);
      } catch {
        continue;
      }
      if (e.type !== "find_skip") continue;
      if (!e.at || Date.parse(e.at) < since) continue;
      const id = e.seedId;
      if (!id) continue;
      const code = e.reasonCode || "";
      const prev = eventTries.get(id) || { code, n: 0 };
      prev.n += 1;
      prev.code = code;
      eventTries.set(id, prev);
    }
    for (const [id, info] of eventTries) {
      const att = state.findAttempts[id] || { tries: info.n, lastReasonCode: info.code };
      const merged = {
        ...att,
        tries: Math.max(Number(att.tries) || 0, info.n),
        lastReasonCode: info.code,
      };
      if (merged.done || !shouldRetireFindAttempt(merged, info.code)) continue;
      if (!HARD_TERMINAL_FIND_SKIP_CODES.includes(info.code) && info.n < 3) continue;
      report.fromEvents += 1;
      report.markedDone.push({ id, reasonCode: info.code, source: "events", tries: merged.tries });
      if (APPLY) {
        state.findAttempts[id] = {
          ...merged,
          lastError: info.code,
          done: true,
          retiredAt: now,
          retireReason: info.code,
        };
      }
    }
  }

  // 3) Pause address-less Drive seeds (quality over volume — owner 2026-09-23).
  // Keep Drive seeds that already carry a street-like seed.address; retire the rest.
  const ALL_ADDRESSLESS_DRIVE =
    !process.argv.includes("--terminal-drive-only") &&
    (APPLY || process.argv.includes("--all-addressless-drive"));
  const doneIds = new Set(
    Object.entries(state.findAttempts)
      .filter(([, att]) => att && att.done)
      .map(([id]) => id)
  );
  for (const seed of seedsDoc.seeds || []) {
    if (!seed || !seed.id || seed.paused) continue;
    if (seedFamily(seed.id) !== "drive") continue;
    if (looksLikeStreetAddress(seed.address)) continue;
    const att = state.findAttempts[seed.id];
    const terminal =
      doneIds.has(seed.id) ||
      (att && shouldRetireFindAttempt(att, att.lastReasonCode));
    // Also pause never-tried address-less Drive that share a host already retired heavily
    const host = hostOf(seed.website);
    let hostRetired = 0;
    if (host) {
      for (const s of seedsDoc.seeds || []) {
        if (seedFamily(s.id) !== "drive") continue;
        if (hostOf(s.website) !== host) continue;
        const a = state.findAttempts[s.id];
        if (a && a.done && shouldRetireFindAttempt(a, a.retireReason || a.lastReasonCode)) {
          hostRetired += 1;
        }
      }
    }
    if (!ALL_ADDRESSLESS_DRIVE && !terminal && hostRetired < 3) continue;

    report.pausedDrive.push({
      id: seed.id,
      host,
      reason: ALL_ADDRESSLESS_DRIVE
        ? "addressless_drive_quality"
        : terminal
          ? "terminal_attempt"
          : `host_retired_n=${hostRetired}`,
    });
    if (APPLY) {
      seed.paused = true;
      seed.pauseReason = ALL_ADDRESSLESS_DRIVE
        ? "retire:addressless_drive"
        : terminal
          ? `retire:terminal:${(att && (att.retireReason || att.lastReasonCode)) || "done"}`
          : `retire:host_failed:n=${hostRetired}`;
      seed.pausedAt = now;
      appendEvent("seed_paused", {
        seedId: seed.id,
        host,
        reasonCode: ALL_ADDRESSLESS_DRIVE ? "retire_addressless_drive" : "retire_failed_find",
        tier: "A",
      });
    }
  }

  // Dedupe markedDone by id
  const seen = new Set();
  report.markedDone = report.markedDone.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  if (APPLY) {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    seedsDoc.updatedAt = now;
    fs.writeFileSync(SEEDS_PATH, JSON.stringify(seedsDoc, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        apply: APPLY,
        markedDoneCount: report.markedDone.length,
        pausedDriveCount: report.pausedDrive.length,
        fromEvents: report.fromEvents,
        markedDoneSample: report.markedDone.slice(0, 15),
        pausedDriveSample: report.pausedDrive.slice(0, 15),
      },
      null,
      2
    )
  );
}

main();
