# Files to remove / revert in `moldovancsaba/management` when reconciling `release/padel-africa`

**Copied into** `sovereign.content/content.padelafrica/` on 2026-09-24 (+ triage addendum 2026-09-25).  
**Canonical folder name:** `content.padelafrica/` (not `padel-africa/` — renamed for the `content.*` client pattern).

**Do not force-push `release/padel-africa` from the content-agent side.** Management core owns reconcile back to a clean fast-forward from `main`.

Source correction: PRs #222 and #227 merged onto `release/padel-africa` (not `main`) brought agent-side Mongo writers and shared-engine drift into production (`abc473d`).

**2026-09-25 triage (core message):** every release-only path that was missing from this list is classified below as **§A agent** (copied here) or **§D engine** (must land on `main` via reviewed PR **before** any delete/reset). Do **not** straight-reset until §D is on `main` or explicitly waived by core.

---

## A. Delete from management (agent-specific — now live here)

### Libs / routes

- `src/lib/listingQuality/` (entire directory)
- `src/lib/catalogFind/` (entire directory)
- `src/lib/catalogSelfHeal/` (entire directory)
- `src/lib/reports/sovereignLessons.ts` (+ `.test.ts` if present)
- `src/lib/reports/overrideInsights.ts` (+ `.test.ts` if present)
- `src/lib/servingModel/geographicGapBoost.ts` (+ `.test.ts` if present)
- `src/lib/pipeline/structuredSource.ts` (+ `.test.ts` if present) — *note: if core prefers this as shared engine, move to §D and keep on main; agent copy remains under SC as reference*
- `src/app/api/cron/listing-quality-loop/` (entire directory)

### Scripts (Mongo / seed CLIs — agent home)

- `scripts/listing-quality-cli.ts`
- `scripts/seed-osm-padel-africa-10.mts`
- `scripts/seed-osm-padel-africa-10.standalone.mjs`
- `scripts/seed-research-padel-africa.standalone.mjs`
- `scripts/catalog-about-curate.ts`
- `scripts/catalog-find-research.ts`
- `scripts/catalog-media-curate.ts`
- `scripts/catalog-quality-encode.ts`
- `scripts/catalog-quality-improve.ts`
- `scripts/catalog-quality-loop.ts`
- `scripts/catalog-quality-score.ts`
- `scripts/catalog-self-heal.ts`
- `scripts/catalog-hygiene.ts`
- `scripts/catalog-autopilot.ts`
- `scripts/catalog-contact-enrich.ts`
- `scripts/catalog-archive-snapshot.ts` (if padel-only addition)
- `scripts/override-insights.ts` — **added 2026-09-25** (CLI for `overrideInsights`; copy: `scripts/legacy-mongo/override-insights.ts`)
- `scripts/catalog-lessons.ts` — **added 2026-09-25** (CLI for `sovereignLessons`; copy: `scripts/legacy-mongo/catalog-lessons.ts`)
- `scripts/catalog-repair-structured-geo.ts` — **added 2026-09-25** (hardcoded openclaw/padel card patches; copy: `scripts/legacy-mongo/catalog-repair-structured-geo.ts`)
- `scripts/data/*` research/OSM/FIND attempt fixtures used by the above (copies live under `content.padelafrica/scripts/data/`)

### Docs / delivery (agent how-to + research notes)

- `docs/listing-quality-loop.md`
- `docs/osm-padel-africa-seed.md`
- `docs/padel-africa-*.md` — agent playbooks (FIND, self-heal, jobs, audits); copies under `content.padelafrica/docs/`
- `docs/*-padel-research-seed.md` — **fixed 2026-09-25** (was wrongly described as covered by `padel-africa-*`). Per-country research notes (53 files, e.g. `docs/algeria-padel-research-seed.md`, `docs/kenya-padel-research-seed.md`). Copies: `content.padelafrica/docs/research-seeds/`
- `archive/padel-africa/` dated Mongo content dumps — **confirmed disposable** (see §E); do **not** copy into sovereign.content

### Config

- `vercel.json` cron entry for `/api/cron/listing-quality-loop`
- `package.json` `catalog:*` / `catalog:seed-*` scripts that only exist to drive the migrated CLIs (engine may keep true product CLIs on `main` via reviewed PR)

---

## B. Revert shared engine files to match `main`

These edits do **not** belong on a client release branch. If any change is genuinely needed, land it as a **reviewed PR to management `main`** only:

