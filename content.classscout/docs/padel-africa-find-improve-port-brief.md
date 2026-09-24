# Padel Africa — Find→Improve port brief (ClassScout source)

**Audience:** the `moldovancsaba/management` agent on `release/padel-africa`.  
**Job:** port ClassScout’s **Find → Improve** catalog-loop pipeline with fidelity.  
**Not this job:** replace Padel Africa’s existing daemon-loop / curator / SearXNG / publish-gate /
hygiene paths for day-to-day catalog work. Those stay. Catalog-loop is an **additional** ops runner
ported only when the owner asks for Find→Improve parity.

**Evidence-only — invent nothing.** Copy the loop; retarget env/base/seed geography. Do not rewrite
gates from memory.

---

## 1. Scope decision (owner 2026-09-22)

| Work | Port `scripts/catalog-loop/`? |
| --- | --- |
| **This job (Find→Improve)** | **Yes** — without it you invent the loop and break fidelity |
| **Normal Padel catalog ops** | **No** — instance already has other ops paths; catalog-loop was never what those jobs run on |

Fair-use feeder (`scripts/catalog-loop/rqk-fair-use/`) is **ClassScout NYC discovery**. Do **not**
port the RQK/tinyout/MommyPoppins source registry as-is. Empty `find-seeds.json` (or a Padel-specific
seed file) is enough for Find to run; seed replenishment is a separate, market-specific step.

---

## 2. Source of truth (copy from here)

| Item | Location |
| --- | --- |
| Repo | `https://github.com/moldovancsaba/classscout` |
| Prefer tip that includes address + sourceUrl Find fixes | PRs **#928** + **#929** (or `main` after merge). Stack: `#927` harvest → `#928` address gap → `#929` sourceUrls dedupe |
| Loop SSOT doc | [`docs/catalog-find-improve-loop.md`](catalog-find-improve-loop.md) |
| Failure catalog (BINDING) | [`docs/catalog-loop-error-playbook.md`](catalog-loop-error-playbook.md) |
| Quality plan (implemented) | [`docs/catalog-loop-quality-improvement-plan.md`](catalog-loop-quality-improvement-plan.md) |
| Business rules | [`docs/business-rules.md`](business-rules.md) §§ **415**, **419–427** |
| Recent Find incident reports | [`reports/find-close-address-gap-2026-09-22.md`](reports/find-close-address-gap-2026-09-22.md), [`reports/find-sourceurl-dedupe-2026-09-22.md`](reports/find-sourceurl-dedupe-2026-09-22.md) |

---

## 3. Required Find→Improve tree (copy these)

Copy the directory shape. Keep plain **CJS** beside the scripts (do not rewrite to TS on first port).

### 3.1 Runner + cycles (required)

```
scripts/catalog-loop/
  forever.sh                 # outer loop: feedback → improve → find → watch → encode → rollup
  find-cycle.cjs             # Find: seed → fetch → deep enrich → street gate → upload → upsert → smoke
  improve-cycle.cjs          # Improve: recommendations first, then oldest blanks → deep enrich → apply → touch
  recommend-improve.cjs      # Audit live cards → recommendations.json
  improve-scan.mjs
  deep-enrich-scan.mjs
  apply-improve.cjs
  apply-trial-fix.cjs
  trial-scan.mjs
  reclassify-watch.cjs
  encode-lessons.cjs
  feedback-intake.cjs
  quality-rollup.cjs
  weekly-digest.cjs
  scarcity-research-brief.cjs
  push-stats.cjs             # optional if Padel has /admin/stats snapshot API
  find-seeds.json            # START EMPTY or Padel-only seeds — do not copy NYC queue
  lessons.json               # START EMPTY [] / {}
  fixtures/                  # extractor regression HTML (copy)
```

### 3.2 Shared libs (required)

```
scripts/catalog-loop/lib/
  paths.cjs
  events.cjs
  extractOfficialPage.cjs
  deepEnrichOfficialSite.cjs
  publicActivityGate.cjs
  publicCopyHygiene.cjs
  scarcityResearchBrief.cjs
  listingQualityGaps.cjs
  recommendationStore.cjs
  listingEnrichmentImage.cjs
  renderListingEnrichmentImage.ts   # used by listingEnrichmentImage
  *.test.cjs                        # ship the tests with the libs
```

### 3.3 Env loader (required)

```
scripts/load-env.cjs         # find-cycle / improve require this
```

### 3.4 npm aliases (add to package.json)

Mirror ClassScout names (retarget only if the instance already owns conflicting names):

