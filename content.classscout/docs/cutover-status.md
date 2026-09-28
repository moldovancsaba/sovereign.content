# ClassScout agent cutover status

**Date:** 2026-09-28  
**Canonical comparison SSOT:** [`../../fleet/CLIENT-COMPARISON.md`](../../fleet/CLIENT-COMPARISON.md) ·  
[`../../fleet/RULES.md`](../../fleet/RULES.md)

## Honest status

| Claim | Reality |
| --- | --- |
| Canonical agent **home** | `sovereign.content/content.classscout/` on `main` |
| Production forever **process** | Still `moldovancsaba/classscout` → `scripts/catalog-loop/forever.sh` |
| Fair-use forever | Same product tree |
| SC copy of runners | Present under `content.classscout/scripts/` — **not** the live PID |
| Cutover | **Deferred — visibility first** (owner 2026-09-28). Do not flip until fleet inbox is continuous |

## Visibility gate (before any cutover)

- [x] Emitter exists on product (`fleet-inbox-status.cjs`, rule 471)
- [x] `classscout-find-tick` subscribed on ClassScout chat
- [x] Day status present for 2026-09-26 / 27 (backfill) + 2026-09-28 (live)
- [ ] ≥3 consecutive **live** (non-backfill) inbox days after 2026-09-28
- [ ] Then decide cutover step 1

## Keep different (do not collapse)

- Forever Find + fair-use + `generated_art_only`
- Schedule: `recurringPrograms[].daysOfWeek` — never management `RecurringSlot` / `weekdays[]`
- Product UI / ingest validation stay in `moldovancsaba/classscout`

## Next cutover step (later — not this gate)

1. Point forever/fair-use at `content.classscout/scripts` with `CLASSSCOUT_PRODUCT_ROOT` → product.
2. Confirm listing mutations go only through `POST /api/ingest` (+ upload).
3. Same hour: flip this file + inbox `workingEnv.foreverRunsFrom`.
