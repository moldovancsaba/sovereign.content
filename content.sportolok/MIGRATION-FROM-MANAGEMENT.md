# Files to remove from `moldovancsaba/management` when reconciling `release/sportolok`

These were copied into `sovereign.content/content.sportolok/` on 2026-09-24. They must not remain
in the management app deployment.

## Sovereign agent runtime

- `src/lib/sovereign/` (entire directory)
- `src/lib/pipeline/sovereignIntegration.ts`
- `src/app/api/sovereign/` (entire directory)
- `src/app/api/cron/sovereign-delivery-optimizer/`
- `src/app/api/cron/media-curate/` (sportolok addition — media-curate as a management cron twin belongs on `main` only if reviewed; agent-side media lives here)

## Scripts

- `scripts/test-sovereign-scenarios.ts`
- `scripts/verify-sovereign-deployment.ts`
- `scripts/demo-sovereign-scenarios.ts`
- `scripts/seed-quality-lessons.mts`
- `scripts/catalog-self-heal.mts`
- `scripts/catalog-self-heal-smart.mts`

## Docs / delivery reports (sportolok sovereign)

- `SOVEREIGN-SYSTEM-COMPLETE.md`
- `SOVEREIGN-TESTING-RESULTS.md` (if present)
- `docs/INTELLIGENT-SELF-HEALING-DELIVERED.md`
- `docs/SELF-HEALING-PHASE1-DELIVERED.md`
- `docs/SOVEREIGN-CONTENT-DELIVERED.md`
- `docs/self-healing-audit-2026-09-24.md`
- `docs/self-healing-implementation-plan.md`
- `docs/sovereign-*.md`

## Config

- `vercel.json` entries for `/api/cron/media-curate` and `/api/cron/sovereign-delivery-optimizer`

## Shared engine files

If `release/sportolok` diverged on any of these, restore them to match `main` (or land intentional
fixes as reviewed PRs to `main`):

- `src/lib/pipeline/extraction.ts`
- `src/lib/catalogHygiene/descriptionQuality.ts`
- `src/lib/vertical/pack.ts`
- `src/lib/flags/registry.ts`

**Do not force-push `release/sportolok` from the content-agent side** — management core owns that reconcile.
