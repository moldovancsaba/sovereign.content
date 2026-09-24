# padel-africa — sovereign content agent

**Owner:** content-agent team  
**Repo:** `moldovancsaba/sovereign.content` → this folder  
**Live app:** `padel-africa.doneisbetter.com` (`moldovancsaba/management`, vertical `padel-africa`)

## Rules (non-negotiable)

1. **This folder is the home** for padel-africa agent docs, timer prompts, research playbooks, and ingest-side automation.
2. **Do not** add routes, libs, or crons to `moldovancsaba/management` for agent features. Engine CLIs that already exist there (`catalog:quality-loop`, etc.) are management product surfaces — new agent automation calls public APIs from here.
3. **Do not** write the shared Mongo database from this agent. Use `POST /api/ingest` (and other documented public APIs) with a scoped machine token.
4. **Do not** import from `../sportolok/`.
5. Schedule / listing patches must match [`ingest/content-data-contract.md`](./ingest/content-data-contract.md) (`RecurringSlot` = singular `weekday`).

## Layout

| Path | Purpose |
| --- | --- |
| `docs/` | Jobs, FIND, self-heal, twin, dual-repo (agent-facing copies) |
| `timers/` | Single orchestrator Cursor timer prompt |
| `ingest/` | Ingest client + schedule conversion + content contract mirror |
| `research/` | Research notes / attempt summaries (no live catalogue dump) |
| `scripts/` | Agent helpers that call ingest / report only |

## Engine vs agent

| Concern | Where |
| --- | --- |
| Vertical pack, listing UI, engine `catalog:*` CLIs + crons | `management` → `release/padel-africa` |
| Agent orchestration, FIND playbooks, HiTL digests, timer prompts | **here** |
| Portable process contracts | site root `/jobs`, `/implement`, … |

Canonical worked examples also remain linked from management docs until release branch catches up; **edit agent how-to here first**.
