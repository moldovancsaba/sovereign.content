# Client comparison SSOT — padel · sportolok · classscout

**Canonical.** Edit this file only for cross-client maturity/workflow comparisons.  
**Rules:** [`RULES.md`](./RULES.md) · **Profiles:** [`profiles/`](./profiles/) · **Daily SWOT:** [`digests/`](./digests/)  
**Date refreshed:** 2026-09-25 (SC-central verify)

Stubs that must not grow: repo-root `CLIENT-FOLDER-COMPARISON.md`, `fleet/CONTENT-CLIENTS-WORKFLOW-COMPARISON.md`.

---

## Verdict

**Folder skeleton is aligned. Runtime maturity is not. Doctrine ≠ reality on writes.**

| Client | Skeleton | Runtime readiness | Honest one-liner |
| --- | --- | --- | --- |
| `content.classscout` | Strong | Highest agent-owned runner mass | Dense forever+Improve tree; **live forever still on product** (`cutover-status.md`); day-2 inbox present; cutover held |
| `content.padelafrica` | Strong docs + migrated `src/` + fair-use feeder | Ingest live-apply proven (`DISCOVERED`); quality-loop still stub | Key present; Mongo refused; core reconcile + full quality rewrite still open |
| `content.sportolok` | Fat copy + quarantine + `executorIngest` + fair-use scaffold | Dry+live PATCH proven; **`_test_patch` pollution unpaid**; discovery seeds not committed | Vanity docs retracted; do not score “autonomous catalog ready” |

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
| Writes (reality) | FIND/fixtures → `POST /api/ingest`; quality-loop stub only; Mongo entrypoints refuse | Live `executorIngest` PATCH proven; Mongo executor still quarantined | Forever aims at ingest; some helpers still product Mongo |
| Media | R2 / ImgBB | Product pipeline | `generated_art_only` |
| Schedule | singular `weekday` | singular `weekday` | `daysOfWeek` Monday…Sunday |
| Live timer | `padel-find-tick` (padel chat) | No fleet catalog timer yet | Prompt; product forever may still be live |
| Fair-use feeder | yes (`scripts/fair-use/`) | scaffold (`scripts/fair-use-discovery/`; seeds not on main) | yes (product + SC copy) |

---

## Maturity vs ClassScout forever (structure only)

| Capability | classscout | padelafrica | sportolok |
| --- | --- | --- | --- |
| Forever Find+Improve | yes | no (by design — sparse) | no |
| Fair-use feeder | yes | yes (Africa directory) | scaffold (HU; unproven seed quality) |
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
| Padel chat | Keep day status; finish quality-loop ingest rewrite; await core reconcile of `release/padel-africa` |
| Sportolok | Clean `_test_patch` on live listing; commit `fair-use-discovery/data/find-seeds.json` (or retract live-discovery claim); wire real jobs to `executorIngest` |
| ClassScout | Hold cutover until SC scripts proven; keep daily inbox |
| SC-central | Orchestrate QA via [`ORCHESTRATOR.md`](./ORCHESTRATOR.md) + [`coordination/`](./coordination/) |

---

## Related

- [`RULES.md`](./RULES.md)  
- [`../HANDOVER.md`](../HANDOVER.md)  
- [`../CORE-TEAM-STATUS.md`](../CORE-TEAM-STATUS.md)  
- [`../content.sportolok/src/QUARANTINE.md`](../content.sportolok/src/QUARANTINE.md)  
- [`../content.sportolok/MIGRATION-FROM-MANAGEMENT.md`](../content.sportolok/MIGRATION-FROM-MANAGEMENT.md)  
- Plan: [`../recommendations/inbox/plan-fleet-daily-swot.md`](../recommendations/inbox/plan-fleet-daily-swot.md)
