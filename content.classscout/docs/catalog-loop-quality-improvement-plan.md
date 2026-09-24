# Catalog loop — continuous quality improvement plan

**Status:** IMPLEMENTED (Phases 0–5, 2026-09-21) + **Phase 6 recommendation self-improvement
(2026-09-22, rule 429)** — builds on the LIVE find+improve runner in
[`catalog-find-improve-loop.md`](catalog-find-improve-loop.md).
**Scope:** this environment’s catalog loop only (Find + Improve via production ingest).
**Not this plan:** a second daemon, OpenClaw redesign, or a second project board. Tracking stays on
board **#44**; product-side changes (reclassify policy, activity toggles) become board items when
needed.

---

## 1. Goal

Keep Find and Improve running forever, and make the **quality of what they write** get better over
time by converting mistakes, skips, public-smoke failures, operator feedback, and KPI misses into
**durable, deterministic gates and priorities** — without inventing contacts and without loosening
ingest.

Success looks like:

- Fewer false publishes (bad addresses, invalid phones, non-public activity tags counted as wins)
- Fewer repeated skip classes without a recorded lesson
- Improve hours that stay productive as trial blanks dry (new evidenced fields in priority order)
- Every serious incident becomes a fixture + filter, not a chat memory

---

## 2. Principles (binding)

1. **Evidence-only.** Unpublished phones, emails, trials, prices stay blank. Learning never means
   inventing.
2. **Encode, don’t “remember.”** A lesson is a versioned rule, seed pause, extractor test, or KPI
   definition — not a model vibe.
3. **Observe → classify → encode → verify → report.** That cycle is the process. Volume KPIs stay;
   quality KPIs join them.
4. **One loop.** Extend `scripts/catalog-loop/`; do not stand up a parallel improvement daemon.
5. **Deterministic first.** Prefer reject/skip filters and schema gates (the pattern already used for
   trial false positives) over open-ended generation.
6. **Human gate for policy.** Auto-encode only narrow, repeated extract defects. Anything that changes
   public product behavior (toggles, reclassify, category vocabulary) goes through board #44 / owner.

---

## 3. What already exists (do not rebuild)

| Surface | Role today |
| --- | --- |
| `curatedProviderSchema` + ingest | Hard write ceiling |
| Phone E.164 / website gates (rules 410–411) | Contact hygiene |
| Trial false-positive filters in `apply-trial-fix.cjs` | Improve quality |
| Find skips + `findAttempts` in `/tmp/catalog-loop-state.json` | Per-seed memory (ephemeral) |
| `reclassify-watch.cjs` | Post-publish category repair |
| Hourly volume KPIs in [`catalog-find-improve-loop.md`](catalog-find-improve-loop.md) §5 | Ops scorecard |
| `fieldVerifications` on providers | Per-field provenance |
| Admin card feedback (`/api/stats/feedback`) | Operator notes for Lite enrichment (adjacent pattern to reuse) |
| Lite loop-health / soft-gap / autotune | **Separate** daemon gauges — learn from their shape; do not merge processes |

---

## 4. Mistakes already learned (seed the lesson log)

These are real incidents from the 2026-09-20/21 live pass. Each must land as an encoded lesson, not
only narrative.

| Incident | Failure mode | Encoded lesson (target) |
| --- | --- | --- |
| SI / Queens / birthday upserts invisible | Find KPI counted inventory as “published” | `publicTarget` + region/category/activity allowlist before counting a win |
| Class listings flipped to Birthday Parties | Lite reclassify + disabled browse category | Strip birthday marketing on Class finds; reclassify watch every cycle |
| Aqua-Tots address `15 minutes. Please` | Address regex matched schedule copy | Street-type + leading number + reject schedule words; quarantine/delete bad row |
| Phone `+1178…` | NANP area code starting with 1 | Reject area codes starting with 0/1 |
| Diller-Quaile public `404` after “successful” upsert | `Music` not publicly enabled | Pre-publish check: at least one **enabled** activity tag; don’t count 404 smokes as public wins |
| National franchise homepage as seed | No Brooklyn street address on page | `paused` + `requiresAddressFromPage`; prefer location-specific URLs |
| Cloudflare / HTTP 403–404 seeds | Fetch blocked | Retry budget; skip; never invent from directories |
| Dry Improve hours (`to apply 0`) | Trial blanks lack stated trial text | Expected when backlog is dry; **expand Improve lanes** (below) so “dry trial” ≠ “nothing to do” |

Initial machine-readable copy: [`scripts/catalog-loop/lessons.json`](../scripts/catalog-loop/lessons.json).

---

## 5. Continuous improvement architecture

