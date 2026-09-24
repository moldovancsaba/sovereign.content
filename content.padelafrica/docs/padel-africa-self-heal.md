# Sovereign self-heal — closed loop for padel-africa

Roadmap delivery for a catalogue that **detects debt → recommends → applies safe fixes →
encodes lessons → discovers only when healthy**. Never invents phones, emails, ages, or venues.

## What shipped

| Piece | Behaviour |
| --- | --- |
| **Unified debt kinds** | `contact_gap`, `media_thin`, `geo_weak`, `research_needed` join About kinds in `listing_quality_recommendations` |
| **Debt intake** | `catalog:contact-enrich` (and `catalog:self-heal --ingest-contact`) open recs on `no_evidence` |
| **Operator feedback** | `--status` reports `openOperatorFeedback` (`/stats` card notes); instruct `catalog:quality-loop` — never paste the note into About |
| **Research briefs** | `catalog:self-heal --brief` — FIND-style agent brief for the next evidence-wall listing |
| **Lesson steer** | Encoded `listing_quality_lessons` → `preferredTacticOrder` on status/improve **summary** (observational today — apply path is still chrome → curated-if-present → compose; wiring tactic order is Phase 1) |
| **FIND bind** | `catalog:find --until-found` **defers** when open About ≥3 (research gaps stay parallel via `--brief`) |
| **Process lessons** | `scripts/data/padel-africa-process-lessons.json` — ops residue (evidence_wall, defer_find, …) |
| **Smart digest + HiTL** | `--digest` builds situation→evidence→analysis→recommendation items; classifies `auto` / `agent_execute` / `hitl_review` |

## CLI

```bash
npm run catalog:self-heal -- --status
npm run catalog:self-heal -- --digest
npm run catalog:self-heal -- --brief
npm run catalog:self-heal -- --ingest-contact --limit 40
npm run catalog:self-heal -- --record-process --job=catalog:find --kind=success --message="seeded EG Hurghada"
```

## Agent tick policy

1. Prefer `catalog:self-heal --digest` when deciding work — report with **executiveBrief** + per-item analysis (not counters only).
2. Run `autoCommands` without asking; execute `agent_execute` only with evidence bar.
3. Surface `hitlQueue` to the operator and **wait** (SSOT drafts, product-intent notes, thin seeds, policy).
4. Open About → `about-curate` then `quality-loop`.
5. Open research → `--brief` with WebSearch; never invent.
6. When debt is clear → `catalog:find --until-found`.

## Honesty bar

Same as FIND: evidence on a public page, or leave the gap. Process lessons record the wall;
they do not authorize guesses.

## Related

- [`padel-africa-self-heal-hitl.md`](padel-africa-self-heal-hitl.md) — delivery matrix + smart report contract
- [`padel-africa-self-heal-feedback-audit-2026-09-24.md`](padel-africa-self-heal-feedback-audit-2026-09-24.md) — what feedback is collected, what consumes it, gaps
- SSOT improve plan: https://sovereigncontent.messmass.com/recommendations (inbox `plan-sovereign-self-improve-loop.md`)
- [`padel-africa-jobs.md`](padel-africa-jobs.md) — worked tick examples
- [`classscout-sovereign-twin.md`](classscout-sovereign-twin.md) — dense-US twin adopt list
- [`listing-quality-loop.md`](listing-quality-loop.md) — About score → improve → encode
- [`padel-africa-find-continent-plan.md`](padel-africa-find-continent-plan.md) — until-found campaign
- `src/lib/catalogSelfHeal/` — implementation

## Contact debt hygiene

Debt intake skips listings that already have phone/website/email on the published
card. Open `contact_gap` rows that already had contact were closed as skipped
(self-heal 2026-09-24); Padel Factory Agadir was filled from the first-party site.
