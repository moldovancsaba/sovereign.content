#!/usr/bin/env bash
# Fair-use multi-source feeder: one page per source per pass, then sleep.
# Non-aggressive. Honors robots Allow for *; never uses training-bot UAs.
# Per-source cooldownSec (sources.json) skips sources still cooling inside a pass.
# Refreshes the scarcity research brief once per UTC hour so discovery pages
# prefer thin neighborhoods and scarce sport activities.
set -euo pipefail
PRODUCT_ROOT="${CLASSSCOUT_PRODUCT_ROOT:-/workspace}"; cd "$PRODUCT_ROOT"
export NODE_PATH="${NODE_PATH:+$NODE_PATH:}$PRODUCT_ROOT/node_modules"
DIR="$(cd "$(dirname "$0")" && pwd)"
LOOP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
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

while true; do
  HOUR="$(date -u +%Y-%m-%dT%H)"
  if [ "$HOUR" != "$LAST_BRIEF_HOUR" ]; then
    echo "==== scarcity research brief $(date -u +%Y-%m-%dT%H:%M:%SZ) ===="
    node "$LOOP_DIR/scarcity-research-brief.cjs" || true
    LAST_BRIEF_HOUR="$HOUR"
  fi
  echo "==== $(date -u +%Y-%m-%dT%H:%M:%SZ) multi-source pass (1 lead/page per source) ===="
  node "$DIR/one-pass.cjs" || true
  echo "==== sleep ${SLEEP_SEC}s ===="
  sleep "$SLEEP_SEC"
done
