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
REBEL PADEL Sahm. Catalogue 150→152.

**Dry-run checks**

```bash
npm run catalog:find -- --status
npm run catalog:find -- --fixture=scripts/data/senegal-padel-verified.json --dry-run
npm run catalog:about-curate -- --list
npm run catalog:hygiene -- --dry-run --passes contact
```

**Out of scope:** Ollama (unused on Cursor Cloud ticks); enabling `CURATOR_ENABLED` (ops).
