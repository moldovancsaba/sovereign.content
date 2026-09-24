# Files to remove / revert in `moldovancsaba/management` when reconciling `release/padel-africa`

**Copied into** `sovereign.content/content.padelafrica/` on 2026-09-24.  
**Canonical folder name:** `content.padelafrica/` (not `padel-africa/` — renamed for the `content.*` client pattern).

**Do not force-push `release/padel-africa` from the content-agent side.** Management core owns reconcile back to a clean fast-forward from `main`.

Source correction: PRs #222 and #227 merged onto `release/padel-africa` (not `main`) brought agent-side Mongo writers and shared-engine drift into production (`abc473d`).

---

## A. Delete from management (agent-specific — now live here)

### Libs / routes

- `src/lib/listingQuality/` (entire directory)
- `src/lib/catalogFind/` (entire directory)
- `src/lib/catalogSelfHeal/` (entire directory)
- `src/lib/reports/sovereignLessons.ts` (+ `.test.ts` if present)
- `src/lib/reports/overrideInsights.ts` (+ `.test.ts` if present)
- `src/lib/servingModel/geographicGapBoost.ts` (+ `.test.ts` if present)
- `src/lib/pipeline/structuredSource.ts` (+ `.test.ts` if present)
- `src/app/api/cron/listing-quality-loop/` (entire directory)

### Scripts

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
- `scripts/data/*` research/OSM/FIND attempt fixtures used by the above (copies live under `content.padelafrica/scripts/data/`)

### Docs / delivery (agent how-to)

- `docs/listing-quality-loop.md`
- `docs/osm-padel-africa-seed.md`
- `docs/padel-africa-*.md` agent playbooks (FIND, self-heal, jobs examples, audits) — keep only engine-facing docs on management if any remain after review
- `archive/padel-africa/` dated Mongo content dumps (must not be treated as agent SSOT; do not copy into sovereign.content)

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