- `src/lib/pipeline/extraction.ts`
- `src/lib/publishGate/gate.ts`
- `src/lib/pipeline/cycle.ts`
- `src/lib/vertical/pack.ts`
- `src/lib/flags/registry.ts`
- `src/lib/servingModel/popularityRefresh.ts`
- `src/lib/reports/loopDigest.ts`
- **`verticals/sportolok/index.ts`** — especially; padel-africa PRs must not touch sportolok

---

## C. How padel agent talks to the app after reconcile

- **Only** `POST /api/ingest` (scoped machine token) from `content.padelafrica/ingest/`
- **Never** direct Mongo from agent code
- **Never** new management routes / libs / crons for agent features
- Schedule / listing patches per `ingest/content-data-contract.md`

See [`STATUS-FOR-CORE.md`](./STATUS-FOR-CORE.md) and [`src/QUARANTINE.md`](./src/QUARANTINE.md).

---

## D. Engine functionality stranded on `release/padel-africa` — **PR to `main` before delete**

These are **not** agent scaffolding. They are generically scoped product/engine pieces (admin UI, media hosting, hygiene, cron twins, AI Gateway health) that landed only on the release branch via #222/#227. **A straight reset would destroy them with no home.**

| Path | Why engine | Suggested home |
| --- | --- | --- |
| `src/components/ReviewQueueFilters.tsx` | Review queue UI filters (sportolok A5); used by `(protected)/review/page.tsx` | reviewed PR → `main` |
| `src/lib/catalogHygiene/contactEnrich.ts` (+ test) | Evidence-only contact enrich for published listings; wired into `catalogBackfill` / self-heal | reviewed PR → `main` |
| `src/lib/catalogHygiene/contactReject.ts` (+ test) | Placeholder contact reject list (SC #17); used by enrich + `structuredSource` | reviewed PR → `main` |
| `src/lib/catalogHygiene/mediaCurate.ts` | Media fill policy for listings; uses imageHost/pageSnapshot | reviewed PR → `main` |
| `src/lib/geo/streetLevel.ts` (+ test) | Street-level / geocode-worthiness (ClassScout + SC #6); used by `geoBackfill` | reviewed PR → `main` |
| `src/lib/media/imageHost.ts` (+ test) | R2 primary / ImgBB backup upload facade; used by admin supply-image + CI media process | reviewed PR → `main` |
| `src/lib/media/pageSnapshot.ts` (+ test) | OG / listing snapshot discovery for media curate | reviewed PR → `main` |
| `src/lib/media/r2Upload.ts` | Cloudflare R2 SigV4 PutObject (no AWS SDK) | reviewed PR → `main` |
| `src/lib/aiGatewayHealth.ts` (+ test) | Pure AI Gateway health evaluation for extraction seam | reviewed PR → `main` |
| `src/lib/cron/cliTwins.ts` (+ test) | Cron ↔ CLI twin registry / checker | reviewed PR → `main` |
| `scripts/llm-benchmark.ts` | Times real `extractCandidate` via GatewayLlmClient | reviewed PR → `main` |
| `scripts/llm-health.ts` | AI Gateway health probe CLI | reviewed PR → `main` |
| `scripts/llm-release-gate.ts` | Release gate on gateway health | reviewed PR → `main` |
| `scripts/check-cron-cli-twins.ts` | `check:cron-cli-twins` for gauntlet | reviewed PR → `main` |
| `scripts/catalog-engagement-counters.ts` | CLI twin of `/api/cron/engagement-counters` | reviewed PR → `main` |
| `scripts/catalog-research-fields-reverify.ts` | CLI twin of `/api/cron/research-fields-reverify` | reviewed PR → `main` |
| `scripts/catalog-saved-listing-notifications.ts` | CLI twin of `/api/cron/saved-listing-notifications` | reviewed PR → `main` |

**Padel agent will not copy §D into sovereign.content** (would invent a second product codebase). Core: cherry-pick / open a reviewed PR from these paths onto `main`, then it is safe to drop them from the release branch during reconcile.

---

## E. `archive/padel-africa/` — confirmed disposable

Per `archive/padel-africa/README.md` on the release branch: GitHub **archive-backup** only; live catalogue SSOT is Mongo. Contents are dated JSON dumps from `catalog:archive-snapshot` (`listings.json`, curated abouts, quality lessons/recommendations, cards summary, manifest).

**Confirm for core:** safe to delete during reconcile. **Do not** treat as agent SSOT. **Do not** copy into `sovereign.content`.