- `catalog-loop:forever` → `bash scripts/catalog-loop/forever.sh`
- `catalog-loop:find` → `node scripts/catalog-loop/find-cycle.cjs`
- `catalog-loop:improve` → `node scripts/catalog-loop/improve-cycle.cjs`
- `catalog-loop:recommend` → `node scripts/catalog-loop/recommend-improve.cjs`
- `catalog-loop:watch` → `node scripts/catalog-loop/reclassify-watch.cjs`
- `catalog-loop:rollup` / `catalog-loop:digest` / `catalog-loop:feedback` / `catalog-loop:encode`
- `catalog-loop:scarcity-brief`
- test aliases: `catalog-loop:deep-enrich:test`, `catalog-loop:address-extract:test`, `catalog-loop:scarcity-brief:test`

### 3.5 Explicitly out of this port

| Path | Why |
| --- | --- |
| `scripts/catalog-loop/rqk-fair-use/**` | NYC fair-use discovery feeder — not Find→Improve; not Padel day-to-day ops |
| `scripts/catalog-loop/data/**` | Runtime state (events, improve-cycle dumps) — recreate empty `data/` locally |
| ClassScout `find-seeds.json` contents | NYC Drive/tinyout/OSM queue — wrong market |
| `manual-publish-*.cjs` / `publish-eligible-batch.cjs` | Helpful ops one-shots; optional later |

---

## 4. Find pipeline (must preserve order)

Per seed in `find-cycle.cjs` — **do not reorder gates**:

1. Skip if `paused` / Tier A lesson
2. **Pre-publish public gate** (`publicActivityGate`) — region/category/activity config. Skip with
   `activity_not_public` / `region_not_public` instead of upsert→smoke 404
3. Duplicate id / website / name already in Mongo → mark done
4. Fetch official homepage (browser-shaped UA; treat CF challenge as block)
5. **Deep enrich BEFORE street gate** (rule 426) — contact / locations / find-us paths first
6. Street pick: reject junk seed.address; JSON-LD `streetAddress`; prefer homepage over footer HQ
7. Public-copy hygiene — strip URLs/chrome from short/long description before upsert
8. Image: official photo → upload; else generated 1200×800 fallback (`find_image_fallback`)
9. Upsert via `POST /api/ingest` with **`uniqueSourceUrls([website, ...deep.pages])`** (rule 427)
10. Within-doc `"duplicate source URL"` → **do not** mark seed `done` (only real catalog collisions)
11. Public smoke `GET /api/public/providers/{id}` — only status 200 counts as public Find win
12. Reclassify watch every forever cycle (Birthday Parties flip class of defect)

Improve (same forever tick, before Find): oldest-updated blanks → deep enrich → `apply-improve` →
`$set.updatedAt` even on no-op so the cursor rotates.

---

## 5. Credentials / env (retarget to Padel instance)

| Var | Role |
| --- | --- |
| `INGEST_API_KEY` | Bearer for `/api/ingest` and `/api/ingest/upload` |
| `getyourfield_MONGODB_URI` | Catalog reads for duplicate checks + Improve blanks |
| `CATALOG_LOOP_BASE` | Instance origin (ClassScout default `https://getyourfield.com`) |
| `CATALOG_LOOP_DATA_DIR` | Durable state (default `scripts/catalog-loop/data`) |
| `CATALOG_FIND_BATCH` | Seeds per cycle (default **4**) |
| `CATALOG_LOOP_SLEEP_SEC` | Sleep between forever ticks (default `120`) |
| `CATALOG_IMPROVE_BATCH` | Improve scan size (default `20`) |
| `CATALOG_FIND_DEEP_PAGES` | Deep pages per official site (default **8**) |
| Image upload | ClassScout: R2 preferred + ImgBB fallback via ingest upload — wire to **this** instance’s upload route |

Never commit secrets. Use the instance’s gitignored env file.

---

## 6. What you must adapt (market / product) — not invent

Keep the **loop mechanics** identical. Change only the **cell vocabulary** to match Padel Africa
runtime config and public geography:

| Knob in ClassScout | Adapt to |
| --- | --- |
| `PUBLIC_BOROUGHS` (`Manhattan`, `Brooklyn`) | Padel public regions / cities from **runtime config**, not hard-coded NYC |
| `PUBLIC_CATEGORIES` | Padel enabled browse categories |
| `publicActivityGate` + `/api/public/runtime-config` | Same endpoint shape on the instance, or mirror whatever the public detail gate already uses |
| Scarcity brief neighborhoods / sport list | Padel scarcity vocabulary (or disable brief until ported) |
| `find-seeds.json` schema | Keep fields (`id`, `name`, `website`, `borough`, `category`, `activityTypes`, `address`, `publicTarget`, `inventoryOnly`, …); fill with **evidence-backed Padel leads only** |
| Reclassify watch “Birthday Parties” | Only if the instance has the same Lite reclassify + disabled-category failure mode |

