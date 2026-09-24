# content.padelafrica — Padel Africa agent home

**Folder:** `content.padelafrica/` only  
**Owner chat:** **Padel Africa Cloud Agent** (this vertical’s chat)  
**Repo touch surface:** `moldovancsaba/sovereign.content` → **`content.padelafrica/` exclusively**  
**Live app:** `padel-africa.doneisbetter.com` (`moldovancsaba/management`, vertical `padel-africa`)

## Scope (binding)

This agent works **only on Padel Africa**.

| In scope | Out of scope (hand off) |
| --- | --- |
| Padel FIND / about / quality / media / hygiene / self-heal digests | Sportolok, ClassScout, or any other vertical |
| Docs, timers, ingest helpers, research notes **inside `content.padelafrica/`** | Editing `content.sportolok/`, `content.classscout/`, `fleet/`, site root (`src/app`), `HANDOVER.md`, `CORE-TEAM-STATUS.md`, recommendations inbox |
| Management engine CLIs / fixtures on `release/padel-africa` workstreams | Management `release/sportolok`, classscout product repo, SSOT doctrine pages |
| Slim padel status snapshots **written into** `fleet/inbox/padelafrica/` when the fleet contract asks | Owning or running `fleet:daily-swot`, SC-central timers, or multi-client architecture |

**Rid of sovereign-direct / SC-central work from this chat.** The central sovereign.content system (Jobs site, fleet SWOT, other `content.*` cutovers) is owned by the **SC-central** Cloud Agent — see root [`HANDOVER.md`](../HANDOVER.md). Do not expand this chat into that role.

When committing to `sovereign.content` `main`, change **only paths under `content.padelafrica/`** (plus optional `fleet/inbox/padelafrica/` status JSON). Never “drive-by” edit sibling clients or the docs site from the padel chat.

## Rules (non-negotiable)

1. **This folder is the home** for padel-africa agent docs, timer prompts, research playbooks, and ingest-side automation.
2. **Do not** add routes, libs, or crons to `moldovancsaba/management` for agent features. Engine CLIs that already exist there (`catalog:quality-loop`, etc.) are management product surfaces — new agent automation calls public APIs from here.
3. **Do not** write the shared Mongo database from this agent as the steady-state path. Prefer `POST /api/ingest` (and other documented public APIs) with a scoped machine token. Operator hygiene may still invoke existing management `catalog:*` CLIs — do not add new Mongo writers here.
4. **Do not** import from `../content.sportolok/` or `../content.classscout/`.
5. Schedule / listing patches must match [`ingest/content-data-contract.md`](./ingest/content-data-contract.md) (`RecurringSlot` = singular `weekday`).
6. **Do not** merge ClassScout forever-Find with padel until-found engines.

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
| Agent orchestration, FIND playbooks, HiTL digests, timer prompts | **`content.padelafrica/` only** |
| Portable process contracts / fleet / other clients | SC-central agent + SSOT site root — **not this chat** |

Canonical worked examples also remain linked from management docs until release branch catches up; **edit agent how-to here first**.
