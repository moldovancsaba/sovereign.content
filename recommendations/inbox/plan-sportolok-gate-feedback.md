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
revisedAt: 2026-09-23T13:25:00Z
status: evaluated-with-plan
companion: plan-classscout-rec-6-7-8.md
evidenceNote: 459 listings / 954 cards (sportolok live test, 2026-09-23)
revisionNote: Activity completeness is always-on for every vertical (incl. padel-africa) so tennis/squash can extend taxonomy without forking the gate.
---

# Evaluation + plan — Sportolok gate feedback (revised: unified activity gate)

**Companion:** ClassScout [#6](https://github.com/moldovancsaba/sovereign.content/issues/6)–[#8](https://github.com/moldovancsaba/sovereign.content/issues/8) →
[`plan-classscout-rec-6-7-8.md`](./plan-classscout-rec-6-7-8.md).

**Maintainer decision (revised 2026-09-23):** **partially helps**, with one doctrine upgrade —

> **Activity / taxonomy completeness profiles are a unified, always-on pack contract.**
> Every vertical (including padel-africa) declares them. Adding tennis or squash is new taxonomy
> keys + profiles — not a padel-only fork and not a sportolok-only optional knob.

Still **reject** a parallel `%` `autonomyThreshold` and Google/FB/IG as portable defaults.
Phases are technical, not calendar weeks.

---

## Revision: unified activity gate (always on)

### Why

Padel Africa already has a multi-activity taxonomy (`padel-club`, `indoor-court`, `outdoor-court`,
`coaching`, `tournaments`, `equipment-shop`). Treating “category gates” as sportolok-only would
force a second system the moment the catalogue adds `tennis-club` / `squash-club`. One gate reads
one pack table for every vertical.

### Contract (portable)

1. **Pack schema** (new, required with a safe default): `activityCompleteness` keyed by taxonomy
   slug, plus `activityCompletenessDefault` for unknown / multi-type fallback.
2. **Each profile** declares fields as `required` | `soft` | `ignored` for: `description` (min
   length), `schedule`, `price`, `geo`, `media` (min count), and optional pack-known extras that
   already exist on `Listing` / `researchFields` (never invent new catalogue claims without schema).
3. **`checkCompleteness` always** resolves the listing’s lead `activityTypes` slug (same lead rule
   as visuals) → profile → counts missing **required** vs **soft**. Same soft-incomplete rule as
   today: too many required gaps → blocker; a soft gap alone → pass with `soft_missing_*` /
   `REVIEW_READY` path as today.
4. **Binary gate stays.** Profiles replace “everything weighted 25%” with **declared hard vs soft
   per activity** — that is the real intent of sportolok’s weighted-gates ask, without a %
   auto-publish layer.
5. **Extending tennis/squash:** add taxonomy labels + `activityCompleteness` rows (often reuse a
   shared “court venue” profile). No gate rewrite.

### Padel-africa starter profiles (illustrative — evidence-tuned in Phase B)

| Taxonomy slug | required | soft | notes |
| --- | --- | --- | --- |
| `padel-club` / `indoor-court` / `outdoor-court` | description, geo | schedule, price, media | Court venues must be mappable |
| `coaching` | description | schedule, geo, price, media | Mobile coach may lack street geo |
| `tournaments` | description, schedule | geo, price, media | Event timing matters |
| `equipment-shop` | description, geo | schedule, price, media | Shop hours soft; map pin hard |
| *(future)* `tennis-club` / `squash-club` | same as court venue | same | Copy court profile |

Sportolok maps `edzoterem` / `tanfolyam` / `verseny` the same way in **its** pack — same engine path.

---

## How this maps to the real engine

| Feedback concept | Engine reality (unchanged facts) |
| --- | --- |
| 95% confidence auto-approve | Gate is **binary** `pass` / `blocker` / `flag`. No `autonomyThreshold` field exists. |
| Equal 25% gate weights | Today one soft-missing field is OK; two+ completeness gaps block. **Revision:** required vs soft come from **activity profile**, not equal field lists. |
| Auto-geocode Google Maps | Portable geo = **Nominatim** via `catalog:hygiene` (+ ClassScout #6 street gate). |
| Image scrape Places/FB/IG | `catalog:media-curate` OG → snapshot → R2/ImgBB/passthrough; #8 policy hook. |
| `publishConfidence` | Non-Goal; gate summary + future `toReachPublish[]` (activity-aware). |

---

## Verdict table (reconsidered end-to-end)

### Accept

| # | Feedback item | Revised shape |
| --- | --- | --- |
| A1 | Soft / optional images | **Per activity** via profile (`media: soft` on clubs; maybe harder on shops). Unified — not a padel exception. |
| A2 | Auto-geocode enrichment | Nominatim + #6 street gate; auto-apply when profile marks `geo: required` (or always when soft and high precision). |
| A3 | Confidence / “what to fix” | `toReachPublish[]` from verdicts **and** activity profile gaps (“tournament needs schedule”). Still not a fake %. |
| A4 | Category-specific gates | **Upgrade → always-on unified `activityCompleteness` for every pack including padel-africa.** |
| A5 | Escalation routing | Filter REVIEW_READY by blocker family **and** lead activity slug. |
| A6 | Learn from overrides | Suggestions keyed by activity slug where evidence supports it. |

### Accept with care

| # | Item | Care |
| --- | --- | --- |
| B1 | Weighted dimensions | OK for **quality-loop / scarcity** scores, optionally per activity. **Never** replace territory/safety/knowledge blockers. |
| B2 | Geographic priority boost | Sportolok delivery/scarcity rulebook — not the publish gate. |
| B3 | Batch modes | Name ops modes over dry-run / ticks / force-publish soft blockers. |

### Reject (still)

| # | Item | Why not |
| --- | --- | --- |
| R1 | Pack float `autonomyThreshold` 0.75 auto-publish | Invents a second authority; bypasses blockers. Activity profiles + soft-incomplete are the unified answer. |
| R2 | Four equal/weighted % scores that auto-approve at 75% | Same. Hard vs soft per activity is the portable substitute. |
| R3 | Google Maps / Facebook / Instagram as portable enrichment | Nominatim + website OG. Optional vertical secrets only. |
| R4 | Free-form `requiresInstructor` / `requiresRegistration` without schema | Only pack-declared fields that exist on Listing/researchFields. |
| R5 | A/B + real-time dashboard as process SSOT | Defer product/ops UI. |
| R6 | Week/month roadmap | Technical phases only. |

---

## Phased implementation

### Phase S0 — SSOT

1. This revised plan + Jobs: document **activity completeness** as always-on pack contract.
2. Autonomy model stays binary gate + soft-incomplete; profiles define hard/soft.
3. Cross-link #6 / #8.

### Phase S1 — Engine (`management`) — unified activity completeness

1. Add `activityCompleteness` (+ default) to `VerticalPackSchema`; validate keys ⊆ `taxonomy`.
2. Change `checkCompleteness(listing, pack)` to resolve lead activity → profile → required/soft.
3. Ship **padel-africa** profiles for all current taxonomy slugs (table above) on day one.
4. Ship **sportolok** profiles for existing sportolok taxonomy (same API).
5. `toReachPublish` + review queue filters include activity slug (A3, A5).
6. Hygiene Nominatim auto-apply after #6 street gate (A2).
7. Media-curate policy (#8) remains vertical default; profile may only say media soft/required for **gate**, not scrape source.

### Phase S2 — Multi-activity growth

1. Document “add tennis/squash” = taxonomy + visuals + activityCompleteness row (reuse court profile).
2. Optional quality-loop dimension weights per activity (B1).
3. Sportolok geographic scarcity boost (B2) stays vertical rulebook.

### Phase S3 — Learning

1. Override → suggestion digest keyed by activity when counts allow (A6).
2. Human accepts config changes — no auto float.

---

## Reconsider of prior “sportolok-only” wording

| Earlier plan text | Now |
| --- | --- |
| A4 optional; edzésterem only in sportolok pack | **Always-on**; padel ships profiles immediately |
| Soft images as vertical packing choice | Soft/required **per activity profile**, every vertical |
| Phase S2 “sportolok first” for category gates | Phase S1 **engine + padel + sportolok together** |

ClassScout #6–#8 plans unchanged in substance; #6 street gate feeds geo for activities that require it; #8 media policy stays vertical-level scrape policy (orthogonal to profile `media: soft|required`).

---

## Expected effect

REVIEW_READY shrinks when geo/media/schedule match **what that activity actually needs**, without
lowering safety/territory blockers. Adding tennis/squash later does not reopen the gate design.

---

## Doctrine check

- [x] Does not invent venues, amenities, prices, or court counts
- [x] Keeps catalogue content out of SSOT git
- [x] Fits `catalog:*` + pack vocabulary (taxonomy-keyed completeness; no % autonomy dialect)
- [x] Unified across verticals — padel now, tennis/squash by extension
