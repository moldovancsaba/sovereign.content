# Separation status for management core team

**Date:** 2026-09-24  
**Repos:** `moldovancsaba/sovereign.content`  
**Request:** move sovereign agent code out of `moldovancsaba/management`; stop writing on client release branches; talk to the app only via public ingest API.

## Done in this repo

| Requirement | Status |
| --- | --- |
| `sportolok/` top-level client folder | **Done** — agent workspace + migrated `src/lib/sovereign/*`, APIs, crons, scripts, docs |
| `content.padelafrica/` top-level client folder | **Done** — agent workspace: docs, timers, ingest client, schedule contract mirror |
| `classscout/` top-level client folder | **Done** — ClassScout / Your Field agent: catalog-loop runners, ingest client, ClassScout schedule contract, docs (product remains `moldovancsaba/classscout`) |
| Clients do not import each other | **Done** — duplicated ingest/schedule helpers per client |
| Agent write path = public ingest only | **Documented + helpers shipped** — see each client's `ingest/` and `AGENTS.md`. Legacy Mongo-direct executor code under `sportolok/src/` is **quarantined** (must not run in management deploy). ClassScout runners still resolving product `node_modules` for env during cutover must **mutate listings only via ingest** |
| Schedule shape | **Per client** — management clients: `RecurringSlot` (`weekday` singular). ClassScout: `recurringPrograms[].daysOfWeek` (Monday..Sunday) — see `classscout/ingest/content-data-contract.md` |

## What we did **not** do (per your instructions)

- **Did not** rewrite or force-push `release/sportolok`. That branch still contains the in-engine sovereign agent and the divergent commits. **Please reconcile it back to a fast-forward from `main`** now that copies live here under `sportolok/`.
- **Did not** delete files from `release/sportolok` ourselves.

## Files that must leave `management` on reconcile (sportolok)

Full list: [`sportolok/MIGRATION-FROM-MANAGEMENT.md`](./sportolok/MIGRATION-FROM-MANAGEMENT.md).

Shared engine edits that were sportolok-only (e.g. `vercel.json` media-curate / sovereign-delivery crons, `pipeline/extraction` / hygiene / pack / flags if touched) must return to `main` via normal reviewed PRs — never via the release branch.

## Padel-africa note

Padel Cloud Agent work (FIND / self-heal digests / quality ticks) continues as **agent ops owned under `content.padelafrica/`**. Engine-native CLIs that remain in `management` (`catalog:quality-loop`, etc.) are management product surfaces; **new** sovereign agent automation must call `/api/ingest` (or other documented public APIs) from this repo’s client folder — not add routes/libs/crons to `management`, and not write Mongo from the agent.

## ClassScout note

ClassScout’s product app was **never** inside `management`. Agent runners moved here from
`moldovancsaba/classscout` `scripts/catalog-loop/`. Product ingest validation and UI stay in
classscout. Transitional product-repo copies may remain until cutover; **canonical agent home is
`classscout/` in this repo**.

## Confirm

When you have reconciled `release/sportolok`, please close the loop with us. Agent ownership for
clients is now **`sovereign.content/<client>/`** (`classscout`, `padel-africa`, `sportolok`).
