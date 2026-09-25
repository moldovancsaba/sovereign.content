# Catalog loop error playbook — failures, fixes, best practices

**Status: BINDING ops reference** for the find + improve + fair-use loops in this environment.  
**Companion SSOTs:** [`catalog-find-improve-loop.md`](catalog-find-improve-loop.md) · [`catalog-loop-quality-improvement-plan.md`](catalog-loop-quality-improvement-plan.md) · [`scripts/catalog-loop/rqk-fair-use/README.md`](../scripts/catalog-loop/rqk-fair-use/README.md) · [`scripts/catalog-loop/lessons.json`](../scripts/catalog-loop/lessons.json).

Owner directive for this file (2026-09-21): document every recurring failure class, how it was solved, and
the day-by-day practices that keep the funnel healthy — so the same defect is not rediscovered weekly.

---

## 1. Funnel map (where work dies)

```
Fair-use page ──► quality gate ──► seed in find-seeds.json ──► Find extract ──► ingest upsert ──► public smoke
     │                 │                      │                      │                 │                │
     │                 │                      │                      │                 │                └─ activity/region config
     │                 │                      │                      │                 └─ longDescription URLs / chrome
     │                 │                      │                      └─ no street / blocked / no image*
     │                 │                      └─ duplicate / no_activity_mapped
     │                 └─ guide, event, chrome name, no official site
     └─ 404 hub, CF block, expand-only
```

\* Since 2026-09-21 Find **renders 1200×800 generated listing art** when the page has no photograph
(`find_image_fallback`) instead of hard-skipping `no_image`.

Hourly scorecard fields (after the same date): `fair_use_attempt` · `fair_use_reject` · `fair_use_seed` ·
`fair_use_funnel` · `top_fair_use_reject_reasons` in `scripts/catalog-loop/data/quality-hourly.json`.

---

## 2. Error catalog (closed reasons)

### 2.1 Fair-use (`fair_use_reject.reasonCode`)

| Code | Meaning | Do | Do not |
| --- | --- | --- | --- |
| `guide_or_hub_name` | Editorial guide / directory title | Skip; harvest provider/place URLs only | Seed as a ClassScout provider |
| `one_off_event` | Festival / `/event/` / one-time session | Skip (not a recurring program venue) | Tag Martial Arts and publish |
| `brand_or_chrome_name` | “Explore Brooklyn”, schedule chrome | Skip | Invent a studio name |
| `source_brand_name` | Title is the media site’s own brand | Skip | |
| `no_official_or_address` | No external official site and no street | Prefer ActivityHero/RQK pages that publish both | Force-seed from citation-only hubs |
| `junk_website` | `wa.me`, social, source host as “website” | Clear website; require official host | Upsert with WhatsApp links |
| `out_of_market` | LA / Chicago / non-NYC | Skip | NYC publicTarget |
| `no_activity_mapped` | Mapper returned `[]` | Reject seed; improve keyword map | Default to Martial Arts |
| `dead_hub_url` | Known-404 hub pattern | Drop from queue (`deadHubPatterns.cjs`) | Re-fetch forever |
| `http_not_found` / `http_blocked` | Fetch failed | Tier A pause after 3×/24h on host | Infinite retry without pause |
| `duplicate_seed` | Already in `find-seeds.json` | OK | |

### 2.2 Find (`find_skip` / `ingest_reject`)

