# ClassScout agent → `sovereign.content/content.classscout/` migration

**Date:** 2026-09-24 · **Status:** PLAN + inventory (runnable code still transitional in-repo)  
**Binding storage SSOT:** [`../sovereign-content-storage.md`](../sovereign-content-storage.md) · rule **454**  
**Upstream prompt:** management-core separation (sportolok outage + release-branch divergence) — naming aligned to ClassScout.  
**SC tracking:** [sovereign.content#27](https://github.com/moldovancsaba/sovereign.content/issues/27) (client folders). Issue **#26** was an accidental probe — close as not planned.

This environment can **create issues** on `sovereign.content` but **cannot push** branches there yet. Product-side docs and write-path rules land here first; code copy waits on write access / maintainer scaffolding.

---

## Target tree

```
sovereign.content/
  classscout/
    README.md                 # how to run this client agent; ingest URL; env
    package.json              # catalog:* / catalog-loop:* scripts
    forever.sh
    sparse-timer.sh
    find-cycle.cjs            # … full catalog-loop runners (see inventory)
    lib/
    rqk-fair-use/
    docs/
      catalog-find-improve-loop.md
      catalog-loop-error-playbook.md
      catalog-loop-quality-improvement-plan.md
      sovereign-content-alignment.md   # ClassScout job alias map (copy or submodule pointer)
      self-heal-feedback-audit-plan.md
    data/                     # gitignored runtime state (or external volume)
  content.padelafrica/               # sibling — not our tree
  sportolok/                  # sibling — not our tree
```

No imports across client folders.

---

## Inventory — move to `sovereign.content/content.classscout/`

### Runners (from `scripts/catalog-loop/`)

| Path | Notes |
| --- | --- |
| `forever.sh`, `sparse-timer.sh` | Dense vs sparse runtimes |
| `find-cycle.cjs`, `improve-cycle.cjs`, `recommend-improve.cjs`, `reclassify-watch.cjs` | Core Find/Improve |
| `feedback-intake.cjs`, `encode-lessons.cjs`, `retire-failed-find-seeds.cjs` | Lessons / queue hygiene |
| `quality-rollup.cjs`, `weekly-digest.cjs`, `scarcity-research-brief.cjs`, `push-stats.cjs` | Observability |
| `repair-*.cjs`, `contact-enrich.cjs`, `apply-improve.cjs`, … | Healing lanes |
| `sovereign-*.cjs` | SC job entrypoints |
| `lib/**`, `rqk-fair-use/**` | Shared agent libs + fair-use feeder |
| `lessons.json`, `PORT_MANIFEST.txt`, fixtures (non-secret) | Agent knowledge |
| `data/README.md` only | Runtime `data/**` stays out of git / on agent volume |

**Do not move:** `find-seeds.json` live queues with operational noise — treat as runtime data; seed **templates** may move.

### Docs (from `docs/`)

| Path | Action |
| --- | --- |
| `catalog-find-improve-loop.md` | Move; leave stub pointer in product |
| `catalog-loop-error-playbook.md` | Move; stub pointer |
| `catalog-loop-quality-improvement-plan.md` | Move; stub pointer |
| `sovereign-content-alignment.md` | Move or dual-publish; product keeps short pointer + storage SSOT |
| `padel-africa-find-improve-port-brief.md` | Move to agent docs (port brief) |
| `reports/self-heal-feedback-audit-plan.md` | Move |
| `reports/sovereign-content-recommendation-draft.md` | Keep in product **or** move to agent `docs/reports/` — process filings stay on SC issues |

**Stay in product forever:** `business-rules.md`, `architecture.md`, `api-contracts.md`, `data-model.md`, `INSTALL.md`, `operations.md` (product ops), `definition-of-done.md`, `INDEX.md` (with updated pointers).

### npm surface

Product `package.json` today owns `catalog-loop:*` / `catalog:*`. After move:

- Agent package owns the real scripts.
- Product may keep **documented** external commands only, or thin wrappers that `cd` to the agent checkout — never a second implementation.

---

## Inventory — stays in `moldovancsaba/classscout`

- Entire `src/app`, `src/components`, `src/lib` product code
- `POST /api/ingest`, upload, validation, publish gates
- Admin / stats / Lite **product** surfaces
- Vercel crons that are **product** maintenance (`serving-reconcile`, `prepare-public-reads`, …) — twins remain product CLIs
- Board #44, DoD gauntlet for the product

---

## Write-path hardening (before migration is “done”)

Aligned to the sportolok lesson (wrong shape + bypassed validation):

1. **Steady-state listing writes** from the agent use **`POST /api/ingest`** (and upload) only.
2. Any catalog-loop script that still opens Mongo and `updateOne`s providers is **transitional debt** — list and retire or route through ingest with the same validators.
3. Schedule/recurring fields must match **`RecurringProgram` / `daysOfWeek`** in `src/types/provider.ts`, never management’s `RecurringSlot` and never a free-text-only stored schedule.
4. Verify one real ingest submission (dry-run then live) against production validation before calling the migration complete.

### Direct-Mongo / dual-URI notes (current)

Several runners still read/write Mongo for Improve/self-heal scans (`getyourfield_MONGODB_URI` / `MONGODB_URI`). Reads for selection may stay; **mutations** must converge on ingest. Track per-script in follow-up issues on board 44 — do not silently expand direct writes.

---

## Definition of done (ClassScout-aligned)

- [ ] `sovereign.content` has top-level `content.classscout/` (and siblings per SC maintainers)
- [ ] Catalog-loop runners + agent docs live under `content.classscout/`; product keeps pointers only
- [ ] Agent deployment is independent; calls ClassScout ingest API only for listing writes
- [ ] Schedule/recurring conversion matches ClassScout contract; verified with a real submission
- [ ] No ClassScout agent code in `moldovancsaba/management` (already true — keep it that way)
- [ ] SC `/repos` + `/implement` updated for client-folder model ([#27](https://github.com/moldovancsaba/sovereign.content/issues/27))
- [ ] Product forever/sparse-timer cut over; old in-repo runners removed or reduced to wrappers
- [ ] Confirm back to product owner when cutover is live (management team reconciles their own `release/sportolok` — out of scope here)

---

## What this agent did in this pass

1. Wrote BINDING [`sovereign-content-storage.md`](../sovereign-content-storage.md).
2. Filed [sovereign.content#27](https://github.com/moldovancsaba/sovereign.content/issues/27).
3. Updated product pointers (INDEX, CLAUDE, alignment, rule 454, catalog-loop README).
4. Did **not** force-push or edit management release branches.
5. Did **not** delete `scripts/catalog-loop/` yet — no push access to land the destination tree.
