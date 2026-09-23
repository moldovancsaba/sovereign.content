---
id: plan_sportolok-gate-feedback-2026-09-23
environment: cursor
vertical: sportolok
repo: moldovancsaba/management
jobs:
  - catalog:autopilot
  - catalog:hygiene
  - catalog:media-curate
  - catalog:quality-loop
priority: high
ssotLanding: jobs
doctrineOk: true
observedAt: 2026-09-23T13:20:00Z
status: evaluated-with-plan
companion: plan-classscout-rec-6-7-8.md
evidenceNote: 459 listings / 954 cards (sportolok live test, 2026-09-23)
---

# Evaluation + plan — Sportolok gate / autonomy feedback

**Companion:** ClassScout findings [#6](https://github.com/moldovancsaba/sovereign.content/issues/6)–[#8](https://github.com/moldovancsaba/sovereign.content/issues/8) →
[`plan-classscout-rec-6-7-8.md`](./plan-classscout-rec-6-7-8.md).

**Source:** Sportolok Improve/Find / publish-queue test (459 listings, 954 content cards). Feedback
proposed `sovereignAgent.autonomyThreshold`, weighted `%` quality gates, Google/FB/IG enrichment,
category gates, confidence explanations, escalation routing, batch modes, learning analytics, geo
priority, review UI, dashboard, A/B.

**Maintainer decision:** **partially helps**. Keep what maps onto the existing publish-now-enrich-later
gate and `catalog:*` jobs. **Reject** a parallel percentage-autonomy layer that bypasses blockers, and
**reject** Google/FB/IG as portable defaults. No calendar “week/month” estimates — phases below.

---

## How this maps to the real engine

The feedback’s `verticals/sportolok/index.ts` `sovereignAgent.autonomyThreshold: 0.95` **does not
exist** in `management` today. What *does* exist:

| Feedback concept | Engine reality |
| --- | --- |
| 95% confidence auto-approve | Gate is **binary** `pass` / `blocker` / `flag` (`publishGate/gate.ts`). Gate-clean → publish; soft-incomplete → `REVIEW_READY` with a real listing. |
| Equal 25% gate weights | Completeness already allows **one** soft-missing field (`soft_missing_*`); two+ → `too_incomplete` blocker. Media is in `RECOVERABLE_BLOCKER_FAMILIES`. |
| Auto-geocode Google Maps | `catalog:hygiene` geo pass uses **Nominatim** (no Google key in Cloud Agent ticks). |
| Image scrape Places/FB/IG | `catalog:media-curate` uses website OG → page snapshot → R2/ImgBB/passthrough. ClassScout #8 needs `generated_art_only`. |
| `publishConfidence` tier | Explicit **Non-Goal** in review console; gate summary (`N blocking · N flagged · N passed`) is the stand-in. |

So “lower threshold to 0.75” is **not** a one-line pack edit — it would invent a second publish
authority beside the gate. That is the wrong fix for a full REVIEW_READY queue.

---

## Verdict table

### Accept (helps portable system + sportolok/padel)

| # | Feedback item | Why it helps | Implementation shape |
| --- | --- | --- | --- |
| A1 | Soft / optional images | Already recoverable; making “images soft, description/schedule harder” explicit speeds publish-now-enrich-later without inventing venues | Document on Jobs; optionally treat empty media as `flag` not blocker when description+geo+schedule present (vertical packing) |
| A2 | Auto-geocode enrichment | Sportolok 76 missing-geo case; padel hygiene still has unresolved geo | Nominatim only in portable contract; street-level gate from ClassScout #6 before spend; auto-apply when precision ≥ street and in-territory |
| A3 | Actionable “why not publish / how to fix” | Staff stuck on opaque “50%” | Derive `toReachPublish[]` from verdict `reasonCode`s + `RECOVERABLE_BLOCKER_FAMILIES` on review packet / review UI — **not** a fake % confidence |
| A4 | Category / taxonomy-specific completeness | Gym vs course vs competition (sportolok); padel mostly one noun | Optional pack extension: completeness thresholds per `activityTypes` key — vertical owns table |
| A5 | Escalation by blocker family | One fat REVIEW_READY queue | Filter/tag review queue by family (`media-readiness`, `completeness`, `real-address`, `safety`) — same store, better routing |
| A6 | Learn from staff overrides | Improves thresholds over time | Encode override patterns into quality lessons / knowledge (`catalog:quality-encode` + review outcomes) — evidence, not invented rules |

### Accept with care (vertical-only or quality-score only)

| # | Item | Care |
| --- | --- | --- |
| B1 | Weighted dimensions | OK for **quality-loop About scoring** and scarcity/recommend weights. **Not** for replacing publish-gate blockers (territory, safety, knowledge, placeholder name stay hard). |
| B2 | Geographic priority boost | Valid as sportolok **delivery/scarcity** rule (coverage gaps). Not a publish-gate change; keep out of portable doctrine unless generalized as scarcity rulebook knobs. |
| B3 | Batch / bulk-import mode | Aligns with existing `--dry-run` / bounded ticks / force-publish soft blockers. Name modes in ops docs; do not invent a second state machine. |

### Reject (does not help portable doctrine — or harms it)

| # | Item | Why not |
| --- | --- | --- |
| R1 | `autonomyThreshold` 0.95 → 0.75 as a pack float that auto-publishes | No such field; a % layer that ignores blockers risks territory/safety leaks. Use soft-incomplete + staff `publish` override + recoverable families instead. |
| R2 | Replace gate with four equal/weighted % scores that auto-approve at 75% | Same risk. Completeness already softens; keep blockers binary. |
| R3 | Default enrichment via Google Maps / Facebook / Instagram | Portable Cloud ticks: Nominatim + website OG. Paid Places / social scrape are optional vertical secrets and conflict with ClassScout `generated_art_only`. |
| R4 | Invent new required fields (`requiresInstructor`, `requiresRegistration`) without pack schema | Add fields only through vertical entity/schema — not as free-form gate config that invents catalogue claims. |
| R5 | A/B framework + real-time ops dashboard as SSOT process | Product/ops UI — valuable later; not process-contract blockers. Defer outside this plan. |
| R6 | Calendar “Week 1 / Month 2” roadmap | Agents use technical phases, not day/week estimates. |

---

## Phased implementation (add alongside ClassScout #6–#8)

### Phase S0 — SSOT (this repo)

1. Publish this evaluation on Recommendations + link from Jobs (completeness / media soft policy).
2. Clarify: **publish gate stays binary**; soft-incomplete and recoverable families are the autonomy model.
3. Cross-link ClassScout #8 (media policy) and #6 (street gate before geo spend).

### Phase S1 — Engine (`management`) — high value, low doctrine risk

1. **Review packet / review UI:** `toReachPublish` list from blockers/flags (A3).
2. **Queue filters** by `RECOVERABLE_BLOCKER_FAMILIES` + `real-address` (A5).
3. **Hygiene:** after #6 street gate, auto-apply Nominatim street hits in-territory (A2). Do not add Google.
4. **Media:** keep padel `allow_og_scrape`; sportolok may set soft-images / later `generated_art_only` if product requires (A1 + #8).

### Phase S2 — Vertical pack knobs (sportolok first)

1. Optional per-`activityTypes` completeness table in pack (A4) — edzésterem / tanfolyam / verseny live **only** in sportolok pack, not in padel.
2. Scarcity / delivery geographic boost as sportolok rulebook config (B2) — not publish gate.
3. Quality-loop dimension weights for About scoring (B1) — separate from gate.

### Phase S3 — Learning loop

1. Aggregate review-outcome overrides → configuration suggestions in digest / quality-encode (A6).
2. No automatic threshold float without human accept of the suggestion.

---

## Expected effect (honest)

Sportolok’s “0% approval / 100% escalate” likely means **cards never become gate-clean**, not that a
hidden 0.95 float is failing. Fixing geo (Nominatim + street vocabulary) and soft-media + clearer
review actions should shrink REVIEW_READY without lowering safety. If after S1 the queue is still
blocked mostly on **safety/knowledge/territory**, that is correct refusal — not a threshold bug.

---

## Doctrine check

- [x] Does not invent venues, amenities, prices, or court counts
- [x] Keeps catalogue content out of SSOT git
- [x] Fits `catalog:*` + existing gate vocabulary (extends; does not fork a % autonomy dialect)
