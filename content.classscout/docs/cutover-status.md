# ClassScout agent cutover status

**Date:** 2026-09-24  
**Canonical comparison SSOT:** [`../../fleet/CLIENT-COMPARISON.md`](../../fleet/CLIENT-COMPARISON.md) ·  
[`../../fleet/RULES.md`](../../fleet/RULES.md)

## Honest status

| Claim | Reality |
| --- | --- |
| Canonical agent **home** | `sovereign.content/content.classscout/` on `main` |
| Production forever **process** (this Cloud Agent VM, observed 2026-09-24) | Still `moldovancsaba/classscout` → `scripts/catalog-loop/forever.sh` (cwd `/workspace`) |
| Fair-use forever | Same product tree → `scripts/catalog-loop/rqk-fair-use/forever.sh` |
| SC copy of runners | Present under `content.classscout/scripts/` — **not** the live PID yet |
| Cutover | **In progress** — do not claim “ClassScout always lived only in sovereign.content” |

## Keep different (do not collapse)

- Forever Find + fair-use + `generated_art_only`
- Schedule: `recurringPrograms[].daysOfWeek` (Monday…Sunday) — never management `RecurringSlot` / `weekdays[]`
- Product UI / ingest validation stay in `moldovancsaba/classscout`

## Next cutover step

1. Point forever/fair-use at `content.classscout/scripts` with `CLASSSCOUT_PRODUCT_ROOT` → product checkout.
2. Confirm listing mutations go only through `POST /api/ingest` (+ upload).
3. Emit slim `fleet/inbox/classscout/status-YYYY-MM-DD.json` after rollup ticks.
4. Propose factual comparison deltas only as edits to `fleet/CLIENT-COMPARISON.md`.
