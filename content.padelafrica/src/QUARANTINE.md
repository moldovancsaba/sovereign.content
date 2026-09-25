# QUARANTINE — do not execute against shared Mongo

Migrated out of `moldovancsaba/management` `release/padel-africa` on 2026-09-24
(response to management-core correction on PRs #222 / #227).

## Why

`listingQuality` / `catalog:*` / seed CLIs opened `MongoClient` and wrote listings and
quality collections directly. That is the **"Mongo-only quality-loop"** pattern management
asked us to end. Production was serving those merges on `padel-africa.doneisbetter.com`.

## Allowed write path

`../ingest/client.ts` → `POST /api/ingest` on `https://padel-africa.doneisbetter.com`
with payloads matching `../ingest/content-data-contract.md` (`RecurringSlot` singular `weekday`).

## Do not

- Import these modules into the management Next app
- Register `listing-quality-loop` (or other agent crons) on the management Vercel project
- Re-enable `mongoListingQualityStore` writes against shared DB
- Force-push `release/padel-africa` — management core reconciles after migration
- Run legacy `scripts/catalog-*.ts` that import `mongodb` — they call `refuseAgentMongo()` at start (2026-09-25 QA). Use `scripts/catalog-quality-loop-ingest.ts` only.

## Status

| Area | State |
| --- | --- |
| Code copy under `content.padelafrica/` | **Done** |
| Mongo write quarantine (store) | **Done** |
| Mongo CLI refuse guards on catalog scripts | **Done** (SC-central QA 2026-09-25) |
| Ingest-backed quality-loop rewrite | **Done** — `scripts/catalog-quality-loop-ingest.ts` (local recommendations/lessons + ingest reprocess; `--test` / `--dry-run` / `--apply`) |
| DISCOVERED → pipeline feed | **Done (agent side)** — `scripts/pipeline-feed-discovered.ts`; PUBLISHED still management-owned |
| Pending fixture → live ingest apply | **Unblocked** — `INGEST_API_KEY` live; queue + FIND ticks apply as `DISCOVERED` |
| Management delete + shared-engine revert | **Awaiting core** — `MIGRATION-FROM-MANAGEMENT.md` + `STATUS-FOR-CORE.md` READY |
