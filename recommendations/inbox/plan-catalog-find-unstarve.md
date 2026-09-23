---
id: plan_catalog-find-unstarve-2026-09-23
environment: cursor
vertical: padel-africa
repo: moldovancsaba/management
jobs:
  - catalog:find
  - catalog:hygiene
  - catalog:about-curate
  - catalog:contact-enrich
priority: high
ssotLanding: jobs
doctrineOk: true
observedAt: 2026-09-23T16:40:00Z
status: shipped-2026-09-23
sources:
  - https://github.com/moldovancsaba/management/pull/227
---

# Plan — catalog:find + empty-tick unstarve

**Finding:** Cloud Agent about/media/quality/autopilot ticks returned empty while real gaps
remained (soft Abouts false-greened by locality bonus; contact fields outside those jobs; empty
`content_cards` queue so autopilot cannot invent venues).

**Shipped**

| Item | Contract |
| --- | --- |
| About bar | `ABOUT_QUALITY_TARGET = 75`; locality bonus capped — soft Abouts re-enter curate/quality |
| Contact | Hygiene `contact` pass + `catalog:contact-enrich` (headers / promotable sourceUrl only) |
| FIND | `catalog:find` — `--status` → research fixture → dry-run → seed (not NYC fair-use) |

**Live FIND proof (padel-africa Mongo):** `research-sen-ven-002` Dakar Padel Club, `research-sen-ven-003`
REBEL PADEL Sahm; `research-tza-ven-001`/`002` (Padel Centre TZ Slipway + The Hub Bwejuu);
`research-zmb-ven-003` Xtreme Padel Zambia; `research-lby-ven-002`/`003` (Zeyani Padel Zone +
Mendoza Club LY); `research-gnq-ven-002` Ukomba Sport Padel Club (Bata). Catalogue 150→158.
Continent map (`CONTINENT_BY_COUNTRY`) expanded to full UN M49 Africa set so ZM/GA/CD/LY/GQ label
on hygiene/backfill.

**About debt @70:** listings missing `venue.address.locality` scored length+tone+chrome=70 and could
not clear target 75. Fix: backfill address from evidence + curated recommendation Abouts; quality
store falls back to `territory.settlement` / `territory.country` when locality is nested.

**Dry-run checks**

```bash
npm run catalog:find -- --status
npm run catalog:find -- --fixture=scripts/data/senegal-padel-verified.json --dry-run
npm run catalog:about-curate -- --list
npm run catalog:hygiene -- --dry-run --passes contact
```

**Clarification (2026-09-23):** Content ticks do **not** need GDS. Pack load is only for optional
`listings_serving` refresh. `vertical pack unavailable … continuing without serving refresh` is
expected on incomplete Cloud Agent installs — not a content failure. Use `serving:reconcile` when
pack load works.

**Out of scope:** Ollama (unused on Cursor Cloud ticks); enabling `CURATOR_ENABLED` (ops).
