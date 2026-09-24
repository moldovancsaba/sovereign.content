# sportolok — sovereign content agent

**Owner:** content-agent team  
**Repo:** `moldovancsaba/sovereign.content` → this folder  
**Live app:** `sport.doneisbetter.com` (`moldovancsaba/management`, vertical `sportolok`)

## Rules (non-negotiable)

1. **This folder is the home** for sportolok sovereign agent code, docs, timers, and delivery reports.
2. **Do not** add routes, libs, or crons to `moldovancsaba/management`. Propose engine changes as PRs to `main` only.
3. **Do not** write Mongo from this agent. Talk to the live app only through documented public APIs (`POST /api/ingest` with scoped ingest/SSO machine token).
4. **Do not** import from `../content.padelafrica/` (or any other client folder).
5. Every listing / patch payload must match the schedule and field shapes in [`ingest/content-data-contract.md`](./ingest/content-data-contract.md) — especially `schedule.recurring[]` as **one object per weekday** (`weekday: "mon"`, never `weekdays: [...]` on one entry).

## Layout

| Path | Purpose |
| --- | --- |
| `src/lib/sovereign/` | Migrated agent runtime (quarantined Mongo executors — rewrite to ingest before re-enable) |
| `src/app/api/**` | Historical route shapes — **not** deployed from this docs site; reference only until a dedicated agent runner exists |
| `ingest/` | Allowed write helpers (`/api/ingest` client + schedule conversion) |
| `docs/` | Migrated delivery / system docs from management `release/sportolok` |
| `timers/` | Cursor `subscribe_timer` prompts |
| `scripts/` | Scenarios / verify — retarget to ingest, not management in-process |

## Engine vs agent

| Concern | Where |
| --- | --- |
| Vertical pack, browse UI, pipeline gate | `management` |
| Sovereign evaluate / delivery optimizer / self-heal agent | **here** |
| Process SSOT pages (Jobs, Doctrine) | `sovereign.content` site root (`src/app/…`) |

See root [`CORE-TEAM-STATUS.md`](../CORE-TEAM-STATUS.md) and [`MIGRATION-FROM-MANAGEMENT.md`](./MIGRATION-FROM-MANAGEMENT.md).
