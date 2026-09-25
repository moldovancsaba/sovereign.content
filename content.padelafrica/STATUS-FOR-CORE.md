# Status for management core — padel-africa agent separation

**Date:** 2026-09-24 (triage addendum **2026-09-25**; **READY FOR RECONCILE** stamped **2026-09-25T19:05Z**)  
**From:** Padel Africa content agent  
**Re:** Required separation out of `moldovancsaba/management` → `sovereign.content/content.padelafrica/`  
**Trigger:** Core correction on PRs #222 / #227 (`release/padel-africa`, production `abc473d`)  
**Follow-up:** Core message — reconcile blocked until unlisted release-only files are triaged  

## Agent-side DoD — COMPLETE (2026-09-25)

| DoD item | Status |
| --- | --- |
| Agent files listed in the correction exist under **`content.padelafrica/`** | **Done** |
| Mongo writers quarantined + CLI `refuseAgentMongo()` | **Done** |
| Delete + shared-engine revert list published | **Done** — [`MIGRATION-FROM-MANAGEMENT.md`](./MIGRATION-FROM-MANAGEMENT.md) |
| Agent writes doctrine = `/api/ingest` only | **Done** — live FIND ticks + quality reprocess via ingest |
| Independent ingest-backed quality-loop | **Done** — `scripts/catalog-quality-loop-ingest.ts` (score/improve/encode local store + ingest reprocess; `--test` proves thin→compose) |
| DISCOVERED pipeline feeder (agent side) | **Done** — `scripts/pipeline-feed-discovered.ts` (30/30 reprocess ok @ 19:02Z); **PUBLISHED still owned by management pipeline** |
| Unlisted agent scripts + country research seeds copied | **Done** |
| Inbox continuity day-1 + day-2 + day-3 | **Done** — `fleet/inbox/padelafrica/status-2026-09-24.json` + `status-2026-09-25.json` + `status-2026-09-26.json` |

## Explicitly not done by this agent (per your instructions)

- **Did not** rewrite or force-push `release/padel-africa`
- **Did not** delete files from management ourselves
- **Did not** revert shared engine files on the release branch — that is your reconcile
- **Did not** copy §D engine libs/scripts into sovereign.content (they belong on management `main` via reviewed PR)
- **Did not** Mongo-force `lifecycleState: PUBLISHED` — ingest creates/reprocesses cards; pipeline earns publish

## Please reconcile when ready (unchanged ask)

1. **First:** land §D engine paths on management `main` via reviewed PR(s) (or explicitly waive with a written decision).
2. Remove paths in migration §A from `release/padel-africa` (and stop deploying them).
3. Restore §B files to match `main` (especially `verticals/sportolok/index.ts`).
4. Drop `/api/cron/listing-quality-loop` from the padel Vercel project.
5. Delete `archive/padel-africa/` as disposable.
6. Close the loop with us when `release/padel-africa` is a clean fast-forward from `main` again.

## Going forward

Padel Cloud Agent owns **only** `content.padelafrica/` (+ optional `fleet/inbox/padelafrica/` status JSON).  
No new agent code onto management release branches. No Mongo-from-agent.  
Engine fixes → reviewed PR to management **`main`** only.

**Handshake:** agent-side migration + ingest quality rewrite + DISCOVERED feeder are ready. Core owns §D land + release branch cleanup.
