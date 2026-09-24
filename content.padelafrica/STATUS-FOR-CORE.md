# Status for management core — padel-africa agent separation

**Date:** 2026-09-24  
**From:** Padel Africa content agent  
**Re:** Required separation out of `moldovancsaba/management` → `sovereign.content/content.padelafrica/`  
**Trigger:** Core correction on PRs #222 / #227 (`release/padel-africa`, production `abc473d`)

## Done on sovereign.content `main`

| DoD item | Status |
| --- | --- |
| Agent files listed in the correction exist under **`content.padelafrica/`** (canonical `content.*` name; not `padel-africa/`) | **Done** — libs, cron route copy, seed/catalog scripts, research fixtures, playbooks |
| Mongo writers quarantined in the agent home | **Done** — [`src/QUARANTINE.md`](./src/QUARANTINE.md); `mongoListingQualityStore` refuses writes |
| Delete + shared-engine revert list published | **Done** — [`MIGRATION-FROM-MANAGEMENT.md`](./MIGRATION-FROM-MANAGEMENT.md) |
| Agent writes doctrine = `/api/ingest` only | **Documented** — [`ingest/`](./ingest/); timer/AGENTS updated |
| Independent ingest-backed quality-loop | **Stubbed** — `scripts/catalog-quality-loop-ingest.ts` (no Mongo); full score/improve rewrite continues without re-enabling Mongo |

## Explicitly not done by this agent (per your instructions)

- **Did not** rewrite or force-push `release/padel-africa`
- **Did not** delete files from management ourselves
- **Did not** revert shared engine files on the release branch — that is your reconcile

## Please reconcile when ready

1. Remove paths in migration §A from `release/padel-africa` (and stop deploying them).
2. Restore §B files to match `main` (especially `verticals/sportolok/index.ts`).
3. Drop `/api/cron/listing-quality-loop` from the padel Vercel project.
4. Close the loop with us when `release/padel-africa` is a clean fast-forward from `main` again.

## Going forward

Padel Cloud Agent owns **only** `content.padelafrica/` (+ optional `fleet/inbox/padelafrica/` status JSON).  
No new agent code onto management release branches. No Mongo-from-agent.  
Engine fixes → reviewed PR to management **`main`** only.
