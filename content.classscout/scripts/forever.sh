#!/usr/bin/env bash
# ClassScout find + improve forever loop (this environment).
# Improve: multi-lane evidence scan → ingest patches
# Find: seed queue → official page extract → ImgBB → ingest upsert → public smoke
# Watch: reclassify repair for recent public finds
# Quality: event log, hourly rollup, Tier A encode, feedback intake, recommendations, weekly digest
# Stats: hourly KPI push for /admin/stats
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PRODUCT_ROOT="${CLASSSCOUT_PRODUCT_ROOT:-/workspace}"
if [ -d "$PRODUCT_ROOT/node_modules" ]; then
  export NODE_PATH="${NODE_PATH:+$NODE_PATH:}$PRODUCT_ROOT/node_modules"
  cd "$PRODUCT_ROOT"
fi
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

mkdir -p "$CATALOG_LOOP_DATA_DIR" "$CATALOG_LOOP_DATA_DIR/feedback" "$CATALOG_LOOP_DATA_DIR/digests"

echo "catalog-loop forever starting $(date -u +%Y-%m-%dT%H:%M:%SZ) state=$STATE data=$CATALOG_LOOP_DATA_DIR findBatch=$CATALOG_FIND_BATCH preferLane=$CATALOG_IMPROVE_PREFER_LANE"

while true; do
  echo "==== $(date -u +%Y-%m-%dT%H:%M:%SZ) FIND+IMPROVE cycle ===="

  # 0) Operator feedback drop → lessons / seed pause
  node "$DIR/feedback-intake.cjs" || true

  # 0a) Retire terminal Find failures so Drive junk does not dominate the batch
  node "$DIR/retire-failed-find-seeds.cjs" --apply || true

  # 0b) Audit live cards → open/close improve recommendation records
  node "$DIR/recommend-improve.cjs" || true

  # 0c) Self-heal status — when About/priority debt is hot, Find defers (SC catalog:self-heal)
  node "$DIR/sovereign-self-heal.cjs" --status || true

  # 1) Improve existing listings (recommendation-first, then prefer-lane / oldest blanks)
  node "$DIR/improve-cycle.cjs" || true

  # 1b) Smart delivery when debt is hot: auto-lane only; HitL stays in review-packet
  if [ -f "$CATALOG_LOOP_DATA_DIR/self-heal-status.json" ] && \
     grep -q '"deferFind": true' "$CATALOG_LOOP_DATA_DIR/self-heal-status.json" 2>/dev/null; then
    echo "self-heal: defer Find — apply-auto (evidence-only; HitL not executed)"
    node "$DIR/sovereign-self-heal.cjs" --apply-auto || true
  fi

  # 2) Find + publish from seed queue (skips when self-heal debt is hot unless FORCE_FIND)
  CATALOG_FIND_BATCH="${CATALOG_FIND_BATCH:-8}" node "$DIR/find-cycle.cjs" || true

  # 3) Reclassify watch on recent finds
  node "$DIR/reclassify-watch.cjs" || true

  # 4) Tier A auto-pause for repeated host+skip signatures
  node "$DIR/encode-lessons.cjs" || true

  # 5) Hourly quality scorecard + scarcity research brief (once per UTC hour)
  HOUR="$(date -u +%Y-%m-%dT%H)"
  if [ "$HOUR" != "$LAST_ROLLUP_HOUR" ]; then
    node "$DIR/scarcity-research-brief.cjs" || true
    node "$DIR/quality-rollup.cjs" || true
    LAST_ROLLUP_HOUR="$HOUR"
  fi

  # 5b) Hourly weak-description + meta-chrome repair from official-page about evidence (rules 430–432)
  if [ "$HOUR" != "${LAST_DESC_REPAIR_HOUR:-}" ]; then
    CATALOG_DESC_REPAIR_LIMIT="${CATALOG_DESC_REPAIR_LIMIT:-25}" node "$DIR/repair-weak-descriptions.cjs" || true
    CATALOG_META_REPAIR_LIMIT="${CATALOG_META_REPAIR_LIMIT:-40}" node "$DIR/repair-meta-description-chrome.cjs" || true
    LAST_DESC_REPAIR_HOUR="$HOUR"
  fi

  # 5c) Hourly smart self-heal report (auto vs HitL) — reasoned, not a KPI dump
  if [ "$HOUR" != "${LAST_SELF_HEAL_REPORT_HOUR:-}" ]; then
    node "$DIR/sovereign-self-heal.cjs" --report || true
    LAST_SELF_HEAL_REPORT_HOUR="$HOUR"
  fi

  # 6) Publish KPI snapshot for /admin/stats (no-op when INGEST_API_KEY / snapshots missing)
  if [ "$HOUR" != "${LAST_STATS_PUSH_HOUR:-}" ]; then
    node "$DIR/push-stats.cjs" || true
    LAST_STATS_PUSH_HOUR="$HOUR"
  fi

  # 7) Weekly digest once per UTC day (idempotent overwrite for that date)
  DAY="$(date -u +%Y-%m-%d)"
  DOW="$(date -u +%u)" # 1=Mon … 7=Sun — emit on Mondays
  if [ "$DOW" = "1" ] && [ "$DAY" != "$LAST_DIGEST_DAY" ]; then
    node "$DIR/weekly-digest.cjs" || true
    LAST_DIGEST_DAY="$DAY"
  fi

  # Optional operator queue (hand-authored documents)
  if [ -f /tmp/catalog-find-queue.json ] && [ -f "$DIR/apply-queue.cjs" ]; then
    node "$DIR/apply-queue.cjs" || true
  fi

  # Sparse alternative for subscribe_timer: npm run catalog-loop:sparse-timer
  # (rollup/scarcity/stats ± digest/about/hygiene) — see docs/sovereign-content-alignment.md

  echo "==== sleep ${CATALOG_LOOP_SLEEP_SEC:-120}s ===="
  sleep "${CATALOG_LOOP_SLEEP_SEC:-120}"
done
