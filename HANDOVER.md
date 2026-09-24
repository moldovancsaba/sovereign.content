# HANDOVER — sovereign.content (central system for all content agents)

**Written:** 2026-09-24 ~19:25 UTC  
**For:** the next agent owning **`moldovancsaba/sovereign.content`** as the central system for every content agent.  
**Not for:** day-to-day padel-africa catalogue FIND/quality ticks (those continue in a **separate padel chat** against management + `content.padelafrica/` pointers).

If you read nothing else: **§1 orientation**, **§3 non-negotiables**, **§5 open work**, **§8 first hour**.

---

## 1. What this repository is

Two layers in one GitHub repo (`main` → Vercel docs site + agent folders):

| Layer | Path | Role |
| --- | --- | --- |
| **SSOT docs site** | repo root Next.js App Router | Doctrine, Jobs, Cursor, Adopting, Implement, Recommendations — live at https://sovereigncontent.messmass.com |
| **Client agent workspaces** | `content.<client>/` | Independent agent homes — **no cross-imports** |

### Client folders (canonical names — use these)

| Folder | Live product | Product repo |
| --- | --- | --- |
| [`content.padelafrica/`](./content.padelafrica/) | padel-africa.doneisbetter.com | `moldovancsaba/management` (`release/padel-africa`) |
| [`content.sportolok/`](./content.sportolok/) | sport.doneisbetter.com | `moldovancsaba/management` (`release/sportolok` — **diverged; see §5**) |
| [`content.classscout/`](./content.classscout/) | getyourfield.com / classscout.ai | `moldovancsaba/classscout` (never lived inside management) |

Older names `padel-africa/`, `sportolok/`, `classscout/` at repo root were **renamed** to the `content.*` pattern so dedicated content projects are easy to find.

---

## 2. Why we separated (management core mandate)

Management core asked content agents to stop committing sovereign/autonomy code onto client **release** branches inside `management`. Concrete failures:

1. **Production outage** on sportolok `/browse` — listing `schedule.recurring` written as `{ weekdays: [...], startTime, endTime }` instead of **one object per day** with singular `weekday: "mon"|…` (`RecurringSlot` in management `src/lib/schedule/schedule.ts`).
2. **`release/sportolok` diverged** from `main` (fast-forward-only pointer broken).

**Mandate (aligned naming):**

- All sovereign/agent code + docs → **`sovereign.content/content.<client>/`**
- Agents talk to live apps **only** via documented public APIs (`POST /api/ingest`, scoped key) — **not** by adding management routes/libs/crons, and **not** by opening shared Mongo from the agent
- Engine fixes → reviewed PRs to management **`main`** only
- **Do not** force-push `release/sportolok` — tell core when migration is ready; they reconcile

Status letter for core: [`CORE-TEAM-STATUS.md`](./CORE-TEAM-STATUS.md)  
Sportolok delete list for reconcile: [`content.sportolok/MIGRATION-FROM-MANAGEMENT.md`](./content.sportolok/MIGRATION-FROM-MANAGEMENT.md)

---

## 3. Non-negotiables (binding)

1. **Push everything in this repo to `main`.** Docs site + all `content.*` folders.
2. **No cross-imports** between `content.padelafrica` ↔ `content.sportolok` ↔ `content.classscout`. Duplicate helpers per client if needed.
3. **No catalogue content / Mongo dumps / media binaries** in the docs site tree.
4. **Agent writes = ingest API only.** Each client has `ingest/client.ts`. Quarantined Mongo executors under `content.sportolok/src/` must **not** be re-enabled against shared DB.
5. **Schedule contracts differ by product:**
   - Management clients (padel, sportolok): `RecurringSlot` — singular `weekday`, `HH:MM` — see `ingest/content-data-contract.md` + `scheduleToRecurringSlots.ts`
   - ClassScout: `recurringPrograms[].daysOfWeek` (Monday…Sunday) — see `content.classscout/ingest/content-data-contract.md`
