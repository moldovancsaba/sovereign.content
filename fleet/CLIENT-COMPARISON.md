# Client comparison SSOT — padel · sportolok · classscout

**Canonical.** Edit this file only for cross-client maturity/workflow comparisons.  
**Rules:** [`RULES.md`](./RULES.md) · **Profiles:** [`profiles/`](./profiles/) · **Daily SWOT:** [`digests/`](./digests/)  
**Date refreshed:** 2026-09-24

Stubs that must not grow: repo-root `CLIENT-FOLDER-COMPARISON.md`, `fleet/CONTENT-CLIENTS-WORKFLOW-COMPARISON.md`.

---

## Verdict

**Folder skeleton is aligned. Runtime maturity is not. Doctrine ≠ reality on writes.**

| Client | Skeleton | Runtime readiness | Honest one-liner |
| --- | --- | --- | --- |
| `content.classscout` | Strong | Highest agent-owned runner mass | Dense forever+Improve tree; cutover from product `scripts/catalog-loop/` may still be incomplete |
| `content.padelafrica` | Strong docs + ingest | Execution still **management** `catalog:*` | Process twin on paper; **0 scripts** in agent home |
| `content.sportolok` | Fat copy + quarantine | **Not** safe to run as padel tick | Migrated tree; Mongo executors quarantined until ingest rewrite + core reconcile |

There is **no** single SSOT compliance %. Use environment vs outcome scorecards (`fleet:daily-swot`).

---

## Shared layout (OK)

| Piece | padel | sportolok | classscout |
| --- | --- | --- | --- |
| `AGENTS.md` + ingest-only rules | yes | yes | yes |
| `pointers.json` | yes | yes (+ migration) | yes (Bearer + upload) |
| `ingest/` client + contract | `x-api-key` + `RecurringSlot` | same | Bearer + `daysOfWeek` |
| `timers/orchestrator.md` | yes | yes (thin) | yes (forever/sparse) |
| Cross-imports | forbidden | forbidden | forbidden |
| `package.json` agent home | **no** | yes | yes |
| Runnable `scripts/` in SC | **0** | 25 (mostly Mongo — quarantined) | full catalog-loop |

---

## Workflow (what actually runs)

| Concern | Padel | Sportolok | ClassScout |
| --- | --- | --- | --- |
| Growth | FIND `--until-found` | No live FIND; evaluate/delivery cutover | Forever Find+Improve + fair-use; sparse twin optional |
| Quality order | about → quality → media → autopilot → hygiene → reconcile → FIND → digest | Timer: ingest + schedule only | forever/sparse: about → quality → self-heal → find → encode → rollup |
| Writes (doctrine) | ingest-only | ingest-only | ingest-only |
| Writes (reality) | Padel chat still runs management Mongo CLIs | Scripts/src Mongo; **QUARANTINE** | Forever aims at ingest; some helpers still product Mongo |
| Media | R2 / ImgBB | Product pipeline | `generated_art_only` |
| Schedule | singular `weekday` | singular `weekday` | `daysOfWeek` Monday…Sunday |
| Live timer | `padel-find-tick` (padel chat) | Prompt only until rewrite | Prompt; product forever may still be live |

---

## Maturity vs ClassScout forever (structure only)

| Capability | classscout | padelafrica | sportolok |
| --- | --- | --- | --- |
| Forever Find+Improve | yes | no (by design — sparse) | no |
| Fair-use feeder | yes | no | no |
| Self-heal / quality / find in agent home | yes | docs only → engine CLIs | yes files, unsafe until ingest |
| Lessons / rollup | yes (`lessons.json`) | engine / digest on management | seeded lessons; not proven via ingest |

Intentional: padel must **not** grow a ClassScout forever loop. Export orchestration ideas only (heal-before-find, HiTL, digest shape).

---

## Fit to padel orchestrator (ops pattern only)

| Client | Fit | Note |
| --- | --- | --- |
| ClassScout | Job vocabulary yes; runtime no | Keep forever + generated art; adopt HiTL/defer ideas only |
| Sportolok | Schedule family yes; tick clone **no** | Ingest rewrite + proven PATCH first |
| Padel folder vs padel chat | Docs in SC; exec in management | Emit `fleet/inbox/padelafrica/status-*.json` after ticks |

---

## False claims to never repeat

- Sportolok “90% SSOT” / “migration complete” / “API-only enforced” while quarantine + Mongo scripts remain  
- ClassScout “always lived in sovereign.content / never migrated” (runners moved from product; cutover ongoing)  
- “Padel should copy management scripts like sportolok” without ingest rewrite (copies the outage class)  
- Any cross-client comparison published under `management/release/*`

---

## Highest-leverage next actions

| Owner | Action |
| --- | --- |
| Padel chat | After orchestrator tick → slim `fleet/inbox/padelafrica/status-YYYY-MM-DD.json` |
| Sportolok / SC-central | Rewrite quarantined call sites → `ingest/` + `scheduleToRecurringSlots`; dry PATCH; chase core reconcile |
| ClassScout / SC-central | Confirm forever runs from `content.classscout/scripts`; slim `fleet/inbox/classscout/` status |
| All | Comparisons only via this file + `fleet:daily-swot`; follow [`RULES.md`](./RULES.md) |

---

## Related

- [`RULES.md`](./RULES.md)  
- [`../HANDOVER.md`](../HANDOVER.md)  
- [`../CORE-TEAM-STATUS.md`](../CORE-TEAM-STATUS.md)  
- [`../content.sportolok/src/QUARANTINE.md`](../content.sportolok/src/QUARANTINE.md)  
- [`../content.sportolok/MIGRATION-FROM-MANAGEMENT.md`](../content.sportolok/MIGRATION-FROM-MANAGEMENT.md)  
- Plan: [`../recommendations/inbox/plan-fleet-daily-swot.md`](../recommendations/inbox/plan-fleet-daily-swot.md)
