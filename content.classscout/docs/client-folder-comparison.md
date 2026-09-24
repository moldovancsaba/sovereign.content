# Client folder comparison — maturity vs ClassScout workflow

**Date:** 2026-09-24  
**Repo:** `moldovancsaba/sovereign.content`  
**Audience:** owner / core team — snapshot of how `content.*` folders line up with the
ClassScout forever Find→Improve→self-heal workflow.

Companion: [`CORE-TEAM-STATUS.md`](../../CORE-TEAM-STATUS.md) (separation DoD) ·
[`README.md`](../../README.md) (repo map).

---

## Shared contract (all three)

| Piece | Status |
| --- | --- |
| Top-level `content.{client}/` | Present |
| `AGENTS.md` + `pointers.json` + `timers/orchestrator.md` | Present |
| `ingest/` client + schedule helper + contract | Present |
| No cross-client imports | Documented |
| Writes via `/api/ingest` | Documented (not fully enforced in every script yet) |

Folders:

- [`content.classscout/`](../) — ClassScout / Your Field (`moldovancsaba/classscout`)
- [`content.padelafrica/`](../../content.padelafrica/) — padel-africa (`management` `release/padel-africa`)
- [`content.sportolok/`](../../content.sportolok/) — sportolok (`management` `release/sportolok`)

---

## Maturity vs ClassScout workflow

| Capability | **content.classscout** | **content.padelafrica** | **content.sportolok** |
| --- | --- | --- | --- |
| Forever Find+Improve | `scripts/forever.sh` + sparse-timer | **Missing** — docs only; tick still points at **management** `catalog:*` CLIs | **Missing** — no forever; hourly timer is report-only |
| Fair-use feeder | Full `rqk-fair-use/` | None | None |
| Self-heal / quality / find scripts | Full agent package (`package.json` aliases) | **0 scripts** — playbooks assume engine CLIs | 25 scripts, mostly **Mongo-direct** (quarantined) |
| `package.json` agent home | Yes | **No** | Yes |
| Schedule shape | `recurringPrograms.daysOfWeek` | management `RecurringSlot` / `weekday` | same as padel |
| Ingest auth | `Authorization: Bearer` | `x-api-key` | `x-api-key` |
| Live product | `classscout` (own repo) | `management` `release/padel-africa` | `management` `release/sportolok` |
| Runtime cutover | Copy landed; **live forever may still run from product** `scripts/catalog-loop/` until cutover | Agent home is docs+ingest; **execution still engine** | Migrated tree; **Mongo executors quarantined**, not rewritten to ingest |

Rough size (2026-09-24):

| Folder | Scripts (files) | Docs (files) |
| --- | ---: | ---: |
| `content.classscout` | ~138 | 8 |
| `content.padelafrica` | 0 | 9 |
| `content.sportolok` | 25 | 15 |

---

## What that means in practice

**content.classscout** is the only folder that mirrors a dense forever + Improve + fair-use +
self-heal debt-gate loop with on-disk events/recommendations.

**content.padelafrica** is the process twin on paper (heal → about → quality → media → hygiene →
reconcile → FIND `--until-found` → self-heal digest) but the agent folder has **no `scripts/`**,
**no `research/`**, **no `package.json`** even though `AGENTS.md` lists them. Timer still allows
management engine CLIs. Workflow lives in **management product surfaces**; SC holds playbooks +
ingest helpers.

**content.sportolok** has the most code after ClassScout (self-heal, quality, find, media,
quarantine, watchdog), but it is a **management lift** still wired to `MONGODB_URI`.
[`content.sportolok/src/QUARANTINE.md`](../../content.sportolok/src/QUARANTINE.md) forbids running it
against shared Mongo until rewritten through `ingest/`. Timer does not run a ClassScout-style
forever loop.

---

## Intentional diffs (keep — do not collapse)

Same portable job *names* (`catalog:*`), different growth / media / territory policies:

| Concern | ClassScout | Padel Africa | Sportolok |
| --- | --- | --- | --- |
| Growth | Dense US forever + fair-use seed queue | Sparse continent `--until-found` | Engine / agent FIND (ingest rewrite pending) |
| Media | `generated_art_only` | OG scrape → R2 (ImgBB backup) | Media-curate / quarantine (ingest rewrite pending) |
| Territory | Multi-city ↔ borough integrity | Africa pack ladder | Territory quarantine scripts |

See also [`content.padelafrica/docs/classscout-sovereign-twin.md`](../../content.padelafrica/docs/classscout-sovereign-twin.md).

---

## Gaps worth fixing (structure — not engine merge)

1. **Padel `AGENTS.md`** claims `scripts/` + `research/` that do not exist — add stubs or drop from the layout table.
2. **Stale paths** in some padel/sportolok docs/timers (`sportolok/` vs `content.sportolok/`, `../classscout/` vs `../content.classscout/`).
3. **Sportolok** needs ingest rewrite before forever/timer automation; Mongo scripts must not be the default.
4. **ClassScout cutover** — canonical agent code is in SC; production forever may still run from the product repo until `CLASSSCOUT_PRODUCT_ROOT` cutover completes.

---

## Verdict

Folder layout matches the separation model. Workflow parity does **not** — ClassScout is the only
client with a running forever+fair-use agent tree; padel is docs-led against management CLIs;
sportolok is a quarantined Mongo migration waiting on ingest rewrite.
