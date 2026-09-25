# content.sportolok — Sportolok agent home

**Folder:** `content.sportolok/` only  
**Owner chat:** **Sportolok Cloud Agent**  
**Repo touch surface:** `moldovancsaba/sovereign.content` → **`content.sportolok/`** (+ optional `fleet/inbox/sportolok/` status JSON)  
**Live app:** `sport.doneisbetter.com` (`moldovancsaba/management`, vertical `sportolok`)

**Fleet SSOT (read-only):** [`fleet/RULES.md`](../fleet/RULES.md) · [`fleet/CLIENT-COMPARISON.md`](../fleet/CLIENT-COMPARISON.md)

## Scope (binding)

Sportolok **only**. No SC-central / fleet SWOT ownership / sibling `content.*` edits.

| In scope | Out of scope |
| --- | --- |
| Agent playbooks, timers, ingest helpers, migrated runners under this folder | `content.padelafrica/`, `content.classscout/`, site root, `fleet/` (except inbox snapshots) |
| Slim `fleet/inbox/sportolok/status-*.json` | Owning `fleet:daily-swot` or cross-client comparisons |
| Management **engine** fixes via PR to **`main`** only | Committing agent runtimes onto `release/sportolok` |

## Doctrine vs reality (writes) — corrected 2026-09-24

| Column | Truth |
| --- | --- |
| **Doctrine** | `POST /api/ingest` via [`ingest/client.ts`](./ingest/client.ts) |
| **Forbidden** | Direct Mongo / new management routes-libs-crons / "Mongo-only quality-loop" |
| **Migrated copy** | Former management agent code lives under [`src/`](./src/) + [`scripts/`](./scripts/) — **[`src/QUARANTINE.md`](./src/QUARANTINE.md)** |
| **Core reconcile** | [`MIGRATION-FROM-MANAGEMENT.md`](./MIGRATION-FROM-MANAGEMENT.md) · [`SOVEREIGN-MIGRATION-COMPLETE-2026-09-24.md`](./SOVEREIGN-MIGRATION-COMPLETE-2026-09-24.md) |
| **LLM** | **Cursor Cloud Agent (this agent, executing right now)** — NO OLLAMA, NO AI GATEWAY, NO EXTERNAL LLM |

Direct Mongo writes caused the production outage on `sport.doneisbetter.com/browse`. All writes now go through validated ingest.

## Rules (non-negotiable)

1. **This folder is the home** for sportolok agent code and docs.
2. **Do not** add routes, libs, or crons to `moldovancsaba/management` for agent features.
3. **Do not** write shared Mongo from this agent. Prefer ingest; refuse direct Mongo writes.
4. **Do not** import from sibling `content.*` folders.
5. Schedule patches: singular `weekday` per [`ingest/content-data-contract.md`](./ingest/content-data-contract.md).
6. **Do not** force-push `release/sportolok` — tell core when migration is ready.
7. **I (the Cursor Cloud Agent) am the LLM** — NO OLLAMA, NO AI GATEWAY. I perform ALL cognitive tasks: scoring quality, writing About descriptions, extracting structured facts.
8. Keep `sportolok-tick` on this chat; do not touch `fleet-daily-swot`.

## Layout

| Path | Purpose |
| --- | --- |
| `docs/` | Jobs, FIND, self-heal, dual-repo |
| `timers/` | Orchestrator prompt |
| `ingest/` | **Only** live write helpers |
| `src/` | Migrated agent runtime (**quarantined** Mongo) |
| `scripts/` | CLIs + research fixtures; quality-loop → ingest stub |
| `MIGRATION-FROM-MANAGEMENT.md` | Delete/revert list for core |
| `SOVEREIGN-MIGRATION-COMPLETE-2026-09-24.md` | Migration completion report |

## Engine vs agent

| Concern | Where |
| --- | --- |
| Vertical pack, UI, public `/api/ingest`, product CLIs on **`main`** | `management` |
| Agent orchestration, listingQuality copy, FIND playbooks, seeds | **`content.sportolok/`** |
| Portable process / fleet | SC-central |

## LLM Architecture

**I (the Cursor Cloud Agent executing right now) am the LLM.** NO OLLAMA. NO AI GATEWAY. NO EXTERNAL LLM SERVER.

I directly perform:
- Quality scoring of descriptions
- Writing About text from evidence
- Extracting structured facts
- All cognitive catalog operations

Job structure follows `content.padelafrica` pattern with the Cursor Cloud Agent (me, this agent) as the exclusive LLM.
