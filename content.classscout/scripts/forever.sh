#!/usr/bin/env bash
# ClassScout find + improve forever loop (this environment).
# Improve: multi-lane evidence scan → ingest patches
# Find: seed queue → official page extract → ImgBB → ingest upsert → public smoke
# Watch: reclassify repair for recent public finds
# Quality: event log, hourly rollup, Tier A encode, feedback intake, recommendations, weekly digest
# Stats: hourly KPI push for /admin/stats
set -euo pipefail
cd /workspace
export NODE_PATH=/workspace/node_modules
DIR=/workspace/scripts/catalog-loop
export CATALOG_LOOP_DATA_DIR="${CATALOG_LOOP_DATA_DIR:-$DIR/data}"
STATE="${CATALOG_LOOP_STATE:-$CATALOG_LOOP_DATA_DIR/state.json}"
LAST_ROLLUP_HOUR=""
LAST_DIGEST_DAY=""
LAST_STATS_PUSH_HOUR=""
LAST_DESC_REPAIR_HOUR=""
LAST_SELF_HEAL_REPORT_HOUR=""

# Bottleneck fixes (rule 438): prefer soft age Improve; larger Find batch once seed mix is gated.
export CATALOG_IMPROVE_PREFER_LANE="${CATALOG_IMPROVE_PREFER_LANE:-age}"
export CATALOG_FIND_BATCH="${CATALOG_FIND_BATCH:-8}"
export CATALOG_IMPROVE_BATCH="${CATALOG_IMPROVE_BATCH:-8}"

# Step ceilings (seconds). A hung Mongo write must not freeze the outer forever clock.
# Observed 2026-09-24→25: Improve deep-enrich hit Mongo `write ETIMEDOUT` and the loop
# stayed quiet ~6h because forever waited unboundedly on the child.
STEP_TIMEOUT_DEFAULT="${CATALOG_STEP_TIMEOUT_DEFAULT:-600}"
STEP_TIMEOUT_IMPROVE="${CATALOG_STEP_TIMEOUT_IMPROVE:-1500}"
STEP_TIMEOUT_FIND="${CATALOG_STEP_TIMEOUT_FIND:-900}"
STEP_TIMEOUT_RECLASSIFY="${CATALOG_STEP_TIMEOUT_RECLASSIFY:-900}"