| Code | Meaning | Fix encoded |
| --- | --- | --- |
| `ingest_reject` + “without URLs / scraped page chrome” | Descriptions contained `https://…` or citation lines | `publicCopyHygiene.cjs` strips before upsert; seed builder never puts URLs in longDescription |
| `no_activity_mapped` | Seed has empty `activityTypes` | Reject at seed build; Find skips |
| `activity_not_public` | All tags config-disabled | A label, not a skip (rule 441): Find still upserts it as inventory; it shows when the client enables the cell |
| `region_not_public` | Region disabled by the client (e.g. Queens/Bronx/SI) | A label, not a skip (rule 441): upserted as inventory |
| `region_unknown` | No registered city owns the seed's region | Data-quality stop: fix the seed's region (the only geography skip) |
| `smoke_not_public` | Upsert ok, public GET ≠ 200 | Do not count as public win; watch + gate |
| `no_street_address` | Page lacked usable street | Prefer location URLs; Tier A pause |
| `http_*` / `fetch_error` | Official site blocked/missing | Tier A pause |
| `ingest:duplicate_source_url` (false) | Within-doc repeated homepage in `sourceUrls` | Dedupe before upsert; do **not** mark seed done (2026-09-22) |
| Show-title / year-The street | `"149 The Lion King on Broadway"`, `"2026 The New 42nd Street"` | Reject in `hasStreetAddress`; page candidates before seed.address |
| Bare `Skating` → smoke 404 | Non-canonical tag hidden by public vocabulary | Map to Ice/Roller/Figure Skating; `normalizeActivityTypes` on Find |

### 2.3 Healing that is *not* a full repair

| Job | What it actually heals | What it does **not** heal |
| --- | --- | --- |
| `reclassify-watch` | Birthday Parties flips → Classes/Camps | Seed copy, activity defaults, fair-use queues |
| `encode-lessons` Tier A | Repeated Find host skips; ingest chrome; fair-use hub lessons | Product toggles (Tier C), one-off bad seeds without threshold |
| `recommend-improve` | Live public cards with blank/unusable enrichable fields | Cards without a website (cannot fetch) |
| `improve-cycle` | Open recommendations first, then oldest blanks → **deep multi-page enrich** → bump `updatedAt` → close resolved recs | Brand-new Find seeds |
| `deep-enrich-scan` | Official pricing/classes/contact/schedule pages for one batch | Inventing contacts/prices |
| `scarcity-research-brief` | Hourly thin public neighborhoods + scarce sport tags → Find/fair-use search order | Inventing listings to fill gaps |
| Generated image fallback | Missing page photograph | Bad longDescription, wrong entity type |

---

## 3. Incidents → encoded practice (2026-09-21)

| Incident | Root cause | Solution | Practice going forward |
| --- | --- | --- | --- |
| PLAYDAY / Rosie / Diller smoke 404 after “successful” upsert | Art/Music disabled in runtime config | Pre-publish activity gate; inventoryOnly for disabled-only tags | Never count ingest ok alone as a public win |
| Sprout “Martial Arts” on skating / sundaes | `mapActivityTypes` defaulted to Martial Arts | Empty → `no_activity_mapped`; reject seed | No invented default activity |
| Mass `ingest_reject` on fair-use seeds | URLs in `longDescription` | Strip URLs; keep links in `researchSources` only | Public copy = parent-facing prose only |
| Timeout / PSP walks with 0 seeds | Dead hub URLs (404 museums/, plumbers.html) | `deadHubPatterns.cjs` + structured `reasonCode` | Never enqueue known-dead hubs |
| Fair-use failures invisible to rollup | Events only from Find | `fair_use_attempt|reject|seed` → `events.jsonl` | One observe log for the whole funnel |
| Healing “ran” but funnel stayed dry | Healers targeted wrong classes | Extend Tier A; document healer scope | Match healer to failure class before claiming “fixed” |
| Find stuck on `no_image` | Hard skip | 1200×800 generated listing art upload | Prefer page photo; fallback is allowed |
| Find burned try budget on broken page image | Download fail (relative URL / too small) skipped without fallback | Fallback after page-image fail; revive exhausted `no_image` attempts once; resolve relative `og:image` | Never hard-skip when enrichment art can satisfy ingest |
| Improve applied HTML trial chrome | Raw HTML attribute snippets (`FREE TRIAL CLASS">`, `trial class?`) | Trial match on stripped text; reject attribute junk / bare FAQ scraps | Public trialPolicy must read as parent-facing offer copy |
| Fair-use `no_activity_mapped` on scarce sports | Mapper missed volleyball / capoeira / aikido / … | Expand `mapActivityTypes` for scarcity-brief sports | Still never invent a default activity |
| Find retry loop on venues already in catalog | Ingest `duplicate source URL` after image work | Pre-check `website`/`sourceUrls`; mark seed done on that reject | Do not count as a Find invent failure |
| Forever “clock freeze” (~6h quiet, 2026-09-24→25) | Mongo `write ETIMEDOUT` during Improve deep-enrich; `forever.sh` waited unboundedly on the child so `events.jsonl` stopped advancing | Step `timeout` wrappers in `forever.sh` / fair-use forever; Mongo socket ceilings via `lib/mongoOpts.cjs`; kill hung child or restart forever | Treat stale `events.jsonl` mtime as a hang signal — not a frozen wall clock. See §3.1 |

