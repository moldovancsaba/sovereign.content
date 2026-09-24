#!/usr/bin/env bash
# Sparse catalog jobs for subscribe_timer (Sovereign Content Cursor playbook).
# Keep forever.sh for Find/Improve density; use this for hourly/daily/weekly ticks
# when a Cloud Agent timer is cheaper than a continuous tmux loop.
#
# Usage:
#   bash scripts/catalog-loop/sparse-timer.sh              # default: rollup + scarcity + stats
#   bash scripts/catalog-loop/sparse-timer.sh --with-digest
#   bash scripts/catalog-loop/sparse-timer.sh --with-about-curate --dry-run
#   bash scripts/catalog-loop/sparse-timer.sh --with-hygiene --dry-run
#   bash scripts/catalog-loop/sparse-timer.sh --with-serving-reconcile
#   bash scripts/catalog-loop/sparse-timer.sh --with-self-heal
# After about/quality/hygiene writes, serving reconcile runs automatically unless
# --no-serving-reconcile is passed (SC: refresh projection after content ticks).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PRODUCT_ROOT="${CLASSSCOUT_PRODUCT_ROOT:-/workspace}"
if [ -d "$PRODUCT_ROOT/node_modules" ]; then
  export NODE_PATH="${NODE_PATH:+$NODE_PATH:}$PRODUCT_ROOT/node_modules"
  cd "$PRODUCT_ROOT"
fi
export CATALOG_LOOP_DATA_DIR="${CATALOG_LOOP_DATA_DIR:-$DIR/data}"
mkdir -p "$CATALOG_LOOP_DATA_DIR" "$CATALOG_LOOP_DATA_DIR/feedback" "$CATALOG_LOOP_DATA_DIR/digests"

DRY_ARGS=()
WITH_DIGEST=0
WITH_ABOUT=0
WITH_HYGIENE=0
WITH_QUALITY=0
WITH_SERVING=0
WITH_SELF_HEAL=0
NO_SERVING=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_ARGS+=(--dry-run) ;;
    --with-digest) WITH_DIGEST=1 ;;
    --with-about-curate) WITH_ABOUT=1 ;;
    --with-hygiene) WITH_HYGIENE=1 ;;
    --with-quality-loop) WITH_QUALITY=1 ;;
    --with-serving-reconcile) WITH_SERVING=1 ;;
    --with-self-heal) WITH_SELF_HEAL=1 ;;
    --no-serving-reconcile) NO_SERVING=1 ;;
    *)
      echo "unknown flag: $arg" >&2
      exit 2
      ;;
  esac
done

# Content ticks that write Mongo should refresh serving unless explicitly skipped.
if [ "$NO_SERVING" != "1" ] && { [ "$WITH_ABOUT" = "1" ] || [ "$WITH_QUALITY" = "1" ] || [ "$WITH_HYGIENE" = "1" ]; }; then
  WITH_SERVING=1
fi

echo "==== sparse-timer $(date -u +%Y-%m-%dT%H:%M:%SZ) ===="

node "$DIR/scarcity-research-brief.cjs" || true
node "$DIR/quality-rollup.cjs" || true
node "$DIR/push-stats.cjs" || true

if [ "$WITH_SELF_HEAL" = "1" ]; then
  node "$DIR/sovereign-self-heal.cjs" --report || true
  # Drain pending operator feedback files before improve/about (never paste notes into About).
  node "$DIR/feedback-intake.cjs" || true
  # Auto-lane only when debt is hot; HitL stays in review-packet for the owner.
  if [ -f "$CATALOG_LOOP_DATA_DIR/self-heal-status.json" ] && \
     grep -q '"deferFind": true' "$CATALOG_LOOP_DATA_DIR/self-heal-status.json" 2>/dev/null; then
    node "$DIR/sovereign-self-heal.cjs" --apply-auto "${DRY_ARGS[@]}" || true
  fi
fi

if [ "$WITH_DIGEST" = "1" ]; then
  node "$DIR/weekly-digest.cjs" || true
fi

if [ "$WITH_ABOUT" = "1" ]; then
  node "$DIR/sovereign-about-curate.cjs" "${DRY_ARGS[@]}" || true
fi

if [ "$WITH_HYGIENE" = "1" ]; then
  node "$DIR/sovereign-hygiene.cjs" "${DRY_ARGS[@]}" --limit "${CATALOG_HYGIENE_LIMIT:-25}" || true
fi

if [ "$WITH_QUALITY" = "1" ]; then
  node "$DIR/sovereign-quality-loop.cjs" "${DRY_ARGS[@]}" || true
fi

if [ "$WITH_SERVING" = "1" ]; then
  # Dry-run by default; pass CATALOG_SERVING_RECONCILE_APPLY=1 to repair.
  if [ "${CATALOG_SERVING_RECONCILE_APPLY:-0}" = "1" ] && [ ${#DRY_ARGS[@]} -eq 0 ]; then
    npx tsx "$DIR/../serving-reconcile.ts" --apply --limit="${CATALOG_SERVING_RECONCILE_LIMIT:-200}" || true
  else
    npx tsx "$DIR/../serving-reconcile.ts" --limit="${CATALOG_SERVING_RECONCILE_LIMIT:-200}" || true
  fi
fi

echo "==== sparse-timer done ===="
