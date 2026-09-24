# Catalog find + improve loop (this environment)

**Status:** LIVE as of 2026-09-21 in the ClassScout cloud-agent environment.
**Scope (owner):** this environment only · find new listings · improve existing listings.
**Storage:** TARGET home is `sovereign.content/classscout/` ([`sovereign-content-storage.md`](sovereign-content-storage.md),
rule 454). Runners remain in `scripts/catalog-loop/` until that cutover.
**Not this doc:** ClassScout Lite daemon design, OpenClaw/`researchandenrich` internals, board
planning — those remain in their own SSOTs. This loop is an **ops runner** that writes through the
same production ingest gate.

---

## 1. What it does

Two jobs, one environment:

| Job | What runs | Write path |
| --- | --- | --- |
| **Improve** | Continuous cycles: oldest-updated blanks → **deep multi-page official enrich** (trial+sessions+contacts+price+age in one pass) → `POST /api/ingest` patches → bump `updatedAt` | Production `https://getyourfield.com/api/ingest` |
| **Find** | Seed queue → official page → **deep enrich related pages** → ImgBB via `POST /api/ingest/upload` → provider `upsert` with max evidenced fields → public smoke → reclassify watch | Same ingest + upload |
| **Quality** | JSONL event log → hourly scorecard → Tier A auto-pause → operator feedback intake → weekly digest | Local durable data dir (no second daemon) |

Both jobs are **evidence-only**. Unpublished phones/emails/trials stay blank. No invented contacts.

**Failure catalog / healers / day-by-day practices:** see
[`catalog-loop-error-playbook.md`](catalog-loop-error-playbook.md) (BINDING).

---

## 2. How the automation runs now

### 2.1 Process shape

```
tmux session: catalog-find-improve
  └─ bash scripts/catalog-loop/forever.sh
       ├─ node scripts/catalog-loop/feedback-intake.cjs
       ├─ node scripts/catalog-loop/recommend-improve.cjs
       ├─ node scripts/catalog-loop/sovereign-self-heal.cjs   # defer Find when About debt hot
       ├─ node scripts/catalog-loop/improve-cycle.cjs      # deep enrich oldest blanks + apply
       ├─ node scripts/catalog-loop/find-cycle.cjs         # find (or self-heal defer)
       ├─ node scripts/catalog-loop/reclassify-watch.cjs
       ├─ node scripts/catalog-loop/encode-lessons.cjs     # Tier A auto-pause
       ├─ node scripts/catalog-loop/scarcity-research-brief.cjs  # once per UTC hour
       ├─ node scripts/catalog-loop/quality-rollup.cjs     # once per UTC hour
       ├─ node scripts/catalog-loop/weekly-digest.cjs      # Mondays
       └─ sleep 120s → repeat
```

npm aliases: `catalog-loop:forever` · `catalog-loop:find` · `catalog-loop:improve` · `catalog-loop:watch`
· `catalog-loop:rollup` · `catalog-loop:digest` · `catalog-loop:scarcity-brief`.

**Durable data dir** (default `scripts/catalog-loop/data/`, override with `CATALOG_LOOP_DATA_DIR`):

- `state.json` — cycle index, lane offsets, find cursor, foundIds, watchIds, findAttempts
- `events.jsonl` — observe log (`find_*`, `improve_*`, `reclassify_repair`, `operator_feedback`, …)
- `quality-hourly.json` — latest scorecard including lasting-public rate
- `scarcity-research-brief.json` — hourly thin-neighborhood + scarce-sport search targets
- `feedback/` — drop operator JSON notes; processed into `lessons.json` / seed pauses
- `digests/` — weekly digests