```
┌─────────────┐   ┌─────────────┐   ┌──────────────┐   ┌───────────┐   ┌──────────┐
│  Observe    │ → │  Classify   │ → │  Encode      │ → │  Verify   │ → │  Report  │
│ event log   │   │ reason buckets│   │ gates/seeds │   │ fixtures  │   │ KPIs+digest│
└─────────────┘   └─────────────┘   └──────────────┘   └───────────┘   └──────────┘
        ↑                                                                      │
        └──────────────── operator feedback + smoke failures ──────────────────┘
```

### 5.1 Observe (every cycle)

Append structured events (JSONL), durable under the environment then promote with the runner:

| Event | When |
| --- | --- |
| `find_attempt` | Seed tried |
| `find_skip` | Skip with **stable reason code** |
| `find_publish` | Ingest upsert ok |
| `find_smoke` | Public GET status + category |
| `improve_scan` | Trial/session slice results |
| `improve_reject` | False-positive filter hit |
| `improve_apply` | Patch accepted |
| `reclassify_repair` | Watch patched category |
| `ingest_reject` | Schema / upload failure |
| `operator_feedback` | Explicit note tied to `providerId` or `seedId` |

**Reason codes (Find skips)** — closed vocabulary, extend only with a lesson:

`http_blocked` · `http_not_found` · `no_street_address` · `no_image` · `duplicate_existing` ·
`activity_not_public` · `region_not_public` · `paused_seed` · `fetch_error` · `ingest_reject` ·
`smoke_not_public`

### 5.2 Classify (hourly)

Roll events into:

- Skip histogram by reason code
- Lasting-public rate = `smoke_200_after_10m / find_publish` for `publicTarget` seeds
- Improve: applies / rejects / dry cycles
- Top 3 repeated failure signatures (same host + same reason)

### 5.3 Encode (tiered)

| Tier | Who | Examples |
| --- | --- | --- |
| **A — auto** | Loop, after N≥3 identical signatures in 24h **or** one P0 false publish | Add extractor reject pattern; mark seed `paused` with reason |
| **B — operator** | Agent/owner in this environment | Fix seed URL; add fixture; adjust `publicTarget`; add lesson entry |
| **C — product** | Board #44 | Reclassify policy, enable Music/Dance globally, region toggles |

Never auto-encode Tier C.

### 5.4 Verify

- **Fixtures:** HTML / address / phone snippets under `scripts/catalog-loop/fixtures/` that assert
  extractors reject known bad strings and accept known good ones
- **Watch list:** existing reclassify watch + lasting-public re-smoke
- **Gauntlet:** extractor unit tests ride the normal `npm test` path when added

### 5.5 Report

Extend the hourly scorecard (see §7). Weekly: one short digest from the event log — top lessons
encoded, top open skip classes, seed queue depth, lasting-public rate.

---

## 6. Expand Improve — quality backlog (not only trials)

Trial blanks will go dry. The Improve job should rotate evidence-only lanes in priority order:

| Priority | Gap | Source of evidence | Notes |
| --- | --- | --- | --- |
| 1 | `trialPolicy` blank | Official page trial/drop-in/sibling text | Current lane |
| 2 | `sessions` blank | Dated session blocks on official pages | Already snapshotted as `sessionsBlank` |
| 3 | Hard contact gap | `tel:` / `mailto:` / schema.org on official page only | Never invent; leave blank if absent |
| 4 | `price.evidence` unknown | Stated amounts / “free” on page | Structured `price` + verification |
| 5 | Weak/missing `ageRanges` | Stated age copy on page | Closed vocabulary only |
| 6 | Stale verification | `fieldVerifications` older than threshold when page still reachable | Refresh stamp or clear bad fields |

Lane scheduler: each cycle picks the highest-priority lane with remaining blanks (round-robin within a
lane). Same false-positive discipline as trials.

---

## 7. Quality KPIs (add to hourly scorecard)

Volume KPIs in [`catalog-find-improve-loop.md`](catalog-find-improve-loop.md) §5 stay. Add:

| Metric | Target | Why |
| --- | --- | --- |
| **Lasting public rate** (publicTarget publishes still `200` after watch) | **≥ 95%** | Catches Aqua/Diller-class false wins |
| **False publish rate** (quarantine/delete within 1h of find) | **0** | Hard quality floor |
| **Improve applies that survive 24h without revert** | **100%** of applies | Catch bad trial FP that slipped filters |
| **Skip reasons with no lesson after 3 repeats** | **0** open | Forces encode step |
| **Operator feedback open → closed** | Trend down week over week | Closes the human loop |

Updated composite sketch:

