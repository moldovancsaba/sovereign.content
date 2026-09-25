# Catalog loop (ClassScout agent)

**Canonical home:** [`moldovancsaba/sovereign.content` → `content.classscout/`](https://github.com/moldovancsaba/sovereign.content/tree/main/content.classscout)
(see [`docs/sovereign-content-storage.md`](../../docs/sovereign-content-storage.md), rule 454 ·
[SC PR #28](https://github.com/moldovancsaba/sovereign.content/pull/28)).

**This directory** is a transitional product-repo copy for Cloud Agent VMs that still run forever
from `/workspace`. Prefer the `sovereign.content/content.classscout/` tree once merged; set
`CLASSSCOUT_PRODUCT_ROOT` to this product checkout when running from SC.

## Rules

1. **Listing writes** go through ClassScout `POST /api/ingest` (+ upload) — the validated path.
2. **Schedule fields** use ClassScout `recurringPrograms[].daysOfWeek` (`src/types/provider.ts`),
   not management’s `RecurringSlot` / `weekdays[]`.
3. **Never** commit this agent into `moldovancsaba/management` or another client’s folder.
4. **Operator feedback** for Improve is `data/feedback/*.json` — not `/api/stats/feedback`.

## Docs

| Doc | Role |
| --- | --- |
| [`docs/sovereign-content-storage.md`](../../docs/sovereign-content-storage.md) | Where code/docs live (BINDING) |
| [`docs/sovereign-content-alignment.md`](../../docs/sovereign-content-alignment.md) | Job aliases + how we run |
| SC `classscout/ingest/content-data-contract.md` | Ingest + schedule contract for the agent |

## Quick run (product tree)

```bash
npm run catalog-loop:forever
npm run catalog:self-heal -- --status
```

## If the forever “clock” freezes

It is usually **not** a frozen system clock. `forever.sh` waits on each step; a hung
Mongo write (`write ETIMEDOUT` in `data/logs/forever.out`) stalls Improve and the
outer loop stops appending `data/events.jsonl`.

**Check**

```bash
stat -c '%y' scripts/catalog-loop/data/events.jsonl
rg 'ETIMEDOUT' scripts/catalog-loop/data/logs/forever.out | tail
pgrep -af 'improve-cycle|deep-enrich|one-pass|forever.sh'
```

**Unstick (safe)**

```bash
# Kill only hung children — forever will continue (or restart both forever scripts)
pkill -f 'scripts/catalog-loop/improve-cycle.cjs' || true
pkill -f 'scripts/catalog-loop/deep-enrich-scan.mjs' || true
pkill -f 'scripts/catalog-loop/rqk-fair-use/one-pass.cjs' || true
# If forever itself is wedged mid-step, restart:
pkill -f 'scripts/catalog-loop/forever.sh' || true
pkill -f 'scripts/catalog-loop/rqk-fair-use/forever.sh' || true
nohup bash scripts/catalog-loop/forever.sh >> scripts/catalog-loop/data/logs/forever.out 2>&1 &
nohup bash scripts/catalog-loop/rqk-fair-use/forever.sh >> scripts/catalog-loop/data/logs/fair-use-forever.out 2>&1 &
```

Durable guard: each forever step now runs under `timeout` (Improve default 25m).
Mongo clients on the hot path use `lib/mongoOpts.cjs` socket ceilings.

## Quick run (sovereign.content/content.classscout)

```bash
export CLASSSCOUT_PRODUCT_ROOT=/path/to/classscout
cd /path/to/sovereign.content/classscout
npm run catalog-loop:forever
```