| Script | Role |
| --- | --- |
| `scripts/catalog-loop/forever.sh` | Outer forever loop + quality hooks |
| `scripts/catalog-loop/scarcity-research-brief.cjs` | Hourly thin neighborhoods + scarce sports brief |
| `scripts/catalog-loop/improve-cycle.cjs` | Deep enrich oldest blanks (all lanes) + apply + touch |
| `scripts/catalog-loop/deep-enrich-scan.mjs` | Bounded multi-page official-site enrich |
| `scripts/catalog-loop/lib/deepEnrichOfficialSite.cjs` | Shared deep-enrich helper (Find + Improve) |
| `scripts/catalog-loop/improve-scan.mjs` | Fetch official pages; extract trial/sessions/contacts/price/age |
| `scripts/catalog-loop/apply-improve.cjs` | Normalize + reject false positives + ingest patch (all lanes) |
| `scripts/catalog-loop/trial-scan.mjs` / `apply-trial-fix.cjs` | Thin wrappers for the trial lane |
| `scripts/catalog-loop/find-seeds.json` | Curated official-URL seed queue |
| `scripts/catalog-loop/find-cycle.cjs` | Process next seeds: fetch → extract → ImgBB → upsert → smoke |
| `scripts/catalog-loop/reclassify-watch.cjs` | Patch category back if Lite flipped a Class find to Birthday Parties |
| `scripts/catalog-loop/lib/extractOfficialPage.cjs` | Shared extractors + false-positive filters |
| `scripts/catalog-loop/lib/events.cjs` | JSONL event writer + skip reason codes |
| `scripts/catalog-loop/lib/paths.cjs` | Durable path SSOT |
| `scripts/catalog-loop/quality-rollup.cjs` | Hourly quality scorecard |
| `scripts/catalog-loop/encode-lessons.cjs` | Tier A auto-pause on repeated host+skip signatures |
| `scripts/catalog-loop/feedback-intake.cjs` | Operator feedback → lessons / seed pause |
| `scripts/catalog-loop/weekly-digest.cjs` | Weekly digest from events + lessons |
| `scripts/catalog-loop/lessons.json` | Encoded lesson log |
| `scripts/catalog-loop/fixtures/` | Extractor regression HTML |

### 2.2 Credentials (required)

From gitignored `.env.local` (never commit):

- `INGEST_API_KEY` — Bearer for `/api/ingest` and `/api/ingest/upload`
- `getyourfield_MONGODB_URI` — catalog reads (`classscoutcluster.providers`)
- `IMGBB_API_KEY` — used by ingest upload for new listing images

Ingest base: `https://getyourfield.com` (override with `CATALOG_LOOP_BASE` if needed).

Optional env:

- `CATALOG_FIND_BATCH` — seeds attempted per cycle (default `4` → ~4–8 public finds/hour at 8–12 cycles when evidence is ready)
- `CATALOG_LOOP_SLEEP_SEC` — sleep between cycles (default `120`)
- `CATALOG_LOOP_DATA_DIR` — durable state/events dir (default `scripts/catalog-loop/data`)
- `CATALOG_IMPROVE_BATCH` — listings scanned per improve lane cycle (default `20`)
- `CATALOG_LOOP_TIER_A_THRESHOLD` — identical host+skip count in 24h before auto-pause (default `3`)

### 2.3 Safety / quality gates (already on the write path)

Every automatic write still hits production gates:

1. `curatedProviderSchema` (`.strict()`)
2. Phone E.164 normalize / reject (rule 410)
3. One official website `contactLink`; About narrative-only (rule 411)
4. ImgBB-only listing images on upsert
5. Loop-side false-positive filters before improve patches:
   - "Drop-In Play" menu chrome without trial language
   - Shopify/`SupportFreeTrial` JSON noise
   - bare "sibling discount" without usable `sourceText`
   - `siblingDiscount` strings coerced to `true` + detail kept in `sourceText`
6. Find-side skips (no invent):
   - Cloudflare / HTTP failure → defer (retry budget 5)
   - no usable street address after homepage **and** deep contact/location pages → skip
   - junk seed.address strings (tinyout scrape fragments) are ignored; page evidence wins
   - no downloadable official image → generated 1200×800 art fallback (not a hard skip)
   - duplicate id / website+name already in Mongo → mark done
   - birthday wording stripped from Find descriptions to reduce reclassify risk

