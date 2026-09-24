# Dual-repo workflow — management engine ↔ sovereign.content agents

**Binding for content agents (2026-09-24 separation).** Aligns with management core’s mandate:
sovereign agent code must not live inside `moldovancsaba/management` client release branches;
agents talk to live apps only through documented public APIs.

## Where things live

| Concern | Repository | Path / branch | Notes |
| --- | --- | --- | --- |
| **Process SSOT site** | [`sovereign.content`](https://github.com/moldovancsaba/sovereign.content) | `main` → site root (`/jobs`, `/implement`, …) | Doctrine + portable contracts |
| **Padel Africa agent** | `sovereign.content` | **`padel-africa/`** on `main` | Timers, ingest client, FIND/self-heal playbooks, HiTL |
| **Sportolok agent** | `sovereign.content` | **`sportolok/`** on `main` | Migrated sovereign runtime (quarantined Mongo writers) + ingest |
| **Management engine** | [`management`](https://github.com/moldovancsaba/management) | Feature → **`main`** (reviewed); release branches are **fast-forward only** | Vertical packs, UI, pipeline, public `/api/ingest` |
| **Live catalogue** | Mongo (per vertical) | — | Agents must **not** open Mongo |

Core-team status + sportolok file removal list:
https://github.com/moldovancsaba/sovereign.content/blob/main/CORE-TEAM-STATUS.md

## Agent rules

1. **New agent code / docs / timers** → `sovereign.content/<client>/` on `main`. Never commit agent
   runtimes onto `release/sportolok` or `release/padel-africa`.
2. **Engine changes** (extraction, hygiene, pack, flags, vercel crons) → PR to management **`main`**
   only. Do not diverge release branches.
3. **Content writes** → `POST /api/ingest` (scoped key) using
   `sovereign.content/<client>/ingest/`. Schedule must be `RecurringSlot[]` with singular `weekday`
   — see each client’s `ingest/content-data-contract.md` (mirror of management
   `src/lib/schedule/schedule.ts`; ask core for `docs/content-data-contract.md` if still missing).
4. **Do not** import across `padel-africa/` ↔ `sportolok/`.
5. Optional management **archive-backup** under `archive/<vertical>/` remains an engine/ops concern,
   not an agent home.

## Forbidden (caused the sportolok outage class of bugs)

- Writing `schedule.recurring` as `{ weekdays: [...], startTime, endTime }` on one object
- Free-text schedule arrays as the stored listing shape
- Adding `/api/sovereign/*` or agent crons inside the management deployment
- Direct Mongo writes from agent code

## Engine CLIs vs agent

Management may still ship operator/Cloud-Agent **engine** CLIs (`catalog:quality-loop`, …) on
release branches as product surfaces. **Sovereign agent orchestration** (self-heal autonomy,
delivery optimizer, FIND playbooks, timer prompts) is owned under `sovereign.content/<client>/`.

## Related

- Padel agent: https://github.com/moldovancsaba/sovereign.content/tree/main/padel-africa
- Sportolok agent: https://github.com/moldovancsaba/sovereign.content/tree/main/sportolok
- SSOT Implement: https://sovereigncontent.messmass.com/implement
- ClassScout twin (do not merge engines): [`classscout-sovereign-twin.md`](classscout-sovereign-twin.md)
