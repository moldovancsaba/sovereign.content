# Self-heal & feedback audit + improvement plan

**Date:** 2026-09-24  
**Scope:** ClassScout catalog-loop / Sovereign Content orchestration (not Lite daemon redesign)  
**Binding SSOT:** [Jobs](https://sovereigncontent.messmass.com/jobs) · [Implement](https://sovereigncontent.messmass.com/implement) · [`sovereign-content-alignment.md`](../sovereign-content-alignment.md) · rules **450** / **452**  
**Live sample:** `scripts/catalog-loop/data/` on this environment (events ~53.8k lines)

This doc answers three questions, then proposes a build plan:

1. How effective is self-heal today?
2. What feedback do we collect, and what do we do with it?
3. What should a closed **self-heal → self-improve** sovereign loop look like here?

---

## 1. Verdict (one screen)

Self-heal **can** measure debt and **can** pause Find — but in this environment it has **never deferred Find** (`find_deferred_self_heal` = 0 events). Forever runs Improve every cycle, so priority debt stays below the pause threshold while Find keeps growing the queue. Briefs are **advisory**, not an executor: contact hygiene and Mongo soft-About scans are not on the forever path.

Feedback is **split across three worlds**:

| World | Store | Consumed by catalog-loop? |
| --- | --- | --- |
| **A. Catalog-loop events + recommendations** | `data/events.jsonl`, `recommendations.json`, `lessons.json` | Yes — Improve / encode / Find order |
| **B. Drop-folder operator notes** | `data/feedback/*.json` → intake | Wired, but **never used** (`operator_feedback` = 0) |
| **C. Admin `/api/stats/feedback`** | Mongo `classscoutCardFeedback` | **No** — Lite card enrichment only |

There is **no dedicated job** that polls “new feedback arrived?” and schedules heal actions. Scheduling is forever density + optional sparse-timer + manual npm.

**Bottom line:** we have strong **observe + Improve** muscles and a thin **self-heal status** layer. We do **not** yet have a closed **sense → decide → heal → learn → grow** sovereign controller.

---

## 2. What self-heal measures today

Source: `scripts/catalog-loop/lib/selfHeal.cjs` · CLI `npm run catalog:self-heal`.

| Debt signal | Metric | Default threshold | Effect when hot |
| --- | --- | --- | --- |
| Weak About | open `weak_description` recs **or** live soft About count (`--scan-mongo`) | 25 | Brief `catalog:about-curate`; `deferFind` |
| Priority Improve | open recs with priority gaps (`bad_address` / `weak_description` / `blank_contacts`) | 40 | Brief `catalog:quality-loop`; `deferFind` |
| Contact | open contact-gap recs **or** live blanks (`--scan-mongo`) | 30 | Brief hygiene `--passes contact`; `deferFind` |
| Research | open recs with `researchDebt === "no_evidence"` | 30 | Same contact brief |
| Operator feedback | pending `feedback/*.json` **or** open `source=operator_feedback` recs | 1 | Brief feedback + quality-loop; `deferFind` |

Overrides: `CATALOG_SELF_HEAL_FORCE_FIND=1` · `CATALOG_SELF_HEAL_DEFER_FIND=0`.  
`find-cycle` honors `shouldDeferFind()` (status file ≤30 min, else re-evaluate).

### Forever wiring (partial)

```
feedback-intake → recommend-improve → self-heal --status (no --scan-mongo)
  → improve-cycle
  → [only if deferFind] about-curate repairs
  → find-cycle (or skip)
  → reclassify → encode-lessons
  → hourly: scarcity brief, rollup, about repairs, push-stats
```

| Self-heal brief | Forever auto-runs it? |
| --- | --- |
| about-curate | Only when `deferFind` (plus separate hourly repair) |
| quality-loop | Indirectly (recommend + improve every cycle) — not as a brief executor |
| hygiene contact | **No** |
| feedback intake | Yes every cycle (idle if folder empty) |

Sparse-timer with `--with-self-heal` runs status + intake only unless you also pass `--with-about-curate` / `--with-hygiene` / `--with-quality-loop`.

---

## 3. Live effectiveness (this environment)

Snapshot ~2026-09-24:

| Indicator | Value | Reading |
| --- | --- | --- |
| Open recommendations | **16** | All source=`audit` — zero operator |
| Open gap mix | bad_address 15, blank_price 16, blank_trial/sessions 15, blank_contacts 3 | Address + soft blanks dominate; **weak_description 0** |
| Closed / exhausted | 554 / 36 | **449 soft_deferred** — soft gaps parked, not healed |
| Self-heal `deferFind` | **false** | priorityOpen 16 ≪ threshold 40 |
| `find_deferred_self_heal` events | **0** | Feature never tripped in production loop |
| `operator_feedback` events | **0** | Drop-folder path unused |
| `contact_enrich_applied` | **0** | Contact enrich not on forever |
| Events total | ~53.8k | Dense Find/Improve/fair-use (not idle) |
| Top events | find_smoke, reclassify_repair, seed_paused, fair_use_* | Growth + watch repairs dominate |
| Improve applied (latest hourly) | **0** that hour | Improve often scans without landing patches |
| False publishes (latest hourly) | **37** | Smoke fail pressure still high |
| Lessons | 79 encoded (75 Tier A / 4 Tier B), **0 open** | Pause machines work; Tier B is ledger-only |
| Seeds paused | ~966 of ~1663 | Tier A + retire effective at stopping bad hosts |

**Effectiveness scorecard**

| Capability | Grade | Why |
| --- | --- | --- |
| Detect open Improve debt | B+ | Recommendation store + recommend-improve audit work |
| Pause Find when About debt hot | D | Thresholds + no `--scan-mongo` → never deferred here |
| Heal About when deferred | B | Repair scripts exist; rarely gated on |
| Consume Improve recs | B | Improve is recommendation-first; address dead-ends exhaust |
| Learn from Find skips | A− | Tier A encode → host pause is strong |
| Operator → catalog heal | F | Path exists; zero traffic; Stats API is another world |
| Contact / research heal | D | Job exists; not forever; researchDebt stamps only after manual hygiene |
| Close the lesson → extractor loop | C | Tier A pauses; Tier B / playbook not auto-applied |
| Surface heal KPIs | C | Rollup blind to defer / contact enrich / until-found |

---

## 4. Feedback inventory (what we collect)

### 4.1 Machine / loop feedback (World A) — active

| Signal | Producer | Payload | Consumer |
| --- | --- | --- | --- |
| `improve_recommend` / `_close` | `recommend-improve` / `improve-cycle` | gaps, lanes, providerId | Improve batch; self-heal counts |
| `improve_apply` / `_reject` / `_noop` / `_scan` | Improve | patch outcomes | Rollup KPIs |
| `find_skip` + reason codes | Find | `no_street`, `duplicate`, `http_blocked`, … | `encode-lessons` Tier A |
| `find_publish` / `find_smoke` | Find | lasting-public funnel | Rollup lasting-public rate |
| `seed_paused` / `lesson_encoded` | encode + intake | host signatures | Find skips paused seeds |
| `fair_use_*` | Fair-use forever | discovery funnel | Seeds + rollup |
| `scarcity_research_brief` | Hourly brief | thin nbhd / scarce sports | Find seed order, find-until |
| `reclassify_repair` | Watch | category flip fixes | Direct Mongo/ingest |
| `contact_enrich_*` | Contact enrich | applied / no_evidence | Rec `researchDebt`; self-heal (when present) |
| Recommendations JSON | Durable queue | open / closed / exhausted | Improve-first + self-heal |
| Lessons JSON | Ledger | Tier A/B encode | Pause side effect; human playbook |

### 4.2 Operator drop-folder (World B) — wired, unused

`feedback-intake.cjs` expects `data/feedback/*.json`:

```json
{ "providerId": "…", "tag": "wrong_address", "note": "…" }
```

Tags: `wrong_address`, `wrong_phone`, `not_public_worthy`, `reclassified`, `good_example`, `seed_url_bad`, `duplicate`.

| Tag | Seed pause? | Opens Improve rec? | Else |
| --- | --- | --- | --- |
| wrong_address / wrong_phone | Yes | Yes (`bad_address` / `blank_contacts`) | Note → lesson + event only |
| not_public_worthy / seed_url_bad / duplicate | Yes | No | Lesson only — **does not hide live provider** |
| reclassified / good_example | No | No | Lesson / signal only |

**Binding:** notes never paste into About (`operatorNote` on rec only).

Forever runs intake every cycle. **Zero files ever processed** in this env’s event log.

### 4.3 Admin Stats feedback (World C) — separate product

`POST /api/stats/feedback` → Mongo `classscoutCardFeedback` (instruction / positive / negative, card or global).

Consumed by Lite `contentCardEnrichment` prompts (`listActiveAgentFeedback`) — **not** by catalog-loop self-heal, recommendations, or drop-folder intake.

Docs that say “Operator `/stats` feedback → operator_feedback recs” describe the **intended** SC contract; ClassScout has not bridged Stats → catalog-loop yet.

### 4.4 Optional Find sources (discovery feedback)

| Source | Role | Self-heal aware? |
| --- | --- | --- |
| Scarcity research brief | Prefer thin neighborhoods / scarce sports for Find | No (growth signal, not debt) |
| Fair-use forever | External directory harvest → seeds | No |
| `catalog:find --until-found` | Agent research briefs for sparse markets | Forces Find (`FORCE_FIND`); not in forever |
| Client-feedback P0/P1 scripts | One-shot geo/junk/About repairs from triage dumps | Batch / hygiene pass — not event-driven |

---

## 5. What we do with feedback (the actual loop)

```
                    ┌─────────────────────────────┐
   Find skips ──────► encode-lessons (Tier A) ─────► pause seeds ──► Find skips them
                    └─────────────────────────────┘

   Gap audit ───────► recommendations.json ────────► improve-cycle ──► ingest patch
        │                      │                         │
        │                      ▼                         ▼
        │               self-heal counts          settle / exhaust / soft_defer
        │                      │
        │                      ▼
        │               deferFind? ──yes──► about repair only
        │                      │
        └──────────────────────┴── no ──► Find keeps running

   drop-folder ─────► intake ──► (idle: 0 events)
   /api/stats/feedback ───────► Lite enrichment only (parallel universe)
```

### Gaps in the consume path

1. **No feedback poller** — nothing watches Mongo card feedback or “new event types since T” to enqueue heal jobs.
2. **Briefs ≠ executor** — self-heal prints jobs; forever does not map briefs → CLI runs (except about on defer).
3. **Forever never `--scan-mongo`** — soft About / live contact blanks stay invisible to thresholds.
4. **Priority threshold (40) > current debt (16)** — address thrash never pauses Find.
5. **Operator tags incomplete** — hide/quarantine for `not_public_worthy` / `duplicate` missing.
6. **Lessons are mostly pauses** — Tier B does not auto-change extractors; playbook is human.
7. **Address exhaust** — Improve retries → `exhausted` without alternate evidence lanes (deep address / Nominatim / quarantine).
8. **Soft_deferred majority** — 449 closes park soft blanks; queue looks “healthy” while public cards stay incomplete.

---

## 6. Sovereign Content target shape

From [Jobs · catalog:self-heal](https://sovereigncontent.messmass.com/jobs) and Implement:

> Unified About + research debt status. When debt is hot, FIND defers and prints heal-first briefs. `--status` reports `openOperatorFeedback` (`/stats` card notes) and instructs `catalog:quality-loop` — never paste the operator note into About.

Dense-US twin (ClassScout): keep forever Find + `generated_art_only`; adopt SC **orchestration** (heal-first, feedback surface, sparse complement).

**Target controller (sense → decide → act → learn → grow):**

| Phase | Job | ClassScout today | Target |
| --- | --- | --- | --- |
| Sense | Collect debt + feedback | Partial (recs + events; no Stats bridge; no mongo scan on forever) | Unified inbox |
| Decide | Rank heal vs grow | Thresholds exist; rarely trip | Brief executor + calibrated thresholds |
| Act | about / quality / contact / hide | Improve yes; contact/about-on-defer weak | Map every brief → CLI |
| Learn | Encode lessons that change next tick | Tier A pause strong; Tier B weak | Closeable lessons + extractor hooks |
| Grow | Find / until-found | Forever always-on | Defer when heal hot; until-found when seeds idle |

---

## 7. Improvement plan (build this system)

Phased so forever density stays; we add a **controller**, not a second daemon.

### Phase 0 — Instrument & calibrate (no behavior change risk)

**Goal:** Prove whether self-heal *should* have deferred, and make KPIs honest.

1. Add rollup counters for `find_deferred_self_heal`, `contact_enrich_*`, `operator_feedback`, `find_until_attempt`.
2. Forever: run `catalog:self-heal --status --scan-mongo` at least hourly (or every N cycles) so soft About / contact blanks enter debt.
3. Log `healBriefsExecuted: []` vs `healBriefsPending: []` on status JSON for audit.
4. Lower **diagnostic** thresholds behind `CATALOG_SELF_HEAL_MODE=observe|enforce` (default observe for one week, then enforce).

**Done when:** hourly scorecard shows softAboutCount / contactBlankCount / wouldDeferFind.

### Phase 0.5 — Smart reports + auto vs HitL delivery (**SHIPPED 2026-09-24**, rule 453)

**Goal:** Reports read like an agent task write-up; delivery decides auto vs owner review.

1. `npm run catalog:self-heal -- --report` → reasoned `latest.md` + `review-packet-latest.json`.
2. Policy table (`selfHealDeliveryPolicy.cjs`): auto = evidence-only; HitL = hide / invent / publish / policy / exhausted address.
3. `npm run catalog:self-heal -- --apply-auto` runs auto only; forever uses it when `deferFind`.
4. Hourly `--report` on forever; sparse `--with-self-heal` uses `--report` + conditional `--apply-auto`.

**Done when:** owner can open `latest.md`, see a verdict + decision checklist, and trust that `--apply-auto` will not hide or invent.

### Phase 1 — Brief executor (`catalog:self-heal --apply-briefs`)

**Goal:** Status stops being advisory-only.

1. New mode: read latest status (or evaluate fresh) → run mapped CLIs dry-run-safe:

| Brief action | Executor |
| --- | --- |
| `catalog:about-curate` | `sovereign-about-curate.cjs` |
| `catalog:quality-loop` | recommend → improve → encode (already forever; ensure settle) |
| `catalog:hygiene --passes contact` | `contact-enrich.cjs` |
| `catalog-loop:feedback` | `feedback-intake.cjs` + Stats bridge (Phase 2) |

2. Forever when `deferFind`: run `--apply-briefs` (bounded limits) **before** Find, not only about repair.
3. Sparse-timer: `--with-self-heal` implies apply-briefs when debt hot (unless `--status-only`).

**Done when:** a forced hot fixture shows about + contact CLIs run and status clears or shrinks.

### Phase 2 — One operator feedback inbox

**Goal:** End the dual-world split.

1. **Bridge** `classscoutCardFeedback` (active, provider-scoped when resolvable) → drop-folder JSON **or** direct `upsertOpenRecommendation` with `source=operator_feedback`.
2. New thin job: `catalog:feedback-drain` (or self-heal substep) — poll Mongo since cursor; idempotent; mark feedback `consumedBy=catalog-loop` (schema-safe field or companion collection — do not invent ingest-breaking keys).
3. Expand TAG_TO_GAPS / actions:
   - `not_public_worthy` → hide or quarantine listing (evidence-backed)
   - `duplicate` → hide weaker twin (rule 20 contract)
4. Keep: never paste note into About.

**Done when:** posting Stats feedback on a known provider opens a catalog-loop rec within one forever cycle; `operator_feedback` events > 0.

### Phase 3 — Heal lanes for stuck debt

**Goal:** Stop burning Improve attempts on unwinnable address/contact rows.

1. **Address dead-end lane:** after N failed attempts, open `researchDebt=need_address_evidence` brief for agent / until-found cell, or quarantine; do not soft-defer forever.
2. **Contact enrich on forever** when `contactDebtHot` (bounded limit).
3. **Calibrate thresholds** from Phase 0 observe week (likely priority ≈ 15–20 for ClassScout forever density, or scale by open/public ratio).
4. Exhausted recs → weekly digest “agent research pack” (excludeNames + queries), not silent.

**Done when:** open `bad_address` queue shrinks via resolve **or** explicit research/quarantine — not only exhaust.

### Phase 4 — Self-improvement (learn → change next tick)

**Goal:** Lessons change behavior, not only pause hosts.

1. Promote repeated skip signatures into **extractor fixtures** (CI) when Tier A fires — already partial; automate fixture stub PR/checklist.
2. Tier B operator lessons: structured `encode.actions` consumed by a tiny `apply-lesson-hints.cjs` (config flags only — never invent facts).
3. Process findings → `sovereign.content` `agent-recommendation` when the fix is cross-vertical (already doctrine).
4. Optional: `catalog:self-heal --record-process` twin (SC) writing a vertical process-lesson file.

**Done when:** a repeated chrome/skip class is prevented by fixture + extractor change within a measured window, not only seed pause.

### Phase 5 — Growth gate (heal-first forever)

**Goal:** Forever remains dense, but not thrashing.

1. Enforce `deferFind` after Phase 0–1 prove week.
2. When seed queue idle **and** debt cool → run `catalog:find --until-found --status` for agent sparse growth (complement, not replace).
3. After heal writes → `serving:reconcile` (sparse already; forever may call bounded reconcile hourly when apply>0).

**Done when:** lasting-public rate up, false_publishes down, Find continues when debt cool, pauses when hot.

---

## 8. Suggested implementation order (board-ready)

| # | Item | Leverage | Effort |
| --- | --- | --- | --- |
| 1 | Forever `--scan-mongo` hourly + rollup heal KPIs | High | Small |
| 2 | `self-heal --apply-briefs` + forever/sparse wire | High | Medium |
| 3 | Stats → catalog feedback bridge + `feedback-drain` | High | Medium |
| 4 | Address dead-end / researchDebt lane | High | Medium |
| 5 | Contact enrich on defer / contactDebtHot | Medium | Small |
| 6 | Threshold calibrate from observe week | Medium | Small |
| 7 | Operator tag → hide/quarantine | Medium | Small |
| 8 | Lesson → fixture / hint applicator | Medium | Medium |
| 9 | until-found when seeds idle + debt cool | Medium | Small |
| 10 | File SC deltas after ClassScout prove | Process | Small |

Do **not** replace forever with padel sparse-only. Do **not** paste operator notes into About. Do **not** invent contacts.

---

## 9. Prove sequence (after each phase)

```bash
npm run catalog:self-heal -- --status --scan-mongo --brief
npm run catalog:self-heal -- --apply-briefs --dry-run   # Phase 1+
npm run catalog:about-curate -- --dry-run --limit 10
npm run catalog:quality-loop -- --dry-run
npm run catalog:hygiene -- --dry-run --passes contact --limit 10
npm run catalog:feedback-drain -- --dry-run                # Phase 2+
npm run catalog-loop:rollup
# Inspect: deferFind, briefs executed, operator_feedback count, open gap mix
```

---

## 10. What this repo should file back to Sovereign Content

After Phase 1–2 prove on ClassScout, file `agent-recommendation` Issues (one idea each), e.g.:

1. **Brief executor contract** — `catalog:self-heal --apply-briefs` maps status actions to job twins (vertical-local CLIs).
2. **Dual feedback bridge** — Stats/card notes → catalog operator_feedback inbox without About paste.
3. **Dense forever + heal-first** — how thresholds + hourly mongo scan work when Find is continuous, not only `--until-found`.

---

## 11. Pointers

| Doc / code | Role |
| --- | --- |
| [`catalog-find-improve-loop.md`](../catalog-find-improve-loop.md) | Forever runner SSOT |
| [`sovereign-content-alignment.md`](../sovereign-content-alignment.md) | Job alias map |
| [`catalog-loop-error-playbook.md`](../catalog-loop-error-playbook.md) | Failure catalog / healers |
| `scripts/catalog-loop/lib/selfHeal.cjs` | Debt evaluation |
| `scripts/catalog-loop/feedback-intake.cjs` | Drop-folder intake |
| `src/app/api/stats/feedback/route.ts` | Admin Stats feedback (Lite) |
| `scripts/catalog-loop/encode-lessons.cjs` | Tier A auto-pause |
| `scripts/catalog-loop/quality-rollup.cjs` | Hourly scorecard |