**Find address recovery (2026-09-22):** deep enrich runs **before** the street gate; contact /
locations / find-us paths are first in the deep page list (inside the default page window); JSON-LD
`streetAddress` is extracted; `pickStreetAddress` prefers homepage candidates over later footer HQ
lines. Find also boosts never-tried `prov-drive-sheets-*` publicTarget seeds so new Drive leads are
not starved behind exhausted tinyout junk.

### 2.4 Public visibility constraints (ops must respect)

Runtime config on production currently **hides** from public reads:

- Regions: Queens, Bronx, Staten Island
- Browse categories: `birthday-parties`, `meet-up-groups`
- Many non-sport activity types (sports-forward denylist)

**Write vs. show (business-rules rule 441, [brief](briefs/produce-all-client-show-hide-classscout-dev.md)):**
Find writes every evidenced listing; the client's runtime config only decides what parents see.

- **`city` comes from the region's owner in the city registry** (`scripts/catalog-loop/lib/cityOwnership.cjs` →
  `scripts/catalog-loop/lib/cityRegions.ts` → `allCities()`), never a hardcoded `"nyc"` — an LA or Boston region is filed
  under `la`/`bos`. A region no registered city owns skips with `region_unknown` (data quality: no
  filing city), which is the only geography stop.
- **The runtime config is a label, not a gate.** `find-cycle.cjs` fetches `/api/public/runtime-config`
  once per cycle; a seed in a disabled region, activity or category still upserts and is recorded as
  inventory (`hiddenByClient` on `find_publish`). It appears publicly the moment the client enables
  its cell — no re-Find. There is no hardcoded "public" borough or category list any more.
- **KPIs are split:** `upserted` (written) vs. `publicPublished` (public smoke 200). A client-hidden
  write is a real delivery, never narrated as a failed Find.

**Image when the official page has none:** Find no longer skips with `no_image` as a hard stop. It
renders the same generated listing artwork parents already see on cards, at **1200×800** (4× the
300×200 card frame on each side), uploads it via `/api/ingest/upload`, and continues. Event:
`find_image_fallback`.

### 2.5 Known failure: category reclassify

Lite **reclassify is ON** in production. New finds whose copy mentions birthday parties can be
reclassified to `Birthday Parties` within minutes — and then disappear from public because that
browse category is disabled.

**Mitigation (automated):**

- Find cycle strips birthday wording from short/long descriptions
- Prefer `category: "Classes"` (or Camps / Drop-In) on seeds when accurate
- `reclassify-watch.cjs` runs every cycle: if a watched id is Birthday Parties or public `404`, patch
  category (+ activity types) back and re-smoke

Recorded incident 2026-09-20: `prov-the-little-gym-upper-west-side` and `prov-kidville-uws-classes`
were reclassified to Birthday Parties ~7 minutes after publish; repaired by patch/re-upsert. Watch
now covers that class of defect continuously.

---

## 3. How we keep the loop running (assurance)

| Check | Command / signal | Healthy |
| --- | --- | --- |
| Session alive | `tmux … has-session -t "=catalog-find-improve"` | session exists |
| Worker alive | `ps` shows `scripts/catalog-loop/forever.sh` | yes |
| Cycle advancing | `/tmp/catalog-loop-state.json` → `cycle` increases; pane shows `cycle N` | yes |
| Find advancing | pane shows `find attempt` / `find cycle`; `findCursor` moves; `foundIds` grows | yes |
| Ingest auth | empty-ops POST returns schema error, not `401`/`503` | yes |
| Improve yield log | cycle JSON `withPolicy` + apply log `to apply` / ingest `ok` | non-crash; `0` apply is OK when pages lack trials |
| Find smoke | `GET /api/public/providers/{newId}?city={nyc\|la\|bos}` → `200` for publicTarget seeds (city from `cityForBorough`) | yes |
| Reclassify watch | `/tmp/catalog-reclassify-watch-last.json` → repaired count | 0 repaired is OK |

**Restart (this environment):**