6. **Management `docs/content-data-contract.md`** was **missing on `main`** at migration; agents use the per-client mirror until core publishes the atomic doc.
7. Root `tsconfig.json` **excludes** all `content.*` folders so agent TS does not break the docs build.

---

## 4. Where we are right now (2026-09-24)

### Done

- [x] Three `content.*` client folders on `main`
- [x] Sportolok sovereign runtime **copied** out of management `release/sportolok` into `content.sportolok/` (APIs, crons, scripts, docs)
- [x] Mongo `executor` **quarantined** (throws; use ingest)
- [x] Ingest clients + schedule converters for management-shaped clients
- [x] Dual-repo / Implement / Whats-new / AGENTS updated for separation + naming
- [x] Padel agent playbooks mirrored under `content.padelafrica/docs/` (jobs, FIND, self-heal, HiTL, twin)
- [x] ClassScout agent home under `content.classscout/` (product stays in classscout repo)
- [x] Core-team status + migration file published

### Explicitly not done (your follow-ups)

- [ ] **Core reconciles `release/sportolok`** — still diverged; sovereign files still present on that branch until they delete them
- [ ] **Live ingest verification** — helpers exist; a real `POST /api/ingest` with `INGEST_API_KEY` against sport/padel not yet proven in this migration pass
- [ ] **Rewrite sportolok automation** to call ingest end-to-end (replace quarantined executor call sites)
- [ ] **Wire ClassScout catalog-loop runners** fully to classscout ingest (cutover from product-repo copies)
- [ ] **Publish / link** management `docs/content-data-contract.md` when core adds it
- [ ] **`fleet:daily-swot` Phases 2–4** — Phase 1 shipped (first digest + `npm run fleet:daily-swot`); still open: daily timer subscribe, inbox snapshots from client chats, `/fleet` index, recurring→HiTL contracts ([`fleet/digests/2026-09-24.md`](./fleet/digests/2026-09-24.md))
- [ ] Optional: single Cursor orchestrator timers **owned from** each `content.*/timers/` (padel still has a live `padel-find-tick` on the **padel Cloud Agent** chat — do not steal that session’s timer without coordinating)

### Split of ownership with the padel chat

| Concern | Owner chat / place |
| --- | --- |
| Padel FIND / about / quality / media Mongo CLIs, research fixtures, live catalogue | **Padel Africa chat** + management feature branch → `release/padel-africa` |
| Portable doctrine, Jobs site, multi-client agent architecture, sportolok/classscout agent code, ingest adapters | **This repo / your chat** |
| Shared engine bugs (extraction, schedule schema in management) | PR to management **`main`** |

Padel live tip (context only): catalogue ~169 PUBLISHED; orchestrator timer seeded KE Nakuru `research-ken-ven-007` (Royal Padelzone). Do not drive FIND from the SC-central chat unless asked.

---

## 5. Open work queue (priority)

1. **`fleet:daily-swot` Phase 2+** — subscribe daily timer; pull client `fleet/inbox` snapshots; grow digests ([`fleet/digests/2026-09-24.md`](./fleet/digests/2026-09-24.md)).
2. **Chase core** on `release/sportolok` reconcile using `CORE-TEAM-STATUS.md` + migration list (paths under `content.sportolok/`).
3. **Prove ingest** on sportolok and padel with a dry safe patch (schedule-shaped listing or sourceText card) — store lessons in the client folder, not Mongo from agent.
4. **Sportolok:** replace quarantined executor flows with ingest + `scheduleToRecurringSlots`; keep historical `src/` as reference only until rewritten.
5. **ClassScout:** finish agent cutover so `content.classscout/` is the only runner home; keep product ingest validation in classscout.
6. **Keep SSOT site honest** — when Jobs/Implement/Doctrine drift from `content.*` reality, fix the site on `main` the same day.
7. **Recommendations inbox** — accepted plans live under `recommendations/inbox/`; new process findings → Issue `agent-recommendation` or inbox MD.

---

## 6. Layout cheat sheet