run_step() {
  local label="$1"
  local secs="$2"
  shift 2
  echo "---- step $label (timeout ${secs}s) $(date -u +%Y-%m-%dT%H:%M:%SZ) ----"
  set +e
  timeout --foreground -k 30s "${secs}s" "$@"
  local rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then
    return 0
  fi
  if [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
    echo "WARN step $label timed out after ${secs}s (rc=$rc) — continuing forever loop" >&2
  else
    echo "WARN step $label exited rc=$rc — continuing" >&2
  fi
  return 0
}

mkdir -p "$CATALOG_LOOP_DATA_DIR" "$CATALOG_LOOP_DATA_DIR/feedback" "$CATALOG_LOOP_DATA_DIR/digests" "$CATALOG_LOOP_DATA_DIR/logs"

echo "catalog-loop forever starting $(date -u +%Y-%m-%dT%H:%M:%SZ) state=$STATE data=$CATALOG_LOOP_DATA_DIR findBatch=$CATALOG_FIND_BATCH preferLane=$CATALOG_IMPROVE_PREFER_LANE improveTimeout=${STEP_TIMEOUT_IMPROVE}s"

while true; do
  echo "==== $(date -u +%Y-%m-%dT%H:%M:%SZ) FIND+IMPROVE cycle ===="

  # 0) Operator feedback drop → lessons / seed pause
  run_step feedback-intake "$STEP_TIMEOUT_DEFAULT" node "$DIR/feedback-intake.cjs"

  # 0a) Retire terminal Find failures so Drive junk does not dominate the batch
  run_step retire-failed-find-seeds "$STEP_TIMEOUT_DEFAULT" node "$DIR/retire-failed-find-seeds.cjs" --apply

  # 0b) Audit live cards → open/close improve recommendation records
  run_step recommend-improve "$STEP_TIMEOUT_DEFAULT" node "$DIR/recommend-improve.cjs"

  # 0c) Self-heal status — when About/priority debt is hot, Find defers (SC catalog:self-heal)
  run_step self-heal-status "$STEP_TIMEOUT_DEFAULT" node "$DIR/sovereign-self-heal.cjs" --status

  # 1) Improve existing listings (recommendation-first, then prefer-lane / oldest blanks)
  run_step improve-cycle "$STEP_TIMEOUT_IMPROVE" node "$DIR/improve-cycle.cjs"

  # 1b) Smart delivery when debt is hot: auto-lane only; HitL stays in review-packet
  if [ -f "$CATALOG_LOOP_DATA_DIR/self-heal-status.json" ] && \
     grep -q '"deferFind": true' "$CATALOG_LOOP_DATA_DIR/self-heal-status.json" 2>/dev/null; then
    echo "self-heal: defer Find — apply-auto (evidence-only; HitL not executed)"
    run_step self-heal-apply-auto "$STEP_TIMEOUT_DEFAULT" node "$DIR/sovereign-self-heal.cjs" --apply-auto
  fi

  # 2) Find + publish from seed queue (skips when self-heal debt is hot unless FORCE_FIND)
  run_step find-cycle "$STEP_TIMEOUT_FIND" env CATALOG_FIND_BATCH="${CATALOG_FIND_BATCH:-8}" node "$DIR/find-cycle.cjs"

  # 3) Reclassify watch on recent finds
  run_step reclassify-watch "$STEP_TIMEOUT_RECLASSIFY" node "$DIR/reclassify-watch.cjs"

  # 4) Tier A auto-pause for repeated host+skip signatures
  run_step encode-lessons "$STEP_TIMEOUT_DEFAULT" node "$DIR/encode-lessons.cjs"

  # 5) Hourly quality scorecard + scarcity research brief (once per UTC hour)
  HOUR="$(date -u +%Y-%m-%dT%H)"
  if [ "$HOUR" != "$LAST_ROLLUP_HOUR" ]; then
    run_step scarcity-research-brief "$STEP_TIMEOUT_DEFAULT" node "$DIR/scarcity-research-brief.cjs"
    run_step quality-rollup "$STEP_TIMEOUT_DEFAULT" node "$DIR/quality-rollup.cjs"
    LAST_ROLLUP_HOUR="$HOUR"
  fi

  # 5b) Hourly weak-description + meta-chrome repair from official-page about evidence (rules 430–432)
  if [ "$HOUR" != "${LAST_DESC_REPAIR_HOUR:-}" ]; then
    run_step repair-weak-descriptions "$STEP_TIMEOUT_DEFAULT" env CATALOG_DESC_REPAIR_LIMIT="${CATALOG_DESC_REPAIR_LIMIT:-25}" node "$DIR/repair-weak-descriptions.cjs"
    run_step repair-meta-description-chrome "$STEP_TIMEOUT_DEFAULT" env CATALOG_META_REPAIR_LIMIT="${CATALOG_META_REPAIR_LIMIT:-40}" node "$DIR/repair-meta-description-chrome.cjs"
    LAST_DESC_REPAIR_HOUR="$HOUR"
  fi

  # 5c) Hourly smart self-heal report (auto vs HitL) — reasoned, not a KPI dump
  if [ "$HOUR" != "${LAST_SELF_HEAL_REPORT_HOUR:-}" ]; then
    run_step self-heal-report "$STEP_TIMEOUT_DEFAULT" node "$DIR/sovereign-self-heal.cjs" --report
    LAST_SELF_HEAL_REPORT_HOUR="$HOUR"
  fi

  # 6) Publish KPI snapshot for /admin/stats (no-op when INGEST_API_KEY / snapshots missing)
  if [ "$HOUR" != "${LAST_STATS_PUSH_HOUR:-}" ]; then
    run_step push-stats "$STEP_TIMEOUT_DEFAULT" node "$DIR/push-stats.cjs"
    LAST_STATS_PUSH_HOUR="$HOUR"
  fi

  # 7) Weekly digest once per UTC day (idempotent overwrite for that date)
  DAY="$(date -u +%Y-%m-%d)"
  DOW="$(date -u +%u)" # 1=Mon … 7=Sun — emit on Mondays
  if [ "$DOW" = "1" ] && [ "$DAY" != "$LAST_DIGEST_DAY" ]; then
    run_step weekly-digest "$STEP_TIMEOUT_DEFAULT" node "$DIR/weekly-digest.cjs"
    LAST_DIGEST_DAY="$DAY"
  fi

  # Optional operator queue (hand-authored documents)
  if [ -f /tmp/catalog-find-queue.json ] && [ -f "$DIR/apply-queue.cjs" ]; then
    run_step apply-queue "$STEP_TIMEOUT_DEFAULT" node "$DIR/apply-queue.cjs"
  fi

  # Sparse alternative for subscribe_timer: npm run catalog-loop:sparse-timer
  # (rollup/scarcity/stats ± digest/about/hygiene) — see docs/sovereign-content-alignment.md

  echo "==== sleep ${CATALOG_LOOP_SLEEP_SEC:-120}s ===="
  sleep "${CATALOG_LOOP_SLEEP_SEC:-120}"
done