```bash
SESSION=catalog-find-improve
tmux -f /exec-daemon/tmux.portal.conf kill-session -t "$SESSION" 2>/dev/null || true
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION" -c /workspace -- "${SHELL:-bash}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION:0.0" \
  'npm run catalog-loop:forever' C-m
```

**Limits of assurance today:** runtime state under `/tmp` and the tmux session live only as long as
this cloud-agent VM. Scripts are now tracked under `scripts/catalog-loop/`. Replenish
`find-seeds.json` when the pending queue runs dry (all seeds `done` or retry-exhausted).

---

## 4. Fixes and updates shipped in this ops pass (2026-09-20 → 2026-09-21)

### Improve

- Re-audited public catalog: phones already E.164; no multi-website / About contact-leak defect class remaining
- Hard contact gaps: mostly form-only / unpublished — left blank on purpose
- Trial/session evidence applied via ingest; continuous improve cycles with false-positive filters

### Find (automated)

Wired Find into the forever loop. First automated cycle (2026-09-21) published:

| Id | Cell | Public? |
| --- | --- | --- |
| `prov-my-gym-west-79th` | Manhattan · Classes · Gymnastics | Yes (`200`) |
| `prov-play-on-nyc-ues` | Manhattan · Classes · Indoor Play / Soccer | Yes (`200`) |

Earlier hand finds still public:

| Id | Cell | Public? |
| --- | --- | --- |
| `prov-the-little-gym-upper-west-side` | Manhattan · Classes | Yes |
| `prov-kidville-uws-classes` | Manhattan · Classes | Yes |
| `prov-mark-morris-dance-center-school` | Brooklyn · Classes | Yes |
| `prov-ballet-academy-east-classes` | Manhattan · Classes | Yes |
| `prov-steps-on-broadway-academy` | Manhattan · Classes | Yes |
| `prov-dancewave-center-youth` | Brooklyn · Classes | Yes |

Inventory-only (region/category off): SI / Queens / birthday seeds remain in Mongo as `404` publicly.

### Process / meta

- Closed plan-only PR #912 (architecture prose without a running loop)
- Promoted runner from `/tmp` into tracked `scripts/catalog-loop/`
- Scoped work to this environment + find + improve only

---

## 5. KPIs — expected hourly results

These are **operating targets for this environment’s loop**, grounded in the first live hours
(2026-09-20 evening → 2026-09-21). They are not Lite daemon publish-rate KPIs and not OpenClaw feed KPIs.

### 5.1 Cadence (machine)

| Metric | Expected | Notes |
| --- | --- | --- |
| Improve + find cycles / hour | **8–12** | ~2 min sleep + scan + find batch |
| Ingest auth failures / hour | **0** | Any `401`/`503` is a stop-the-line |
| Loop crashes / hour | **0** | Restart session if forever script exits |

### 5.2 Improve (quality fills)

| Metric | Target / hour | Floor (still healthy) | Stretch |
| --- | --- | --- | --- |
| Listings with **new evidenced** `trialPolicy` / `sessions` patch applied | **3–8** | **1** (when remaining blanks truly lack published trial text, cycles correctly apply 0) | 15+ early in a fresh blank backlog |
| False-positive trial patches applied | **0** | 0 | 0 |
| Hard contact invents | **0** | 0 | 0 |

### 5.3 Find (new listings) — now automated

| Metric | Target / hour | Floor | Notes |
| --- | --- | --- | --- |
| New **public-visible** upserts (M/BK · Classes/Camps/Drop-In · enabled activity) | **4–8** | **1** | `CATALOG_FIND_BATCH=4` × successful publishes; skips do not count |
| New upserts that stay public `200` after watch | **100% of the public-visible target** | 100% | `reclassify-watch` every cycle |
| ImgBB / schema reject rate on find upserts | **&lt; 20%** of attempts | — | Fix seed or page; do not loosen gates |
| Seed queue depth (pending publicTarget) | **&gt; 5** | 1 | Replenish `find-seeds.json` when dry |

Disabled-region finds **do not count** toward the public Find KPI; they may be logged as inventory only.

