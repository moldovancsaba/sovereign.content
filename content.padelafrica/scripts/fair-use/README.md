# Padel Africa fair-use multi-source feeder

**Status:** LIVE ops helper in `content.padelafrica/`  
**Model:** ClassScout `rqk-fair-use` doctrine, **Africa-first directories**, ingest-only end state  
**Not:** NYC source registry, EU/US densify thrash, or Mongo writes

## What it does

Walks every configured padel directory / booking discovery source, takes **at most one HTTP
page per source per pass**, harvests club-detail URLs into a per-source queue, and when a
detail/inbox page yields facts, appends a **`needs_verify` candidate** under
`scripts/fair-use/data/candidates.json`.

Directories are **citation / discovery paths only**. The Find/ingest target is the **official
club website** (or booking page) when extracted. Agents confirm the evidence bar, then promote
into `scripts/data/*-padel-verified.json` and apply via `ingest/` using
[`docs/LISTING-STANDARDS.md`](../../docs/LISTING-STANDARDS.md) — never invent phones/emails.

## Sources (Africa-first, 2026-10-13)

See [`sources.json`](./sources.json) (**18** sources). Dropped EU/US OOS noise (USPA, Padel Browser,
UK/FR magazines, MATCHi, Bounce, shop directories). Added **CourtPro**, **Playtomic directory**,
**APC**, and expanded **PadelRevive** / **padellands** / **ballejaune** country pages.

### Core Africa FIND playbook

| Id | Site | Notes |
| --- | --- | --- |
| `padelrevive` | padelrevive.com Africa atlas + CSV | Primary continent map (~337 venues) |
| `padellands` | padellands.com `otros-paises/*` | Country indices; JS cards → citation inbox |
| `courtpro` | courtpro.com/clubs/{country} | Booking SaaS Africa club pages |
| `playtomic-directory` | directory.playtomic.io/{country} | Static country guides → bookable clubs |
| `playtomic` | playtomic.com/io clubs | SPA may soft-skip |
| `ballejaune` | ballejaune.com | Francophone booking |
| `actu-padel` | actu-padel.com directory | Club-card harvest |
| `padel-maroc` | padel.co.ma annuaire | Morocco |
| `findapadelcourt-za` | findapadelcourt.co.za | ZA only — do not starve sparse countries |
| `africapadel` | africapadel.com | SA operator network |
| `padelafrica-apc` | padelafrica.com | Confederation / tournament hosts |
| `analistas` / `padel-without-borders` | news + expansion | Operator names |
| `padelmap` | padelmap.net Africa courts | Dropped non-Africa pages |
| `matchpoint` | matchpoint.com.es | SN microsites; soft-skip EU-only |
| `padel-llc` | padel.llc | OSM corroboration |
| `padelfip` / `premierpadel` | tour calendars | Host venue leads |

Override: `FAIR_USE_SOURCES=padelrevive,courtpro,actu-padel` or `FAIR_USE_ONLY=padelrevive`.

## Binding rules

1. **One page per source per pass.** Inbox snapshot **or** one queued detail **or** one discovery harvest — never more than one HTTP request to that source in the same pass.
2. **≥ `FAIR_USE_INTER_SOURCE_SEC` (default 45)** between sources inside a pass.
3. Per-source **`cooldownSec`** in `sources.json` (default 600). Sources still cooling are skipped (no HTTP).
4. **User-Agent:** `PadelAfricaCatalogResearch/1.0 (+https://padel-africa.doneisbetter.com; fair-use one-lead research)`.
5. **Extract facts only.** Do not paste directory narrative into listing About.
6. **Attribution:** every candidate records `researchSources` naming the citation page.
7. **Confirm on the official site** before treating contacts as verified; status stays `needs_verify` until then. Phone is optional; missing street → city-level line1 + OSM city pin.
8. Reject hubs / one-offs / guide titles (`guide_or_hub_name`, `one_off_event`). Reject leads outside Africa (OOS).
9. Emit `fair_use_attempt` / `fair_use_reject` / `fair_use_seed` into `data/events.jsonl`.
10. Cloudflare / 403 / 429 → **soft skip** — do not bypass. Use citation inbox when live fetch is blocked.
11. **No Mongo.** No forever loop as the default growth engine (sparse continent stays `--until-found`).

## Commands

```bash
# Registry + pending only (no HTTP)
npm run fair-use:status
npm run fair-use:one-pass -- --dry-run

# One polite multi-source pass
npm run fair-use:one-pass

# Single source
FAIR_USE_ONLY=padelrevive npm run fair-use:one-pass

# Offline extract unit check
npm run fair-use:test

# CF soft-skip: drop a WebFetch citation into inbox, then one-lead
npx tsx scripts/fair-use/citation-to-inbox.ts \
  --source padelrevive --name lead --url "https://…" --file /tmp/page.html
FAIR_USE_ONLY=padelrevive npm run fair-use:one-pass
```

## Tick wiring (`padel-find-tick`)

Orchestrator phases: **discover → enrich → maintain → publish-via-ingest**
([`timers/orchestrator.md`](../../timers/orchestrator.md)).

When the hourly tick’s FIND seed path is empty (no pending verified fixture / no live apply
queue row), run **one** `fair-use:one-pass` to replenish `needs_verify` candidates, then
continue `--until-found` WebSearch as usual. Do **not** replace until-found with a forever fair-use loop.

## State (gitignored)

`scripts/fair-use/data/` (matches `content.padelafrica/**/data/` gitignore):

- `state.json` — per-source queue, done detail URLs, discovery cursor, cooldowns
- `candidates.json` — `needs_verify` research candidates
- `events.jsonl` — attempt/reject/seed log
- `inbox/<sourceId>/*.html` (+ optional `.json` `{ "url": "…" }`)

## Promote to ingest

1. Pick a candidate from `fair-use:status`.
2. Confirm evidence bar: named venue + (street **or** city-level line1 with OSM city pin). **Phone/email are optional.** Official **WhatsApp / Instagram / Facebook / X.com** count as contact (same grade as phone) — http(s) URLs only; bare WhatsApp numbers → `https://wa.me/<digits>`. Prefer booking/first-party URL; directory citation + city pin is enough to seed and improve later.
3. Append a row to the country `scripts/data/<country>-padel-verified.json` fixture (include `instagram` / `facebook` / `whatsapp` / `twitter` when found).
4. Apply via `ingest/buildStructuredSourceText` + `ingest/client.ts` (DISCOVERED). Never Mongo-apply. Never claim PUBLISHED.

## Related

- [`docs/LISTING-STANDARDS.md`](../../docs/LISTING-STANDARDS.md)
- [`docs/padel-africa-find-continent-plan.md`](../../docs/padel-africa-find-continent-plan.md)
- [`docs/padel-africa-jobs.md`](../../docs/padel-africa-jobs.md)
- ClassScout twin (doctrine only): `content.classscout/scripts/rqk-fair-use/README.md`