---

## 7. Ingest / schema dependencies (instance must already expose)

Find writes through production gates. Port fails if these are missing or weaker:

1. `POST /api/ingest` upsert + patch (Bearer `INGEST_API_KEY`)
2. `POST /api/ingest/upload` for listing images
3. `GET /api/public/providers/{id}` smoke
4. `GET /api/public/runtime-config` (or equivalent) for disabled activities/regions/categories
5. Provider validation: **within-document** unique `sourceUrls` (ClassScout `providerValidation.ts`) —
   Find’s `uniqueSourceUrls` assumes that rule exists; if Padel lacks it, still dedupe client-side

Do **not** invent a second write path that bypasses ingest.

---

## 8. Binding lessons the port must include (do not rediscover)

| Rule | Failure if omitted |
| --- | --- |
| **426** Address gap | Deep enrich after street gate → `no_street_address` while `/contact` has the street; contact paths starved by pricing URLs; JSON-LD unread; junk seed.address trusted |
| **427** sourceUrls | `[website, ...deep.pages]` repeats homepage → ingest `"duplicate source URL"` → false `done` → 0 publishes |
| **425** Image / trial / activity map | Hard `no_image` before fallback; trial HTML chrome; invented default activity |
| **421** Quality loop | No events / Tier A pause → same host burned forever |
| Playbook | Never count ingest-ok alone as a public win (`smoke_not_public`) |

Regression tests to run after copy:

```bash
node scripts/catalog-loop/lib/extractOfficialPage.address.test.cjs
node scripts/catalog-loop/lib/deepEnrichOfficialSite.test.cjs
node scripts/catalog-loop/lib/find-sourceurls-dedupe.test.cjs
node scripts/catalog-loop/lib/publicActivityGate.test.cjs
node scripts/catalog-loop/lib/scarcityResearchBrief.test.cjs
node scripts/catalog-loop/lib/listingQualityGaps.test.cjs
node scripts/catalog-loop/lib/recommendationStore.test.cjs
```

---

## 9. Suggested port steps (management agent)

1. Copy §3 tree into the Padel Africa app root (or agreed ops package path).
2. Retarget `CATALOG_LOOP_BASE`, Mongo collection names, and §6 public cell sets.
3. Create empty `data/`, empty `lessons.json`, empty/minimal `find-seeds.json`.
4. Wire npm scripts; confirm ingest auth with an empty-ops POST (schema error ≠ 401/503).
5. Run lib unit tests (§8).
6. One dry Find cycle with `CATALOG_FIND_BATCH=1` against a known official Padel club URL seed.
7. Only then start `catalog-loop:forever` in tmux (session name local to that environment).
8. Document instance-specific BASE/regions in the instance’s own ops doc — do not fork ClassScout
   business-rules numbering.

---

## 10. What “done” means for this port

- Forever runner executes Improve then Find then watch on the Padel instance.
- A seed with evidenced street + enabled activity reaches **public smoke 200**.
- Address recovery and `uniqueSourceUrls` behavior match ClassScout rules 426–427.
- No ClassScout NYC fair-use sources or seed queue shipped as Padel inventory.
- Existing Padel daemon/curator paths unchanged and still used for normal catalog work.

---

## 11. Pointers for the agent (raw URLs)

When fetching from GitHub (replace branch after #928/#929 merge to `main`):

- Docs: `https://github.com/moldovancsaba/classscout/blob/main/docs/catalog-find-improve-loop.md`
- Playbook: `https://github.com/moldovancsaba/classscout/blob/main/docs/catalog-loop-error-playbook.md`
- Find cycle: `https://github.com/moldovancsaba/classscout/blob/main/scripts/catalog-loop/find-cycle.cjs`
- Address report: `https://github.com/moldovancsaba/classscout/blob/main/docs/reports/find-close-address-gap-2026-09-22.md`
- sourceUrls report: `https://github.com/moldovancsaba/classscout/blob/main/docs/reports/find-sourceurl-dedupe-2026-09-22.md`
- Until merge: tip of `cursor/find-sourceurl-dedupe-b289` (includes #928+#929 Find fixes)

ClassScout cloud agent does **not** write into `moldovancsaba/management`. This brief is the handoff;
the management agent performs the copy/adapt on `release/padel-africa`.