### 5.4 Composite hourly scorecard (report each hour)

```
hour_utc:
  cycles: <n>                 # expect 8–12
  improve_applied: <n>        # expect 3–8; floor 1 when backlog is dry
  find_public_new: <n>        # expect 4–8 while seeds remain
  find_lasting_public: <n>/<n>
  false_publishes: 0
  top_skip_reasons: [code:count…]
  lessons_encoded: <n>
  ingest_auth_failures: 0
  loop_up: true
  seeds_pending: <n>
```

Generate with `node scripts/catalog-loop/quality-rollup.cjs` (also once per UTC hour from `forever.sh`).
Skip reason codes (closed): `http_blocked` · `http_not_found` · `no_street_address` · `no_image` ·
`duplicate_existing` · `activity_not_public` · `region_not_public` · `paused_seed` · `fetch_error` ·
`ingest_reject` · `smoke_not_public`.

**Daily roll-up (informal):** with Find automated ~8–12 cycles/hour and a healthy seed queue, expect on
the order of **16–32** new public listings/day plus **24–64** evidenced improve patches/day on a
productive backlog — lower when seeds skip (blocked pages / no address / no image) or improve blanks are dry.

---

## 6. What is still manual / next

1. **Replenish `find-seeds.json`** when pending publicTarget seeds run low Latest research pass: [`reports/catalog-find-seeds-research-2026-09-21.md`](reports/catalog-find-seeds-research-2026-09-21.md). (add official **location**
   URLs + stated place facts only — not national homepages).
2. **Coordinate with runtime toggles** if SI/Queens/Birthday should count as public Find targets.
3. **Softening reclassify** for freshly ingest-verified Class listings (product change — watch
   mitigates ops-side; board #44 when pursued).
4. **Operator feedback** — drop JSON into `scripts/catalog-loop/data/feedback/` with
   `{ "providerId"|"seedId", "tag", "note" }` using tags
   `wrong_address` · `wrong_phone` · `not_public_worthy` · `reclassified` · `good_example` ·
   `seed_url_bad` · `duplicate`.
5. **Fair-use multi-source feeder** — `npm run catalog-loop:fair-use:forever` walks RQK + peer
   classified sites (one page per source per pass). See
   [`scripts/catalog-loop/rqk-fair-use/README.md`](../scripts/catalog-loop/rqk-fair-use/README.md)
   (rule 422).
6. **Scarcity research brief + oldest-updated enrich** — rule 423. Hourly
   `scarcity-research-brief.json` steers Find seeds and fair-use discovery toward thin public
   neighborhoods and scarce sport activities; Improve always works the oldest-updated blank card
   and bumps `updatedAt` after each investigation so the next cycle rotates.

---

## 7. Related SSOTs

- Ingest contract / OpenClaw feed: [`classscout-handover.md`](classscout-handover.md)
- OpenClaw field priority (for external jobs): [`openclaw-job-alignment-prompt.md`](openclaw-job-alignment-prompt.md)
- Per-listing maintenance brief: [`content-maintenance-agent-prompt.md`](content-maintenance-agent-prompt.md)
- Lite maintainer lanes (incl. reclassify ON): [`local-ai-maintainer-loop.md`](local-ai-maintainer-loop.md)
- Phone / website write gates: `docs/business-rules.md` rules 410–411
- Business rule pointer for this loop: `docs/business-rules.md` rule 415
- Continuous quality improvement (implemented): [`catalog-loop-quality-improvement-plan.md`](catalog-loop-quality-improvement-plan.md) (rules 420–421)
- Fair-use multi-source discovery: `docs/business-rules.md` rule 422
- Scarcity brief + oldest-updated enrich: `docs/business-rules.md` rule 423
- Job hardening (image fallback / trial chrome / scarce-sport map): `docs/business-rules.md` rule 424
- Catalog KPIs on `/admin/stats`: `docs/business-rules.md` rule 419 (`GET /api/stats/catalog-loop`,
  `POST /api/ingest/catalog-loop-stats`, `npm run catalog-loop:push-stats`)
