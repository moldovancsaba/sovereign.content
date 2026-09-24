---
id: plan_classscout-twin-orchestration-2026-09-24
environment: cursor
vertical: classscout
repo: moldovancsaba/sovereign.content
jobs:
  - catalog:self-heal
  - catalog:about-curate
  - catalog:quality-loop
  - catalog:find
  - catalog:archive-snapshot
  - serving:reconcile
  - check:cron-cli-twins
priority: high
ssotLanding: jobs
doctrineOk: true
observedAt: 2026-09-24T16:20:00Z
status: accepted-docs-2026-09-24
sources:
  - https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/classscout-sovereign-twin.md
  - https://github.com/moldovancsaba/classscout/blob/main/docs/sovereign-content-alignment.md
  - https://sovereigncontent.messmass.com/jobs
---

# Plan — ClassScout dense-US twin orchestration (2026-09-24)

Status: **accepted (docs / process)** — implement on ClassScout without merging engines.

## Intent

Keep ClassScout’s product defaults (forever Find, borough integrity, `generated_art_only`).
Export **orchestration** proved on Padel Africa / SC Jobs so forever thrashing and About debt
do not starve quality.

## Do not merge

| Keep ClassScout-local | Adopt from SC / padel |
| --- | --- |
| `catalog-loop:forever` / fair-use seed queue | `catalog:self-heal` (pause Find when About debt hot; surface `openOperatorFeedback`) |
| `generated_art_only` media default | About quality bar ~75; locality name-drop alone ≠ pass |
| Multi-city ↔ borough integrity / mis-geo hide | `serving:reconcile` after about/media/quality |
| Strict ingest / E.164 product gate | `catalog:archive-snapshot`; contact enrich hygiene |
| Client-feedback P0/P1 depth beyond SC chrome | `--until-found` as **complement** when seed queue idles |
| | `check:cron-cli-twins` |

## Agent posture (ClassScout)

1. Read SC Jobs + Cursor + management `docs/padel-africa-jobs.md` + `classscout-sovereign-twin.md`.
2. Keep forever + `generated_art_only`.
3. Implement the adopt list with dry-run → write → timer.
4. File new portable contracts as `agent-recommendation` Issues on `sovereign.content`.
5. Refresh `docs/sovereign-content-alignment.md` when twins land.

## SSOT surfaces shipped this plan

- `/jobs` — Dense-US twin table + self-heal `openOperatorFeedback`
- `/environments/cursor` — Cross-vertical ClassScout twins
- `/adopting` — dense-US twin pointer
- `/implement` — twin note under quality stack
- `/whats-new` — 2026-09-24 twin entry
- management `docs/classscout-sovereign-twin.md`

## Acceptance

- ClassScout agent can name keep vs adopt without proposing an engine merge.
- Alignment doc links to SC Jobs Dense-US twin + padel twin knowledge.
- No NYC fair-use / forever loop copied into padel as default growth.
