# Separation status for management core team

**Date:** 2026-09-24 (updated naming)  
**Repos:** `moldovancsaba/sovereign.content` @ `main`  
**Request:** move sovereign agent code out of `moldovancsaba/management`; stop writing on client release branches; talk to the app only via public ingest API.

**Full agent handover:** [`HANDOVER.md`](./HANDOVER.md)

## Done in this repo

| Requirement | Status |
| --- | --- |
| `content.sportolok/` top-level client folder | **Done** — agent workspace + migrated `src/lib/sovereign/*`, APIs, crons, scripts, docs |
| `content.padelafrica/` top-level client folder | **Done** — agent workspace: docs, timers, ingest client, schedule contract mirror |
| `content.classscout/` top-level client folder | **Done** — ClassScout / Your Field agent (product remains `moldovancsaba/classscout`) |
| Clients do not import each other | **Done** — duplicated ingest/schedule helpers per client |
| Agent write path = public ingest only | **Documented + helpers shipped** — see each client's `ingest/` and `AGENTS.md`. Legacy Mongo-direct executor under `content.sportolok/src/` is **quarantined** |
| Schedule shape | **Per client** — management: `RecurringSlot` (`weekday` singular). ClassScout: `recurringPrograms[].daysOfWeek` |

## What we did **not** do (per your instructions)

- **Did not** rewrite or force-push `release/sportolok`. Please reconcile it to a fast-forward from `main` now that copies live under `content.sportolok/`.
- **Did not** delete files from `release/sportolok` ourselves.

## Files that must leave `management` on reconcile (sportolok)

Full list: [`content.sportolok/MIGRATION-FROM-MANAGEMENT.md`](./content.sportolok/MIGRATION-FROM-MANAGEMENT.md).

## Confirm

When you have reconciled `release/sportolok`, close the loop with us. Agent ownership is **`sovereign.content/content.<client>/`**.

**Maturity snapshot** (forever / scripts / cutover):
[`fleet/CLIENT-COMPARISON.md`](./fleet/CLIENT-COMPARISON.md) · rules [`fleet/RULES.md`](./fleet/RULES.md).
Root `CLIENT-FOLDER-COMPARISON.md` is a stub — do not extend it.