```
sovereign.content/                    # main
├── HANDOVER.md                       # this file
├── CORE-TEAM-STATUS.md
├── AGENTS.md / README.md
├── fleet/                            # SC-central cross-agent jobs (daily SWOT)
├── src/app/…                         # docs site
├── recommendations/inbox/
├── content.padelafrica/
│   ├── AGENTS.md, pointers.json
│   ├── ingest/   (client.ts, content-data-contract.md, scheduleToRecurringSlots.ts)
│   ├── timers/   (orchestrator.md)
│   └── docs/     (jobs, FIND, self-heal, …)
├── content.sportolok/
│   ├── MIGRATION-FROM-MANAGEMENT.md
│   ├── ingest/
│   ├── src/      (QUARANTINE — migrated sovereign runtime)
│   └── scripts/
└── content.classscout/
    ├── ingest/   (ClassScout schedule contract)
    └── scripts/  (catalog-loop runners)
```

Each client: read **`AGENTS.md`** then **`pointers.json`** then **`ingest/`**.

---

## 7. Key URLs & remotes

| What | Where |
| --- | --- |
| This repo | https://github.com/moldovancsaba/sovereign.content |
| Live SSOT | https://sovereigncontent.messmass.com |
| Implement | https://sovereigncontent.messmass.com/implement |
| Jobs | https://sovereigncontent.messmass.com/jobs |
| Management engine | https://github.com/moldovancsaba/management |
| ClassScout product | https://github.com/moldovancsaba/classscout |
| Vercel docs project | `narimato/sovereign.content` |

**Auth note:** pushing `main` may need `SOVEREIGN_CONTENT_GITHUB_TOKEN` (or equivalent) in Cloud Agent envs — management’s default `GITHUB_TOKEN` can 403 this remote.

---

## 8. First hour (new SC-central agent)

1. `git clone` / pull `moldovancsaba/sovereign.content` **`main`**; confirm folders `content.padelafrica`, `content.sportolok`, `content.classscout`.
2. Read this file + [`AGENTS.md`](./AGENTS.md) + [`CORE-TEAM-STATUS.md`](./CORE-TEAM-STATUS.md).
3. Skim [`content.sportolok/MIGRATION-FROM-MANAGEMENT.md`](./content.sportolok/MIGRATION-FROM-MANAGEMENT.md) and `content.sportolok/src/QUARANTINE.md`.
4. Open `/implement` and `/jobs` locally (`npm run dev` → :3010) — fix any stale “one timer per job” / “no digest yet” wording if it reappears.
5. Pick the next open item from **§5** (usually: ingest proof or sportolok rewrite), not padel FIND.
6. Commit/push to **`main` only**. Never invent a second SSOT branch for agent code.

---

## 9. Anti-patterns (do not repeat)

- Committing agent runtimes onto `release/sportolok` or `release/padel-africa`
- Writing Mongo from agent code “because the CLI is faster”
- Storing schedule as free-text arrays or `{ weekdays: [...] }` on management clients
- Merging ClassScout forever-Find with padel until-found engines
- Treating dated management audits as runbooks (canonical how-to lives in `content.*/docs` + SSOT Jobs)
- Force-pushing management release branches

---

## 10. Message you can send the operator when you take over

> I’ve picked up **sovereign.content** as the central content-agent system. Client homes are `content.padelafrica/`, `content.sportolok/`, and `content.classscout/`. Ingest-only writes and schedule contracts are documented per client. Still waiting on management core to reconcile `release/sportolok`. Padel live FIND/quality continues in the separate padel chat; I’ll own multi-client architecture, SSOT site honesty, and sportolok/classscout agent cutover here.

---

## Related short docs

- [`AGENTS.md`](./AGENTS.md) — standing rules  
- [`CORE-TEAM-STATUS.md`](./CORE-TEAM-STATUS.md) — separation checklist for management core  
- [`content.padelafrica/AGENTS.md`](./content.padelafrica/AGENTS.md)  
- [`content.sportolok/AGENTS.md`](./content.sportolok/AGENTS.md)  
- [`content.classscout/AGENTS.md`](./content.classscout/AGENTS.md)  
- Site: `/implement`, `/jobs`, `/environments/cursor`, `/adopting`, `/whats-new`
