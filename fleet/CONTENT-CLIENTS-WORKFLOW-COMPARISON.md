# content.* clients — workflow comparison (vs padel-africa)

**Date:** 2026-09-24  
**Audience:** operator + SC-central agent; padel chat keeps day-to-day FIND ticks.  
**Scope:** `content.padelafrica/` · `content.sportolok/` · `content.classscout/` on `sovereign.content` `main`.

Related: [`../HANDOVER.md`](../HANDOVER.md) · [`profiles/`](./profiles/) · [`outbox/`](./outbox/) · daily SWOT plan in `recommendations/inbox/plan-fleet-daily-swot.md`.

---

## Verdict

**Shared skeleton is aligned; runtime maturity is not.** All three folders share AGENTS / pointers / ingest / timers / docs. Live tick behavior still diverges hard from the padel orchestrator.

---

## Shared layout (OK across all three)

| Piece | padel | sportolok | classscout |
| --- | --- | --- | --- |
| `AGENTS.md` + ingest-only rules | yes | yes | yes |
| `pointers.json` | yes | yes (+ migration note) | yes (Bearer + upload) |
| `ingest/client.ts` + contract | management `x-api-key` + `RecurringSlot` | same as padel | Bearer + `recurringPrograms.daysOfWeek` |
| Single `timers/orchestrator.md` | yes | yes (thin) | yes (forever/sparse) |
| Cross-imports forbidden | yes | yes | yes |

SC-central also owns `fleet/` (daily SWOT + profiles) — compares clients **without** unfair KPI mixes (sparse continent ≠ dense US forever).

---

## Workflow vs padel (what actually runs)

| Concern | **Padel** | **Sportolok** | **ClassScout** |
| --- | --- | --- | --- |
| Growth | FIND `--until-found` evidence cells | No live FIND campaign; growth = evaluate/delivery cutover | Dense **forever** Find+Improve + sparse `--until-found` twin |
| Quality tick | about → quality-loop → media → autopilot → hygiene → reconcile → FIND → self-heal digest | Timer only says “ingest + schedule converter”; no full job order | forever/sparse: about → quality → self-heal → find → encode → rollup |
| Writes (doctrine) | ingest-only in `AGENTS.md` | ingest-only | ingest-only |
| Writes (reality) | Still uses **management Mongo CLIs** on the padel Cloud Agent | Copied scripts still open **Mongo**; `src/` executor **quarantined** | Mixed: forever path aims at ingest; several `sovereign-*.cjs` still `MongoClient` via product root |
| Media | R2 primary / ImgBB backup, OG scrape | Product pipeline; `.ts` media-curate is Mongo twin | **`generated_art_only`** (no venue-photo scrape) |
| Schedule | singular `weekday` | singular `weekday` (outage class) | `daysOfWeek` Monday…Sunday — **must not** copy padel shapes |
| Agent home richness | Docs+timer+ingest; **`scripts/` and `research/` empty** | Fat: scripts + quarantined `src/` + migration docs | Fat: full catalog-loop runners under `scripts/` |
| Live timer | `padel-find-tick` on padel chat | Orchestrator prompt exists; cutover blocked on ingest rewrite + `release/sportolok` reconcile | Orchestrator prompt exists; product-repo copies may still be live runners |

---

## Gaps that matter

1. **Sportolok is furthest from “working like padel”.** Package has `catalog:*` names, but CLIs still require `MONGODB_URI` and write Db. Quarantine is correct; until ingest rewrite + one proven PATCH, it cannot run a padel-style hourly tick safely.
2. **ClassScout is closest in agent-owned runners**, but intentionally different growth/media/schedule. Do not merge engines. Cutover risk: product `scripts/catalog-loop/` may still be what Cloud Agents run.
3. **Padel home is doctrine-heavy, runner-light.** Real FIND/quality still lives in `management` on `release/padel-africa`. That matches “engine CLIs are product surfaces” but **violates** the strict “never open Mongo from agent” rule whenever the padel chat runs `npm run catalog:*`. Fleet outbox already flags missing `fleet/inbox/padelafrica/status-*.json` snapshots from ticks.
4. **Sportolok alignment docs are partly stale** (still talk about missing quality-loop / wrong `agent:*` names) while `package.json` already has `catalog:*` — doc honesty lag.
5. **Fleet SWOT (SC-central)** is the right cross-project layer; per-client catalog orchestrators stay separate (profiles already encode that).

---

## Fit to padel workflow (score)

- **ClassScout:** same *job vocabulary*, different *runtime* — align on HiTL/defer/heal-before-find ideas only; keep forever + generated art.
- **Sportolok:** same *management schedule family*, not ready for padel tick clone — ingest rewrite first.
- **Padel folder vs padel chat:** docs point at SC home; execution still management — next honesty step is either fleet inbox status dumps after each tick, or moving more agent ops behind ingest from `content.padelafrica/scripts/`.

---

## Highest-leverage next actions

| Owner | Action |
| --- | --- |
| Padel chat | After each orchestrator tick, emit slim `fleet/inbox/padelafrica/status-YYYY-MM-DD.json` (fair KPIs only — see `fleet/inbox/README.md`) |
| SC-central / sportolok | Rewrite quarantined call sites → `ingest/client.ts` + `scheduleToRecurringSlots`; prove one dry PATCH; chase `release/sportolok` reconcile |
| SC-central / classscout | Confirm forever runs from `content.classscout/scripts`; retire product wrappers when ingest path proven; mirror slim status into `fleet/inbox/classscout/` |

Do **not** merge ClassScout forever-Find with padel until-found engines. Do **not** force-push `release/sportolok`.
