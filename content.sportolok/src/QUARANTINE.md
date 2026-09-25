# QUARANTINE — do not execute against shared Mongo

Migrated out of `moldovancsaba/management` `release/sportolok` on 2026-09-24
(response to management-core correction on dual-repo architecture).

## Why

`listingQuality` / `catalog:*` / seed CLIs opened `MongoClient` and wrote listings and
quality collections directly. That pattern caused the production outage on
`sport.doneisbetter.com/browse` when malformed schedule data (`weekdays` array instead of
singular `weekday` per `RecurringSlot`) was written directly to Mongo, bypassing validation.

Management core requested all sovereign content-agent code be separated into
`moldovancsaba/sovereign.content` and that ALL writes go through the validated
`POST /api/ingest` endpoint.

## Allowed write path

`../ingest/client.ts` → `POST /api/ingest` on `https://sport.doneisbetter.com`
with payloads matching `../ingest/content-data-contract.md` (`RecurringSlot` singular `weekday`).

## Do not

- Import these modules into the management Next app
- Register `catalog:*` agent crons on the management Vercel project
- Re-enable direct Mongo writes against shared DB
- Force-push `release/sportolok` — management core reconciles after migration

## Status

| Area | State |
| --- | --- |
| Code copy under `content.sportolok/` | **Done** |
| Mongo write quarantine | **Done** (`src/QUARANTINE.md`) |
| Ingest-backed quality-loop rewrite | **Done** — `scripts/catalog-quality-loop-ingest.ts` uses public sitemap + `executorIngest` |
| About / media catalog jobs | **Done** — `catalog-about-curate-ingest.ts` / `catalog-media-curate-ingest.ts`; Mongo copies under `scripts/legacy-mongo/` |
| Management delete + shared-engine revert | **Done** — see `MIGRATION-FROM-MANAGEMENT.md` + `SOVEREIGN-MIGRATION-COMPLETE-2026-09-24.md` |
