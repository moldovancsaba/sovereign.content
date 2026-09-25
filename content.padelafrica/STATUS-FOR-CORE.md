# Status for management core — padel-africa agent separation

**Date:** 2026-09-24 (triage addendum **2026-09-25**)  
**From:** Padel Africa content agent  
**Re:** Required separation out of `moldovancsaba/management` → `sovereign.content/content.padelafrica/`  
**Trigger:** Core correction on PRs #222 / #227 (`release/padel-africa`, production `abc473d`)  
**Follow-up:** Core message — reconcile blocked until unlisted release-only files are triaged

## Done on sovereign.content `main`

| DoD item | Status |
| --- | --- |
| Agent files listed in the correction exist under **`content.padelafrica/`** (canonical `content.*` name; not `padel-africa/`) | **Done** — libs, cron route copy, seed/catalog scripts, research fixtures, playbooks |
| Mongo writers quarantined in the agent home | **Done** — [`src/QUARANTINE.md`](./src/QUARANTINE.md); `mongoListingQualityStore` refuses writes; catalog entrypoints `refuseAgentMongo()` |
| Delete + shared-engine revert list published | **Done** — [`MIGRATION-FROM-MANAGEMENT.md`](./MIGRATION-FROM-MANAGEMENT.md) (**updated 2026-09-25** with §D engine triage + fixed research-seed glob) |
| Agent writes doctrine = `/api/ingest` only | **Documented** — [`ingest/`](./ingest/); `INGEST_API_KEY` live on Vercel; pending queue applied as `DISCOVERED` cards |
| Independent ingest-backed quality-loop | **Stubbed** — `scripts/catalog-quality-loop-ingest.ts` (no Mongo); full score/improve rewrite continues without re-enabling Mongo |
| Unlisted agent scripts + country research seeds copied | **Done 2026-09-25** — `scripts/legacy-mongo/{override-insights,catalog-lessons,catalog-repair-structured-geo}.ts`; `docs/research-seeds/*-padel-research-seed.md` (53) |

## Explicitly not done by this agent (per your instructions)

- **Did not** rewrite or force-push `release/padel-africa`
- **Did not** delete files from management ourselves
- **Did not** revert shared engine files on the release branch — that is your reconcile
- **Did not** copy §D engine libs/scripts into sovereign.content (they belong on management `main` via reviewed PR)

## Triage reply (2026-09-25) — unlisted release-only paths

### 1. Classification

**Agent-specific → §A (copied into `content.padelafrica/`):**

| Path | Disposition |
| --- | --- |
| `scripts/override-insights.ts` | Agent CLI for `overrideInsights` (already §A lib) → `scripts/legacy-mongo/override-insights.ts` |
| `scripts/catalog-lessons.ts` | Agent CLI for `sovereignLessons` → `scripts/legacy-mongo/catalog-lessons.ts` |
| `scripts/catalog-repair-structured-geo.ts` | Padel/openclaw hardcoded research patches → `scripts/legacy-mongo/catalog-repair-structured-geo.ts` |
| `docs/*-padel-research-seed.md` (53) | Agent research notes → `docs/research-seeds/` |

**Genuine engine → §D (reviewed PR to `main` before any delete/reset):**

- `src/components/ReviewQueueFilters.tsx`
- `src/lib/catalogHygiene/{contactEnrich,contactReject,mediaCurate}.ts`
- `src/lib/geo/streetLevel.ts`
- `src/lib/media/{imageHost,pageSnapshot,r2Upload}.ts`
- `src/lib/aiGatewayHealth.ts`, `src/lib/cron/cliTwins.ts`
- `scripts/llm-{benchmark,health,release-gate}.ts`, `scripts/check-cron-cli-twins.ts`
- `scripts/catalog-{engagement-counters,research-fields-reverify,saved-listing-notifications}.ts`

Full rationale table: [`MIGRATION-FROM-MANAGEMENT.md` §D](./MIGRATION-FROM-MANAGEMENT.md).

### 2. Docs glob mismatch — fixed

Old text claimed `docs/padel-africa-*.md` covered playbooks; **per-country notes are named** `docs/<country>-padel-research-seed.md` and would have been silently missed. Migration list now names `docs/*-padel-research-seed.md` explicitly; all 53 copied under `docs/research-seeds/`.

### 3. `archive/padel-africa/` — disposable

**Confirmed.** Dated Mongo JSON dumps / snapshot backup only; live SSOT is Mongo. Safe to drop on reconcile. Do not copy into sovereign.content.

## Please reconcile when ready

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
