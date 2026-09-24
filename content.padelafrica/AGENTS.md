# content.padelafrica — Padel Africa agent home

**Folder:** `content.padelafrica/` only  
**Owner chat:** **Padel Africa Cloud Agent** (this vertical’s chat)  
**Repo touch surface:** `moldovancsaba/sovereign.content` → **`content.padelafrica/`** (+ optional `fleet/inbox/padelafrica/` status JSON)  
**Live app:** `padel-africa.doneisbetter.com` (`moldovancsaba/management`, vertical `padel-africa`)

**Fleet SSOT (read-only for this chat — do not edit comparisons):**  
[`fleet/RULES.md`](../fleet/RULES.md) · [`fleet/CLIENT-COMPARISON.md`](../fleet/CLIENT-COMPARISON.md) · [`fleet/profiles/padelafrica.json`](../fleet/profiles/padelafrica.json)

## Scope (binding)

This agent works **only on Padel Africa**.

| In scope | Out of scope (hand off) |
| --- | --- |
| Padel FIND / about / quality / media / hygiene / self-heal digests | Sportolok, ClassScout, or any other vertical |
| Docs, timers, ingest helpers **inside `content.padelafrica/`** | Editing `content.sportolok/`, `content.classscout/`, `fleet/` (except inbox snapshots), site root, `HANDOVER.md`, recommendations |
| Management engine CLIs / fixtures on `release/padel-africa` workstreams | `release/sportolok`, classscout product repo, cross-client comparison docs |
| Slim status → `fleet/inbox/padelafrica/status-YYYY-MM-DD.json` | Owning `fleet:daily-swot`, SC-central timers, or `fleet/CLIENT-COMPARISON.md` |

**Rid of sovereign-direct / SC-central work.** Do not publish new comparison files; never extend root/workflow stubs. Canonical comparison is `fleet/CLIENT-COMPARISON.md` only.

## Doctrine vs reality (writes)

| Column | Truth |
| --- | --- |
| **Doctrine** | Agent writes via `POST /api/ingest` from `ingest/client.ts` |
| **Reality today** | Orchestrator ticks still run management **`catalog:*` Mongo CLIs** as product operator tools |
| **Honest claim** | Ingest-only is the target steady-state — **not** current tick reality. Do not claim “API-only enforced” until writes go through `content.padelafrica/ingest/` |

## Rules (non-negotiable)

1. **This folder is the home** for padel-africa agent docs, timer prompts, and ingest-side automation.
2. **Do not** add routes, libs, or crons to `moldovancsaba/management` for agent features. Engine CLIs (`catalog:quality-loop`, etc.) are management product surfaces.
3. Prefer ingest for new agent automation; operator ticks may use existing management `catalog:*` — track the gap (above). Never invent phones/emails/ages/court counts.
4. **Do not** import from `../content.sportolok/` or `../content.classscout/`.
5. Schedule patches must match [`ingest/content-data-contract.md`](./ingest/content-data-contract.md) (`RecurringSlot` = singular `weekday`).
6. **Do not** merge ClassScout forever-Find with padel until-found engines.
7. Keep timer `padel-find-tick` on **this** chat. Do not touch `fleet-daily-swot`.

## Layout

| Path | Purpose | Status |
| --- | --- | --- |
| `docs/` | Jobs, FIND, self-heal, dual-repo (agent-facing copies) | populated |
| `timers/` | Single orchestrator Cursor timer prompt | populated |
| `ingest/` | Ingest client + schedule conversion + contract mirror | populated |
| `research/` | Optional research notes (no catalogue dump) | **empty** — add files when needed; not required |
| `scripts/` | Optional ingest/report helpers | **empty** — ticks use management `catalog:*` today |

## Engine vs agent

| Concern | Where |
| --- | --- |
| Vertical pack, listing UI, engine `catalog:*` CLIs + crons | `management` → `release/padel-africa` |
| Agent playbooks, HiTL digests, timer prompts | **`content.padelafrica/`** |
| Portable process / fleet comparison / other clients | SC-central — **not this chat** |

**Edit agent how-to here first.** Cross-client maturity edits → propose to SC-central for `fleet/CLIENT-COMPARISON.md` (do not fork a local comparison).
