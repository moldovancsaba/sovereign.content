#!/usr/bin/env bash
# Fair-use multi-source feeder: one page per source per pass, then sleep.
# Non-aggressive. Honors robots Allow for *; never uses training-bot UAs.
# Per-source cooldownSec (sources.json) skips sources still cooling inside a pass.
# Refreshes the scarcity research brief once per UTC hour so discovery pages
# prefer thin neighborhoods and scarce sport activities.
set -euo pipefail
cd /workspace
export NODE_PATH=/workspace/node_modules
DIR=/workspace/scripts/catalog-loop/rqk-fair-use
LOOP_DIR=/workspace/scripts/catalog-loop
# Floor sleep AFTER a full multi-source pass (per-source cooldown may skip many inside the pass)
SLEEP_SEC="${FAIR_USE_PASS_SLEEP_SEC:-${RQK_SLEEP_SEC:-300}}"
# Delay between sources inside one pass (only when a source actually fetches)
export FAIR_USE_INTER_SOURCE_SEC="${FAIR_USE_INTER_SOURCE_SEC:-45}"
LAST_BRIEF_HOUR=""

# Effective source list: unset FAIR_USE_SOURCES → every registered adapter.
# Unknown ids in FAIR_USE_SOURCES are dropped at load time (not delivered).
ENABLED_COUNT="$(node -e 'const {loadEnabledSources}=require("./lib/sources/index.cjs"); const s=loadEnabledSources(); process.stdout.write(String(s.length)+" "+s.map(x=>x.id+":"+x.cooldownSec+"s").join(","))' 2>/dev/null || echo "?")"
echo "fair-use multi-source forever starting $(date -u +%Y-%m-%dT%H:%M:%SZ) pass_sleep=${SLEEP_SEC}s inter_source=${FAIR_USE_INTER_SOURCE_SEC}s sources=${ENABLED_COUNT}"

# Optional once-per-start robots check (counts as one request per source).
if [ "${FAIR_USE_CHECK_ROBOTS_ON_START:-${RQK_CHECK_ROBOTS_ON_START:-0}}" = "1" ]; then
  echo "==== robots check pass $(date -u +%Y-%m-%dT%H:%M:%SZ) ===="
  FAIR_USE_CHECK_ROBOTS=1 node "$DIR/one-pass.cjs" || true
  echo "==== sleep ${SLEEP_SEC}s after robots ===="
  sleep "$SLEEP_SEC"
fi

# Pass ceiling so a hung fetch/Mongo write cannot freeze the fair-use clock.
PASS_TIMEOUT_SEC="${FAIR_USE_PASS_TIMEOUT_SEC:-1800}"

run_pass() {
  local label="$1"
  shift
  echo "---- $label (timeout ${PASS_TIMEOUT_SEC}s) $(date -u +%Y-%m-%dT%H:%M:%SZ) ----"
  set +e
  timeout --foreground -k 30s "${PASS_TIMEOUT_SEC}s" "$@"
  local rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then
    return 0
  fi
  if [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
    echo "WARN $label timed out after ${PASS_TIMEOUT_SEC}s (rc=$rc) — continuing fair-use forever" >&2
  else
    echo "WARN $label exited rc=$rc — continuing" >&2
  fi
  return 0
}

while true; do
  HOUR="$(date -u +%Y-%m-%dT%H)"
  if [ "$HOUR" != "$LAST_BRIEF_HOUR" ]; then
    echo "==== scarcity research brief $(date -u +%Y-%m-%dT%H:%M:%SZ) ===="
    run_pass scarcity-brief node "$LOOP_DIR/scarcity-research-brief.cjs"
    LAST_BRIEF_HOUR="$HOUR"
  fi
  echo "==== $(date -u +%Y-%m-%dT%H:%M:%SZ) multi-source pass (1 lead/page per source) ===="
  run_pass one-pass node "$DIR/one-pass.cjs"
  echo "==== sleep ${SLEEP_SEC}s ===="
  sleep "$SLEEP_SEC"
done
