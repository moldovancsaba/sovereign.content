# Padel Africa — quality jobs audit (2026-09-24)

> **Historical snapshot** (metrics + what jobs applied that day). **Not the preferred ops guide.**
> For live how-to use [`padel-africa-jobs.md`](padel-africa-jobs.md) (single orchestrator timer;
> Mongo-only content ticks). Timer lists below that imply five separate subscriptions are superseded.

Evidence audit of what Cloud Agent catalog jobs **actually collected and applied** in
`padel-africa` Mongo, plus a live re-score of historical quality recommendations.

**Not** a ClassScout NYC fair-use Find audit. Content remains Mongo-only; this doc is process
memory for operators and agents.

## Snapshot (live)

| Metric | Value |
| --- | --- |
| Published listings | **158** / **42** countries |
| About score ≥ `ABOUT_QUALITY_TARGET` (75), no defect kinds | **158 / 158** (after audit-day curate of 2 leftovers) |
| Open quality recommendations | **0** |
| Applied recommendations | **2** |
| Skipped recommendations | **25** (historical; all re-scored ≥75 live) |
| Encoded lessons | **2** |
| Operator feedback rows | **0** (collection absent) |
| Curated Abouts (`listing_curated_abouts`) | **149+** |
| Contact/media gaps (phone / website / email / media empty) | **0 / 0 / 0 / 0** |

