---
id: plan_classscout-recs-6-21-2026-09-23
environment: cursor
vertical: padel-africa
repo: moldovancsaba/sovereign.content
jobs:
  - catalog:about-curate
  - catalog:hygiene
  - catalog:media-curate
  - catalog:autopilot
  - catalog:quality-loop
priority: high
ssotLanding: jobs
doctrineOk: true
observedAt: 2026-09-23T15:10:00Z
status: accepted-partial-ship
sources:
  - https://github.com/moldovancsaba/sovereign.content/issues/6
  - https://github.com/moldovancsaba/sovereign.content/issues/7
  - https://github.com/moldovancsaba/sovereign.content/issues/8
  - https://github.com/moldovancsaba/sovereign.content/issues/10
  - https://github.com/moldovancsaba/sovereign.content/issues/11
  - https://github.com/moldovancsaba/sovereign.content/issues/12
  - https://github.com/moldovancsaba/sovereign.content/issues/13
  - https://github.com/moldovancsaba/sovereign.content/issues/15
  - https://github.com/moldovancsaba/sovereign.content/issues/16
  - https://github.com/moldovancsaba/sovereign.content/issues/17
  - https://github.com/moldovancsaba/sovereign.content/issues/18
  - https://github.com/moldovancsaba/sovereign.content/issues/19
  - https://github.com/moldovancsaba/sovereign.content/issues/20
  - https://github.com/moldovancsaba/sovereign.content/issues/21
---

# Evaluation — ClassScout recommendations #6–#8, #10–#21

**Maintainer posture:** absorb **portable contracts** into Jobs / Cursor / adopting. Code in
`management` where SC owns the job. Do **not** re-implement ClassScout’s NYC Find/Improve forever
loop or fair-use feeder.

Companion: [`plan-classscout-rec-6-7-8.md`](./plan-classscout-rec-6-7-8.md) (Phase B already shipped
street/chrome + media policy on management).

## Verdict table

| # | Topic | Helps? | Action |
| --- | --- | --- | --- |
| 6 | Street + chrome detectors | **Yes** | **Shipped** engine + Jobs contract |
| 7 | `catalog:*` alias twins | **Yes (docs)** | Adopting / Cursor pointer to ClassScout alignment |
| 8 | `generated_art_only` media policy | **Yes** | **Shipped** (`--policy`); padel default scrape |
| 10 | Deep enrich before street gate; page > seed | **Yes** | Jobs/autopilot contract (binding for Find ports) |
| 11 | within-doc `sourceUrls` dedupe + false-dupe revive | **Yes** | Jobs/autopilot contract |
| 12 | quality-loop recommend-first + settle + prefer-lane | **Yes (mapped)** | Jobs: map to open/applied/skipped/failed; soft blanks stay soft |
| 13 | Hygiene must close Mongo and exit | **Yes** | Jobs note + `catalog:hygiene` `finally` close |
| 15 | Neighborhood→region + outside-market hide | **Yes (portable)** | Jobs: pack `territoryScope` / ladder — no NYC borough map |
| 16 | Never invent default age buckets | **Yes** | Jobs: empty = not confirmed; Improve fills from pages only |
| 17 | Placeholder / contaminated contacts | **Yes** | Jobs + `contactReject.ts` at structured extract |
| 18 | Martial Arts vs Multi-Sport | **Defer** | Padel has no martial family; optional for multi-sport verticals |
| 19 | Partner venues vs Comes to you | **Yes** | **Fixed** `venueFact` labels |
| 20 | Weak-About quarantine + strong-identity dupe | **Partial** | Chrome patterns shipped; dupe-hide heuristic documented |
| 21 | Direct-Mongo repair schema-subset only | **Yes** | Jobs: repair notes in script report, never `$set` audit keys |

## Declined / out of scope

- NYC fair-use feeder, ClassScout `forever.sh` as-is, borough-only neighborhood maps as portable defaults.
- #18 collective Martial Arts mark until a vertical declares martial-family taxonomy.

## Acceptance criteria (vertical dry-run)

```bash
npm run catalog:hygiene -- --dry-run --passes geo --limit 3   # exits <30s
npm run catalog:media-curate -- --dry-run --policy generated_art_only
npm run catalog:about-curate -- --dry-run --limit 5
npm run catalog:quality-loop -- --dry-run --score-limit 20
# host_sites card must NOT read “Comes to you”
```

Engine landing: management PR https://github.com/moldovancsaba/management/pull/225