---

## 3.1 Forever hang / “clock freeze” (2026-09-25)

**Symptom:** `ps` still shows `forever.sh` / `improve-cycle`, but `data/events.jsonl` and
`data/logs/forever.out` stop advancing for hours. Ops look like “nothing ran.”

**Cause:** Not a system clock freeze. The outer loop is **synchronous** — each step blocks the
next. A hung Mongo write (`Error: write ETIMEDOUT` in `forever.out`, often mid `deep-enrich` /
`improve-cycle`) holds the whole cycle. Fair-use can go quiet in the same network incident.

**Detect**

```bash
stat -c '%y' scripts/catalog-loop/data/events.jsonl
rg 'ETIMEDOUT' scripts/catalog-loop/data/logs/forever.out | tail
pgrep -af 'improve-cycle|deep-enrich|one-pass|forever.sh'
```

If `events.jsonl` mtime is older than ~30–40 minutes while forever PIDs are up → assume hang.

**Unstick**

```bash
pkill -f 'scripts/catalog-loop/improve-cycle.cjs' || true
pkill -f 'scripts/catalog-loop/deep-enrich-scan.mjs' || true
pkill -f 'scripts/catalog-loop/rqk-fair-use/one-pass.cjs' || true
# If the parent is still wedged:
pkill -f 'scripts/catalog-loop/forever.sh' || true
pkill -f 'scripts/catalog-loop/rqk-fair-use/forever.sh' || true
nohup bash scripts/catalog-loop/forever.sh >> scripts/catalog-loop/data/logs/forever.out 2>&1 &
nohup bash scripts/catalog-loop/rqk-fair-use/forever.sh >> scripts/catalog-loop/data/logs/fair-use-forever.out 2>&1 &
```

**Durable guards (shipped 2026-09-25)**

| Guard | Where | Default |
| --- | --- | --- |
| Per-step `timeout` | `scripts/catalog-loop/forever.sh` (`run_step`) | Improve **1500s**; Find/reclassify **900s**; other steps **600s** |
| Fair-use pass `timeout` | `scripts/catalog-loop/rqk-fair-use/forever.sh` | **1800s** (`FAIR_USE_PASS_TIMEOUT_SEC`) |
| Mongo socket ceilings | `scripts/catalog-loop/lib/mongoOpts.cjs` on Improve hot path | connect/serverSelection **15s**; socket **60s** |

Override: `CATALOG_STEP_TIMEOUT_IMPROVE`, `CATALOG_STEP_TIMEOUT_FIND`,
`CATALOG_STEP_TIMEOUT_RECLASSIFY`, `CATALOG_STEP_TIMEOUT_DEFAULT`,
`CATALOG_MONGO_SOCKET_MS` (and siblings). Details:
[`scripts/catalog-loop/README.md`](../scripts/catalog-loop/README.md) · rule **455**.

## 4. Day-by-day operating checklist

**Every cycle (automated):** feedback → improve → find → reclassify → Tier A encode → (hourly) rollup.

**Operator (human / agent) daily:**

