# QUARANTINE — do not execute against shared Mongo

This tree was migrated out of `moldovancsaba/management` `release/sportolok` on 2026-09-24.

The original `executor.ts` / delivery paths opened `Db` and wrote listings directly. That caused
a production outage when schedule shapes did not match the management `RecurringSlot` contract.

**Allowed write path:** `../../ingest/client.ts` → `POST /api/ingest` with payloads validated by
`scheduleToRecurringSlots` / `content-data-contract.md`.

Do not import these modules into the management Next app. Do not register these routes on the
management Vercel project. Rewrite call sites to ingest before re-enabling automation.
