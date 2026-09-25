# content.padelafrica — Padel Africa agent home

**Folder:** `content.padelafrica/` only  
**Owner chat:** **Padel Africa Cloud Agent**  
**Repo touch surface:** `moldovancsaba/sovereign.content` → **`content.padelafrica/`** (+ optional `fleet/inbox/padelafrica/` status JSON)  
**Live app:** `padel-africa.doneisbetter.com` (`moldovancsaba/management`, vertical `padel-africa`)

**Fleet SSOT (read-only):** [`fleet/RULES.md`](../fleet/RULES.md) · [`fleet/CLIENT-COMPARISON.md`](../fleet/CLIENT-COMPARISON.md)

## Scope (binding)

Padel Africa **only**. No SC-central / fleet SWOT ownership / sibling `content.*` edits.

| In scope | Out of scope |
| --- | --- |
| Agent playbooks, timers, ingest helpers, migrated runners under this folder | `content.sportolok/`, `content.classscout/`, site root, `fleet/` (except inbox snapshots) |
| Slim `fleet/inbox/padelafrica/status-*.json` | Owning `fleet:daily-swot` or cross-client comparisons |
| Management **engine** fixes via PR to **`main`** only | Committing agent runtimes onto `release/padel-africa` |

## Doctrine vs reality (writes) — corrected 2026-09-24

| Column | Truth |
| --- | --- |
| **Doctrine** | `POST /api/ingest` via [`ingest/client.ts`](./ingest/client.ts) |
| **Forbidden** | Direct Mongo / new management routes-libs-crons / “Mongo-only quality-loop” |
| **Migrated copy** | Former management agent code lives under [`src/`](./src/) + [`scripts/`](./scripts/) — **[`src/QUARANTINE.md`](./src/QUARANTINE.md)** |
| **Core reconcile** | [`MIGRATION-FROM-MANAGEMENT.md`](./MIGRATION-FROM-MANAGEMENT.md) · [`STATUS-FOR-CORE.md`](./STATUS-FOR-CORE.md) |

PRs #222 / #227 put agent Mongo writers onto `release/padel-africa`. That pattern ends here: copies are quarantined; quality-loop entrypoint is `npm run catalog:quality-loop` → ingest-backed score/improve/encode (`scripts/catalog-quality-loop-ingest.ts`).

## Rules (non-negotiable)

1. **This folder is the home** for padel-africa agent code and docs.
2. **Do not** add routes, libs, or crons to `moldovancsaba/management` for agent features.
3. **Do not** write shared Mongo from this agent. Prefer ingest; refuse `mongoListingQualityStore` without explicit offline-only escape hatch.
4. **Do not** import from sibling `content.*` folders.
5. Schedule patches: singular `weekday` per [`ingest/content-data-contract.md`](./ingest/content-data-contract.md).
6. **Do not** force-push `release/padel-africa` — tell core when migration is ready (this STATUS file).
7. **Do not** merge ClassScout forever-Find with padel until-found.
8. Keep `padel-find-tick` on this chat; do not touch `fleet-daily-swot`.

## Layout

| Path | Purpose |
| --- | --- |
| `docs/` | Jobs, FIND, self-heal, dual-repo |
| `timers/` | Orchestrator prompt |
| `ingest/` | **Only** live write helpers |
| `src/` | Migrated agent runtime (**quarantined** Mongo) |
| `scripts/` | CLIs + research fixtures; quality-loop → ingest score/improve/encode; `pipeline:feed-discovered` |
| `scripts/fair-use/` | Africa directory fair-use feeder (one page/source/pass → `needs_verify` candidates) |
| `MIGRATION-FROM-MANAGEMENT.md` | Delete/revert list for core |
| `STATUS-FOR-CORE.md` | Reconcile handshake |

## Engine vs agent

| Concern | Where |
| --- | --- |
| Vertical pack, UI, public `/api/ingest`, product CLIs on **`main`** | `management` |
| Agent orchestration, listingQuality copy, FIND playbooks, seeds | **`content.padelafrica/`** |
| Portable process / fleet | SC-central |