```
hour_utc:
  cycles: <n>
  improve_applied: <n>
  find_public_new: <n>
  find_lasting_public: <n>/<n>     # NEW
  false_publishes: 0               # NEW
  top_skip_reasons: [code:count…]  # NEW
  lessons_encoded: <n>             # NEW (0 most hours is fine)
  ingest_auth_failures: 0
  loop_up: true
  seeds_pending: <n>
```

---

## 8. Feedback intake

Three inputs, one lesson log:

1. **Automatic** — smoke failures, reclassify repairs, ingest rejects, extractor self-rejects  
2. **Operator** — small JSON drop or admin feedback scoped to `providerId` / `seedId` with closed tags:
   `wrong_address` · `wrong_phone` · `not_public_worthy` · `reclassified` · `good_example` ·
   `seed_url_bad` · `duplicate`  
   Reuse the spirit of `/api/stats/feedback` (operator note → machine-readable); do not invent a second
   feedback product surface if an existing admin path can carry provider-scoped notes.  
3. **Product signals (later)** — low engagement on a freshly found listing is a **review hint**, never
   an auto-delete without evidence of factual error

---

## 9. Phased delivery

### Phase 0 — Plan + lesson seed (this change)

- This document
- `scripts/catalog-loop/lessons.json` seeded from §4
- Pointers from [`catalog-find-improve-loop.md`](catalog-find-improve-loop.md) and [`INDEX.md`](INDEX.md)

### Phase 1 — Observe + quality scorecard

- JSONL event writer from find/improve/watch
- Hourly rollup fields: lasting-public rate, skip histogram, false publishes
- Promote state/events path out of pure `/tmp` when the host is durable

### Phase 2 — Improve lane expansion

- Sessions + hard-contact lanes behind the same evidence filters
- Priority scheduler in `improve-cycle.cjs`

### Phase 3 — Feedback → lessons

- Operator feedback intake → `lessons.json` / seed `paused`
- Closed tag vocabulary; weekly digest script

### Phase 4 — Fixture regression pack

- Fixtures for address/phone/trial false positives
- Tier A auto-pause for repeated `http_blocked` on the same host (optional, bounded)

### Phase 5 — Host durability

- Start recipe that survives VM recycle (start script / ops doc)
- Event log retention and weekly digest delivery to the owner’s existing ops channel (no new board)

### Phase 6 — Recommendation self-improvement (existing cards)

- Deterministic audit opens recommendations **only for public-quality gaps** (`bad_address`, `blank_contacts`)
- Soft blanks (trial/sessions/price/age) stay on oldest-blank Improve rotation (not the recommendation queue)
- Improve consumes open enrichable recommendations first (priority by gap, least-attempted, retry cooldown), then oldest blanks
- Settle after each investigate: `resolved` / `resolved_priority` / `soft_deferred` / progress / exhausted
- Exhausted and resolved rows stay closed until cooldown or a priority gap returns; operator `wrong_address` / `wrong_phone` force-reopen
- Hourly scorecard + weekly digest track open/opened/closed counts
- Evidence-only unchanged — recommendations only name blanks Improve may try to fill from the official site

Each phase ships only when its verify step is green; volume KPIs must not rise by weakening gates.

---

## 10. Explicit non-goals

- Replacing Lite, OpenClaw, or researchandenrich with this loop  
- Loosening `curatedProviderSchema`, ImgBB, or E.164 to hit Find volume  
- Unsupervised “model fine-tuning” as the learning mechanism  
- A second GitHub project board or shadow tracker  
- Counting inventory-only (SI/Queens/birthday/disabled activity) upserts as public Find wins  

---

## 11. Definition of Done for this plan (when implementation catches up)

- [x] Event log + hourly quality fields exist and are referenced from the live ops doc  
- [x] Every §4 incident has a lesson entry and, where applicable, a fixture or gate  
- [x] Improve has ≥2 lanes beyond trial blanks  
- [x] Operator feedback can close into `lessons.json` or a seed pause without a code archaeology dig  
- [x] Lasting-public rate is reported every hour alongside volume KPIs  
- [x] Live-card audit writes recommendation records; Improve consumes and closes them evidence-only  

---

## 12. Related

- Live ops + volume KPIs: [`catalog-find-improve-loop.md`](catalog-find-improve-loop.md)  
- Business rule: `docs/business-rules.md` rule 415 (loop live) — implementation of this plan adds a
  follow-on rule when Phase 1 ships  
- Maintenance field priority: [`content-maintenance-agent-prompt.md`](content-maintenance-agent-prompt.md)  
- Soft-gap / Lite loop-health (parallel, not merged): [`soft-incomplete-fields.md`](soft-incomplete-fields.md)  
