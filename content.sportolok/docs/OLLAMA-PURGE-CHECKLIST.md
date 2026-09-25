# OLLAMA PURGE CHECKLIST

**Date:** 2026-09-24  
**Status:** All active Ollama references removed from sportolok agent  
**LLM:** Cloud Agent (YOU) — NO OLLAMA, NO AI GATEWAY, NO EXTERNAL LLM

## Sportolok Agent (sovereign.content/content.sportolok) - ✅ CLEAN

All Ollama references removed. Only documentation mentions remain:
- `docs/sovereign-content-alignment.md` - states "No Ollama"
- `docs/MIGRATION-SOVEREIGN-SEPARATION.md` - migration history
- `docs/SOVEREIGN-MIGRATION-COMPLETE-2026-09-24.md` - migration history
- `docs/sovereign-content-phase1-complete.md` - states "No Ollama"
- `scripts/catalog-hygiene.mts` - comment states "No Ollama"

## Management Repo (moldovancsaba/management) - REMAINING REFERENCES

The following files in management contain Ollama references. These are NOT part of the sportolok agent runtime and should be cleaned by core team:

### Test Files (Legacy)
- `src/lib/pipeline/extraction.test.ts`
- `src/lib/pipeline/extraction.reachability.test.ts`
- `src/lib/reports/reports.test.ts`
- `src/lib/cron/cronRuns.test.ts`
- `src/lib/cron/cronStatusReport.test.ts`
- `src/components/AutomationPanel.test.tsx`

### Library Files (Deprecated)
- `src/lib/localAiHealth.ts` - entire file should be removed
- `src/lib/cron/cronRuns.ts` - Ollama health checks

### API Routes (Deprecated Cron Jobs)
- `src/app/api/cron/content-intelligence-autopilot/route.ts` - **RETURNS "OLLAMA_URL not configured"**
- `src/app/api/cron/content-intelligence-autopilot/route.test.ts`
- `src/app/api/cron/research-fields-reverify/route.ts`
- `src/app/api/cron/research-fields-reverify/route.test.ts`
- `src/app/api/cron/serving-reconcile/route.ts`
- `src/app/api/cron/curator/route.ts`
- `src/app/api/admin/content-intelligence/automation/route.ts`
- `src/app/api/ingest/route.ts`
- `src/app/api/admin/content-intelligence/extract-candidate/route.ts`

### Scripts (Legacy)
- `scripts/run-padelafrica-daemon.sh`
- `scripts/run-sportolok-daemon.sh`
- `scripts/local-ai-benchmark.ts`
- `scripts/run-maintainer-once.ts`
- `scripts/local-ai-release-gate.ts`
- `scripts/run-pipeline-local.mts`
- `scripts/check-content.ts`
- `scripts/local-ai-health.ts`
- `scripts/lite-e2e-publishability.ts`
- `scripts/daemon-loop.ts`
- `scripts/_repair-five.mts`
- `scripts/_pipeline-continuous.mts`
- `scripts/_repair-language.mts`
- `scripts/board/issues/listing-detail-sections.py`
- `scripts/board/issues/selfhost.py`
- `scripts/board/issues/admin-refactor-gaps-4.py`

### Documentation (Outdated)
- `docs/engine-parity-tracker.md`
- `docs/platform-architecture.md`
- `docs/operations.md`
- `docs/flags.md`
- `CHANGELOG.md`
- `docs/classscout-transition.md`
- `docs/documentation-audit-report.md`
- `docs/architecture.md`
- `docs/ECOSYSTEM-split-chappie-tribecca.md`
- `docs/HANDOVER.md`
- `docs/specs/classscout-lib-discovery-servingmodel-localai-spec.reverify-2026-09-21.md`
- `docs/specs/classscout-lib-discovery-servingmodel-localai-spec.md`
- `docs/specs/classscout-api-content-intelligence-spec.reverify-2026-09-21.md`
- `docs/specs/classscout-api-content-intelligence-spec.md`

### Code Files (Deprecated Feature Flags)
- `src/lib/flags/registry.ts` - Ollama feature flags
- `src/lib/pipeline/extraction.ts` - Ollama extraction logic

## Action Required

**Management Core Team:** Please purge all Ollama references from `moldovancsaba/management`:
1. Remove deprecated cron routes returning "OLLAMA_URL not configured" errors
2. Remove `src/lib/localAiHealth.ts` entirely
3. Update flags registry to remove Ollama feature flags
4. Update extraction.ts to remove Ollama code paths
5. Clean test files and documentation
6. Remove legacy daemon scripts

## Architecture Going Forward

**Cloud Agent is the LLM** for all sovereign content operations:
- Quality scoring
- About description writing
- Fact extraction
- All cognitive catalog tasks

NO external LLM server. NO Ollama. NO AI Gateway.
All sovereign agent code lives in `moldovancsaba/sovereign.content/content.sportolok/`.
All catalog writes go through `POST /api/ingest` with Zod validation.
