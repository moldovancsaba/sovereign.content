---
id: plan_sportolok-adoption-feedback-2026-09-23
environment: cursor
vertical: sportolok
repo: moldovancsaba/sovereign.content
jobs:
  - catalog:hygiene
  - catalog:media-curate
  - catalog:quality-loop
  - catalog:about-curate
  - catalog:autopilot
  - catalog:lessons
  - check:cron-cli-twins
priority: high
ssotLanding: jobs
doctrineOk: true
observedAt: 2026-09-23T14:10:00Z
shippedAt: 2026-09-23T14:40:00Z
status: shipped-engine-p1-p2-2026-09-23
companion: plan-sportolok-gate-feedback.md
---

# Evaluation — Sportolok “adoption ambiguity” feedback (2026-09-23)

**Source:** sportolok sovereign agent implementation feedback to Sovereign Content team
(confidence-threshold prototype vs canonical binary gate).

## Verdict

| Theme | Decision |
| --- | --- |
| Problem A — two autonomy models | **Accept (docs)** — Doctrine non-negotiable + Anti-patterns |
| Problem B — activityCompleteness not operationalized | **Accept (docs + engine)** — profiles in packs |
| Problem C — detect without remediate | **Accept (docs)** — closed-loop on Doctrine + Adopting |
| P0 remediation loop | **Already engine** — documented as mandatory day-one |
| P1 cron ↔ CLI twins | **Shipped** — `check:cron-cli-twins` + missing `catalog:*` wrappers (management PR #225) |
| P1 geographic gap promote | **Shipped** — additive boost on `popularityRank` only (`geographicGapBoost.ts`) |
| P2 Lesson schema + effects | **Shipped** — `SovereignLesson` with `suggest-config` \| `soften-required` \| `none` |
| Extending activityCompleteness with geo/media fields | **Defer** — geo=`real-address`, empty media already non-blocking |

## Engine landing

- management branch `cursor/pa-osm-continue-az-9e3d` / PR https://github.com/moldovancsaba/management/pull/225
- `src/lib/cron/cliTwins.ts`, `src/lib/servingModel/geographicGapBoost.ts`, `src/lib/reports/sovereignLessons.ts`
