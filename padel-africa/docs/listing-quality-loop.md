# Listing quality loop — self-improvement for published cards

Engine-native closed loop that **scores → recommends → improves → encodes** visitor-facing quality on
**existing published listings**. About prose is the primary target today.

This is **not** ClassScout's unported `catalog-loop` Find→Improve discovery pipeline (board #221 /
`docs/engine-parity-tracker.md`). That pipeline invents or discovers new catalogue candidates. This
loop never invents venues — it only upgrades cards that are already `PUBLISHED`.

## Why it exists

OSM and extraction seeds often land with template-thin About text ("X is a padel club on Y. Outdoor
courts. More at https://…"). Those dumps fail `validatePublicDescription` (inline URLs) and read as
machine residue to visitors. Operator card feedback (`card_feedback`) on `/stats` opens
`operator_feedback` recommendations (instruction/negative, card-scoped). Improve never pastes the
note into About — it re-runs curated About / compose tactics so claims stay evidence-only.

## Pipeline

| Pass | Module | Writes | Default bound |
| --- | --- | --- | --- |
| **Score** (FIND) | `src/lib/listingQuality/score.ts` + `feedback.ts` | `listing_quality_recommendations` (`status: open`) | 200 published listings / tick + up to 50 feedback hints |
| **Improve** | `src/lib/listingQuality/improve.ts` | `listings.description`, `listings_serving`, recommendation → `applied`/`skipped`/`failed` | 50 open recs / tick (one per listing) |
| **Encode** | `src/lib/listingQuality/encode.ts` | `listing_quality_lessons` | applied rows without a lesson yet; **skips** δ≤0 when `scoreAfter < ABOUT_QUALITY_TARGET` |

Orchestration: `src/lib/listingQuality/loop.ts` (`runListingQualityLoop`). Cron:
`/api/cron/listing-quality-loop` (`10 4 * * *`). Daemon: same tick after 04:10 UTC (on by default;
set `LISTING_QUALITY_LOOP=false` to refuse). CLI: `npm run catalog:quality-{score,improve,encode,loop}`.

## Scoring (0–100)

`scoreAboutQuality(description, locality)` is pure. A listing needs improvement when
`score < ABOUT_QUALITY_TARGET` (75) **or** any defect kind is present:

| Kind | Meaning |
| --- | --- |
| `about_thin` | Too short / empty |
| `about_template` | "X is a padel club on …" template residue |
| `about_url` | Inline URL (`validatePublicDescription`) |
| `about_chrome` | Scraped page chrome |
| `about_contact_leak` | "More at …" / "Call +…" cues that belong in contact fields |
| `operator_feedback` | Card-scoped `/stats` instruction or negative note (resolved to a published listing) |
| `contact_gap` / `research_needed` | Self-heal evidence-wall debt opened by contact enrich / intake; improve does **not** invent contacts — agent brief via `catalog:self-heal --brief` |
| `media_thin` / `geo_weak` | Declared kinds — `recommendationsFromMediaCurate` exists but is **unwired**; geo has no opener yet (see feedback audit) |

Recommendation ids are stable: `lqr_<sha1(listingId\|kind)[:12]>`. Re-scoring **reopens**
`skipped` rows (and soft `applied` rows whose `resultScore` never cleared the target). Hard
`applied` / `failed` rows stay closed for the same id.

Tone lexicon accepts `recommend` / `recommended` / `recommendation` and `session(s)` so soft
recommend-y prose is not stuck at 60 without defect kinds.

## Improve tactics

Tried in order, always gated by `validatePublicDescription` before write:

1. **`strip_chrome`** — `correctPublicDescription` when the defect is URL/chrome/contact leak
2. **`curated_about`** — override from Mongo `listing_curated_abouts` when present and clean
   (never from the git tree; `catalog:about-curate` upserts there)
3. **`compose_about`** — deterministic recommendation prose from listing facts only (name, locality,
   region, country, street, `venueModel`, short season note). Never invents court counts, prices, or
   amenities. Never embeds URLs or phones.

**Cloud Agent About curate** (`npm run catalog:about-curate`) is the same skill as fixing one
provider About by hand: draft from listing facts + research `sourceText`, upsert Mongo curated
overrides, apply the description, then let `catalog:quality-loop` score/encode. Use `--listing-id`
+ `--about` when the agent drafts explicit copy; use `--limit N` for a bounded automatic pass.
Catalogue content stays in Mongo only — not in the repository. **`catalog:quality-loop` never loads
GDS / the vertical pack** — score / improve / encode write Mongo only. After About writes, refresh
public cards with `npm run serving:reconcile` when needed.

## Encode

Each applied recommendation with `tactic` + `resultScore` + `appliedAt` becomes one lesson
(`lql_<sha1(recommendationId\|appliedAt)[:12]>`) carrying score delta. Lessons are the audit trail
operators (and future scorers) use to see what tactics moved the needle.

## Collections

| Collection | Purpose |
| --- | --- |
| `listing_quality_recommendations` | Open / applied / skipped / failed work items |
| `listing_quality_lessons` | Encoded score deltas + tactics |

Store seam: `mongoListingQualityStore` / `memoryListingQualityStore` — unit tests never need Mongo.

## Operator runbook

Dry-run first (writes nothing):

```bash
VERTICAL=padel-africa MONGODB_URI=… MONGODB_DB=padel-africa \
  npm run catalog:quality-loop -- --dry-run --score-limit 50 --improve-limit 20
```

Score only / improve only / encode only:

```bash
npm run catalog:quality-score -- --dry-run
npm run catalog:quality-improve -- --dry-run
npm run catalog:quality-encode -- --dry-run
```

Apply (writes descriptions + recommendations + lessons; no pack/GDS):

```bash
VERTICAL=padel-africa MONGODB_URI=… MONGODB_DB=padel-africa \
  npm run catalog:quality-loop -- --score-limit 50 --improve-limit 20
# refresh public cards separately when needed:
# npm run serving:reconcile
```

Enable the scheduled path (daemon + hosted cron):

```bash
# on by default — only set this to disable
# LISTING_QUALITY_LOOP=false
```

Set `LISTING_QUALITY_LOOP=false` ⇒ cron/daemon record `refused` with that detail (visible on
`/automation` and `npm run cron:status`).

## About rules (binding)

Same rules as [`osm-padel-africa-seed.md`](osm-padel-africa-seed.md):

- Recommendation tone, ~300–450 characters when curated
- **No inline URLs** — website/phone stay in contact fields
- No "OSM lists…", no coordinates, no "More at …" / "Call …" dumps
- Facts only — OSM/Nominatim tags and corroborated public club pages; never invent amenities

## Tests

`src/lib/listingQuality/loop.test.ts` — score thresholds, compose never embeds URLs, full
score→improve→encode on an in-memory store, dry-run writes nothing.
`src/app/api/cron/listing-quality-loop/route.test.ts` — 503/401 auth posture.

## Related

- [`padel-africa-jobs.md`](padel-africa-jobs.md) — worked agent examples for this loop + sibling jobs
- [`classscout-sovereign-twin.md`](classscout-sovereign-twin.md) — dense-US twin (do not merge engines)
- [`operations.md`](operations.md) — script table + cron/daemon sections
- [`padel-africa-self-heal.md`](padel-africa-self-heal.md) — unified debt + FIND bind + process lessons
- [`osm-padel-africa-seed.md`](osm-padel-africa-seed.md) — OSM seed About rules (live curated Abouts live in Mongo `listing_curated_abouts`)
- [`engine-parity-tracker.md`](engine-parity-tracker.md) #221 — ClassScout catalog-loop (unported; different job)
- `src/lib/catalogHygiene/descriptionQuality.ts` — URL/chrome gate shared with the chrome sweep