1. Read `scripts/catalog-loop/data/quality-hourly.json`: `fair_use_funnel`, `top_fair_use_reject_reasons`, `top_skip_reasons`, `ingest_rejects`, `lasting_public_rate`.
2. If `fair_use_seed` is 0 while `fair_use_attempt` is high — inspect top reject codes; fix harvest/dead hubs, not Find.
3. If `ingest_rejects` climb — confirm `publicCopyHygiene` still strips; pause hosts via Tier A.
4. Replenish `find-seeds.json` only with **provider** leads (official site + street + mapped activity + M/BK for publicTarget).
5. Drop a note in `scripts/catalog-loop/data/feedback/` when a false publish or bad seed is seen by hand (`operator_feedback`).
6. After three identical signatures, expect Tier A lesson in `lessons.json`; if missing, the reason code is outside Tier A — extend encode or fix at source.

**Weekly:** `weekly-digest.cjs` (Mondays); compare lasting-public rate vs quality plan targets; prune paused seeds that will never recover.

---

## 5. Best practices (non-negotiable)

1. **Evidence only** — no invented phones, emails, prices, or activities.
2. **Citation ≠ content** — directory sites are discovery; official site is Find target.
3. **Public copy has no URLs** — research links live in `researchSources` / `website`.
4. **One page per source per fair-use pass** — polite UA; never training-bot strings.
5. **Public win = smoke 200 + enabled activity/region/category** — not Mongo write alone.
6. **Events are the SSOT for ops metrics** — if it is not in `events.jsonl`, the rollup cannot see it.
7. **Tier A auto; Tier C (enable Art/Music, regions) is owner/board only.**
8. **Prefer places/providers over events/guides** in harvest patterns.
9. **Generated art (1200×800) is an ingest placeholder** — parents still see generated card art when own photos are off; do not treat ImgBB/R2 URL as proof of a venue photo.
10. **When unsure, inventoryOnly** — reversible; a bad public publish is not.

---

## 6. Code map (where to change what)

| Concern | File |
| --- | --- |
| Public copy URL strip | `scripts/catalog-loop/lib/publicCopyHygiene.cjs` |
| Activity map (no default; scarce sports included) | `scripts/catalog-loop/rqk-fair-use/lib/rqkExtract.cjs` → `mapActivityTypes` |
| Lead quality / events / out-of-market | `…/leadQuality.cjs` |
| Seed build + inventory gate | `…/seedBuilder.cjs` |
| Fair-use events | `…/fairUseEvents.cjs` + `processOneSource.cjs` |
| Dead hubs | `…/deadHubPatterns.cjs` |
| Find upsert + image fallback | `scripts/catalog-loop/find-cycle.cjs` (page image fail → generated art; revive exhausted `no_image`) |
| Official extract / trial filter / relative images | `scripts/catalog-loop/lib/extractOfficialPage.cjs` |
| Tier A | `scripts/catalog-loop/encode-lessons.cjs` |
| Recommendations | `scripts/catalog-loop/recommend-improve.cjs` + `scripts/catalog-loop/data/recommendations.json` |
| Hourly funnel | `scripts/catalog-loop/quality-rollup.cjs` |
| Machine lessons | `scripts/catalog-loop/lessons.json` |
| Forever step timeouts / hang unstick | `scripts/catalog-loop/forever.sh` (`run_step`) · `rqk-fair-use/forever.sh` |
| Mongo socket ceilings (Improve hot path) | `scripts/catalog-loop/lib/mongoOpts.cjs` |

---

## 7. Adding a new failure class

1. Add a **stable reason code** to the closed list (`events.cjs` and/or `fairUseEvents.cjs`).
2. Emit it from the failing stage (never log-only in source `done` without an event).
3. Add a **lesson** row (encoded or open) in `lessons.json`.
4. Document it in **§2** of this playbook with Do / Do not.
5. If N≥3/24h should auto-pause or lesson — extend `encode-lessons.cjs`.
6. Cover with a unit test in `rqk-fair-use/test/` or `src/lib/catalogLoop/`.

---

## 8. Related

- Rule **455** — forever hang / step timeouts (`business-rules.md`)
- [`catalog-find-improve-loop.md`](catalog-find-improve-loop.md) §3 health checks
- [`scripts/catalog-loop/README.md`](../scripts/catalog-loop/README.md) — quick unstick
