# Padel Africa fair-use multi-source feeder

**Status:** LIVE ops helper in `content.padelafrica/`  
**Model:** ClassScout `rqk-fair-use` doctrine, **Africa directories**, ingest-only end state  
**Not:** NYC source registry, forever thrash, or Mongo writes

## What it does

Walks every configured padel directory / booking discovery source, takes **at most one HTTP
page per source per pass**, harvests club-detail URLs into a per-source queue, and when a
detail/inbox page yields facts, appends a **`needs_verify` candidate** under
`scripts/fair-use/data/candidates.json`.

Directories are **citation / discovery paths only**. The Find/ingest target is the **official
club website** when extracted. Agents confirm the evidence bar, then promote into
`scripts/data/*-padel-verified.json` and apply via `ingest/` — never invent phones/emails.

## Sources

See [`sources.json`](./sources.json) — aligned with the continent FIND playbook:

| Id | Site | Notes |
| --- | --- | --- |
| `padellands` | padellands.com `otros-paises/*` | Country indices; club cards often JS — use citation inbox when harvest=0 |
| `analistas` | analistaspadel.com | Expansion coverage |
| `padel-without-borders` | padelwithoutborders.com | Country overviews |
| `ballejaune` | ballejaune.com | Francophone booking |
| `playtomic` | playtomic.com / .io | SPA may soft-skip |
| `matchpoint` | matchpoint.com.es | Booking microsites |
| `padel-maroc` | padel.co.ma annuaire | Morocco directory |
| `actu-padel` | actu-padel.com `/directory/padel-club/` | Strong club-card harvest (proved 2026-09-25) |

Override: `FAIR_USE_SOURCES=padellands,ballejaune,padel-maroc` or `FAIR_USE_ONLY=padellands`.

## Binding rules

1. **One page per source per pass.** Inbox snapshot **or** one queued detail **or** one discovery harvest — never more than one HTTP request to that source in the same pass.
2. **≥ `FAIR_USE_INTER_SOURCE_SEC` (default 45)** between sources inside a pass.
3. Per-source **`cooldownSec`** in `sources.json` (default 600). Sources still cooling are skipped (no HTTP).
4. **User-Agent:** `PadelAfricaCatalogResearch/1.0 (+https://padel-africa.doneisbetter.com; fair-use one-lead research)`.
5. **Extract facts only.** Do not paste directory narrative into listing About.
6. **Attribution:** every candidate records `researchSources` naming the citation page.
7. **Confirm on the official site** before treating contacts as verified; status stays `needs_verify` until then.
8. Reject hubs / one-offs / guide titles (`guide_or_hub_name`, `one_off_event`).
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
FAIR_USE_ONLY=padellands npm run fair-use:one-pass

# Offline extract unit check
npm run fair-use:test

# CF soft-skip: drop a WebFetch citation into inbox, then one-lead
npx tsx scripts/fair-use/citation-to-inbox.ts \
  --source padellands --name lead --url "https://…" --file /tmp/page.html
FAIR_USE_ONLY=padellands npm run fair-use:one-pass
```

## Tick wiring (`padel-find-tick`)

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
2. Confirm street/locality + contact **or** booking/first-party URL on the official site.
3. Append a row to the country `scripts/data/<country>-padel-verified.json` fixture.
4. Apply via `ingest/client.ts` / `apply-pending-ingest-queue.ts` (DISCOVERED). Never Mongo-apply.

## Related

- [`docs/padel-africa-find-continent-plan.md`](../../docs/padel-africa-find-continent-plan.md)
- [`docs/padel-africa-jobs.md`](../../docs/padel-africa-jobs.md)
- ClassScout twin (doctrine only): `content.classscout/scripts/rqk-fair-use/README.md`