`catalog:find --status` still lists **12** missing countries (mostly prior zero-result audits) and
**8** sparse `n=1` countries (BJ, BI, DJ, SZ, ET, GN, MR, SO). LY/GQ were lifted off that list by
FIND (PR #227).

## Method

1. Read `listing_quality_recommendations` + `listing_quality_lessons`.
2. Re-score every historically **skipped** recommendation listing with
   `scoreAboutQuality(description, locality)` against target **75**.
3. Full-catalogue About pass over all `lifecycleState: PUBLISHED` rows.
4. Cross-check Cloud Agent timed jobs: `about-curate`, `quality-loop`, `media-curate`,
   `autopilot`, `hygiene` + `serving:reconcile`, `contact-enrich`, `catalog:find`.

## 1. What the quality-loop recommendations collected

### Kind mix

All **27** stored recommendations are **`about_thin`** with tactic **`curated_about`**.

No `about_chrome` / `about_url` / `about_contact_leak` / `about_template` / `operator_feedback`
rows remain in the store from these ticks.

### Applied (2) → encoded lessons (2)

| Listing | Message (score-time) | Before → after (encode) | Delta | Lesson |
| --- | --- | --- | --- | --- |
| `research-ago-ven-004` Miramax | About too thin (60) | 60 → 75 | **+15** | `curated_about` works when it clears the bar |
| `research-cpv-ven-003` VOI Chaves | About too thin (70) | 70 → 70 | **0** | Soft-70 rewrite can “apply” without clearing target |

Live re-score after later curate: **both listings now score 75**.

### Skipped (25) — improve no-ops

Improve closed these when `nextDescription === listing.description` (compose/curate produced no
write). Messages were all thin-About variants (scores 55–70 at open time).

**Re-score 2026-09-24:** **25 / 25 fixed** live (≥75, no kinds). **0** still weak. **0** missing
listings. Fix path was overwhelmingly later **`catalog:about-curate`** (`curated_existing`), not
the improve pass that marked them skipped.

Skipped ID mix at open time: **11** `l-openclaw-*` (often Instagram hosts), **14** `research-*`
(NGA/KEN/SEN/CPV/AGO/CIV/COD/TUN/SYC/MOZ/MUS/GHA).

**Process gap:** skipped status is sticky and does not mean live debt. Agents must **re-score
listings**, not trust recommendation `status: skipped` as current quality.

## 2. Full-catalogue About audit (same day)

Before audit-day curate: **156 good / 2 weak** (no defect `kinds`, score 60 only):

| Id | Name | Score | Why 60 |
| --- | --- | --- | --- |
| `research-gha-ven-002` | The Padel Club Ghana | 60 | length+locality+no-chrome; **no recommendation-tone hit** |
| `research-gmb-ven-001` | Kololi Beach Resort Padel | 60 | same |

Root cause in scorer: `RECOMMENDATION_WORDS` requires a trailing `\b` after `recommend`, so
**“recommended” does not match**; plural **“sessions”** does not match `session`. Prose that
sounds recommend-y can still miss +15 tone and stall at 60.

**Audit action:** `catalog:about-curate -- --listing-id …` on both → **75**. Catalogue now
**158 / 158** at target.

## 3. Job-by-job (actual Cloud Agent ticks)

Timers (snapshot-day): separate quality/media/autopilot/hygiene subscriptions. **Superseded:** prefer
one orchestrator timer — see [`padel-africa-jobs.md`](padel-africa-jobs.md). No AI Gateway / Ollama.

| Job | Observed behaviour | Writes / findings |
| --- | --- | --- |
| **`catalog:about-curate`** | Productive when debt exists; often `considered/applied 0` when healthy | Applied batches during this run (e.g. Oxygen Arena, Djibouti, COG/CMR/CPV, RWA/TGO/ZAF/SYC, NGA×2, GHA/GMB). Primary content fixer. |
| **`catalog:quality-loop`** | Steady **scanned 100 / alreadyGood 100 / openWritten 0**; improve 0; encode skipped 2 (lessons already present) | Pack load warns `vertical pack unavailable … continent` and **continues** — expected; content not blocked. |
| **`catalog:media-curate`** | Usually **scanned 0** (no empty/low media queue). Earlier FIND tick applied 5 passthrough hosts | R2/ImgBB unset → `source-passthrough` only. |
| **`catalog:autopilot`** | **requeued 0 / ranTicks 0** every tick | Empty `content_cards` — cannot invent venues; **FIND** is the discovery path. |
| **`catalog:hygiene`** | Mostly zero-write; one tick **territory continent=6** after map expand; later **contact=1** (`research-tgo-ven-002` website) | Geo/price/age usually unchanged; contact leftovers often `no_evidence`. |
| **`serving:reconcile`** | Intermittent rebuilds (0–6) after About/contact writes | Projection catch-up when pack path works. |
| **`catalog:contact-enrich`** | Scans gaps; **applied 0** when evidence missing | Not a recommendation store — operational `no_evidence`. |
| **`catalog:find`** | Status → fixture → dry-run → seed | SN/TZ/ZM then LY (Zeyani+Mendoza) + GQ (Ukomba). Live 158 / 42. |

## 4. Process recommendations (from jobs + audit)

### Keep doing

1. **About debt → `about-curate` first**, then quality-loop. Curated About is the only tactic with a
   positive encoded lesson (+15) and the path that cleared the 25 historical skips.
2. **FIND for empty autopilot** — do not expect autopilot ticks to grow the catalogue.
3. Treat **GDS/pack warnings as non-blocking** for content (documented on Jobs SSOT).
4. Re-score live listings when interpreting **skipped** recommendations.

### Fix / harden (code or ops)

1. **Scorer tone lexicon** — **delivered** (`recommend(?:ed|ation)?`, `sessions?`).
2. **Encode hygiene** — **delivered**: encode only when `delta > 0` **or**
   `scoreAfter >= ABOUT_QUALITY_TARGET` (`shouldEncodeLesson`). Soft δ0 lessons removed from Mongo.
3. **Recommendation refresh** — **delivered**: score upsert reopens **`skipped`** and
   **soft-applied** rows (`resultScore < 75`); clears stale improve fields. Hard applied/failed stay
   closed.
4. **R2 / ImgBB** — **ops-blocked** in this Cloud Agent env (no `R2_*` / `IMGBB_API_KEY`). Media
   ticks stay https source-passthrough until credentials are provisioned.
5. **Sparse FIND backlog** — **tick attempted 2026-09-24**: no second evidence-grade venue found for
   BJ/BI/DJ/SZ/ET/GN/MR/SO (directories/install notes without street+contact, or already-seeded
   clubs only). Zero-result is first-class; do not invent.

### Not collected (honest gaps)

- No `/stats` operator_feedback → no instruction/negative lessons.
- No quality recommendations for contact/media (those jobs do not write `listing_quality_*`).
- Autopilot produced no process lessons (empty queue by design).

## 5. Verdict

| Area | Verdict |
| --- | --- |
| About quality loop | **Healthy** — open debt empty; 158/158 at target after audit fixes |
| Historical skipped recs | **Cleared live** — 25/25 ≥75; do not treat store skips as current debt |
| Encoded lessons | **Thin but directional** — curated_about +15 is the keep; soft-70 apply is the anti-pattern already mitigated by target 75 |
| Timed jobs | **Operating as designed** — about-curate + FIND do the work; quality/media/autopilot/hygiene mostly zero-cost when caught up |
| Next leverage | Continued FIND on n=1 cells when official pages appear; provision R2/ImgBB for durable media |

## Commands to reproduce

```bash
npm run catalog:find -- --status
npm run catalog:about-curate -- --limit 15
npm run catalog:quality-loop -- --score-limit 100 --improve-limit 40
# One-off weak About:
npm run catalog:about-curate -- --listing-id research-gha-ven-002
```

Management PR tracking tooling/docs: https://github.com/moldovancsaba/management/pull/227
