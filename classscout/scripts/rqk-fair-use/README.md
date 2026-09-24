# Fair-use multi-source research feeder

**Status:** LIVE ops helper for this environment.  
**Pace:** **one HTTP request per source per pass**, then sleep (default 5 minutes) before the next pass.  
**Inter-source delay:** 45 seconds (configurable) so a full walk stays polite.

## What this is

A polite research feeder that walks **every configured classified / family-media source** (RQK plus peers),
takes **at most one page** from each source in a pass, records facts needed for a ClassScout seed, and
prefers the **provider’s own website** as the Find target. Directory sites are **citation / discovery
paths**, not content to bulk-copy.

## Sources (default enabled)

| Id | Site |
| --- | --- |
| `rqk` | https://www.raisingqueenskids.com |
| `mommy-poppins` | https://mommypoppins.com |
| `sprout` | https://sproutnyc.com |
| `kidclick` | https://www.kidclick.com |
| `activity-hero` | https://www.activityhero.com |
| `brooklyn-bridge-parents` | https://brooklynbridgeparents.com |
| `park-slope-parents` | https://www.parkslopeparents.com |
| `beakid` | https://beakid.com |
| `amazinkids` | https://amazinkids.com |
| `new-york-loves-kids` | https://newyorkloveskids.com |
| `timeout-ny-kids` | https://www.timeout.com/new-york-kids |
| `tinyout` | https://tinyout.com |
| `macaroni-kid-brooklyn-nw` | https://brooklynnw.macaronikid.com |
| `uptown-family-calendar` | https://www.uptownfamilycalendar.com |
| `beyond-camps` | https://beyondcamps.com |
| `classcub-swim-nyc` | https://classcub.com (swim) |
| `discover-dycd` | https://discoverdycd.dycdconnect.nyc |
| `ymca-nyc` | https://ymcanyc.org |
| `nyc-parks-recreation` | https://www.nycgovparks.org |
| `new-york-family-directory` | https://www.newyorkfamily.com |
| `aces-guide` | NYC DOE ACES Guide |
| `campmatch-ny` | https://campmatch.com |
| `kids-out-and-about-queens` | https://queens.kidsoutandabout.com |
| `growing-up-nyc` | https://growingupnyc.cityofnewyork.us |
| `goldfish-swim-locations` | https://goldfishswimschool.com |
| `little-gym-ny` | https://www.thelittlegym.com |
| `soccer-stars-nyc` | https://www.soccerstars.com |
| `brooklyn-arbor-directory` | https://www.brooklynarbor.org |
| `jcc-manhattan-programs` | https://mmjccm.org |
| `asphalt-green` | https://www.asphaltgreen.org |
| `classcub-nyc-categories` | https://classcub.com (other categories) |

Research scored the 2026-09-21 additions in
[`docs/reports/fair-use-additional-sources-research-2026-09-21.md`](../../../docs/reports/fair-use-additional-sources-research-2026-09-21.md).

Override with `FAIR_USE_SOURCES=rqk,tinyout,classcub-swim-nyc` (comma-separated ids).

## Fair-use operating rules (binding)

1. **One page per source per pass.** Inbox snapshot **or** one provider detail **or** one discovery page — never more than one HTTP request to that source in the same pass.
2. **≥ `FAIR_USE_INTER_SOURCE_SEC` (default 45)** between sources inside a pass.
3. **≥ `FAIR_USE_PASS_SLEEP_SEC` / `RQK_SLEEP_SEC` (default 300)** between full passes.  
   Each source also has **`cooldownSec`** in `sources.json` (300–1200). Inside a pass, sources still
   inside their own cooldown are skipped (no HTTP).
4. **User-Agent:** `ClassScoutCatalogResearch/1.0 (+https://getyourfield.com; fair-use one-lead research)` — never a training-bot name.
5. **Extract facts only.** Do not paste long directory narrative into ClassScout descriptions; set `website` to the **official provider URL** when published. **Never put URLs in `shortDescription` / `longDescription`** — ingest rejects them (`publicCopyHygiene.cjs`).
6. **Attribution:** every seed records `researchSources: ["https://…"]` naming the citation page.
7. **Confirm on the official site** during Find before treating contacts as verified.
8. **Reject one-off events and guides** at lead quality (`one_off_event`, `guide_or_hub_name`) — ClassScout listings are recurring program venues.
9. **Never default unknown activities to Martial Arts** — unmapped → `no_activity_mapped` (no seed).
10. **Emit** `fair_use_attempt` / `fair_use_reject` / `fair_use_seed` into the shared `events.jsonl` so rollup and Tier A can see discovery failures.
11. **Drop dead hubs** via `deadHubPatterns.cjs` (Timeout category 404s, PSP home-life 404s, etc.).
12. **Scarcity brief (hourly):** discovery pages are reordered using
    `scripts/catalog-loop/data/scarcity-research-brief.json` so thin neighborhoods and scarce sports
    are preferred (rule 423). Refresh with `npm run catalog-loop:scarcity-brief`.
13. **Stop on robots change** that would disallow our path, or on repeated HTTP 403/429 — do not retry aggressively.

Full failure catalog and day-by-day practices: [`docs/catalog-loop-error-playbook.md`](../../../docs/catalog-loop-error-playbook.md).

## Queens / non-public boroughs

RQK coverage is Queens (inventory-only while public browse hides Queens). Other sources may land Manhattan/Brooklyn as `publicTarget: true` when the borough is public; Queens/Bronx/Staten Island stay inventory-only.

## Cloudflare / inbox / mobile

Direct `fetch` from the cloud-agent datacenter may receive a Cloudflare challenge. That is a soft skip for that source — we do **not** bypass the challenge.

**Preferred path when live fetch is blocked (works on mobile):** the operator does not need to
save files. The agent uses a citation fetch (WebFetch) of **one** provider URL, then:

```bash
node scripts/catalog-loop/rqk-fair-use/citation-to-inbox.cjs \
  --source rqk --name lead --url "https://www.raisingqueenskids.com/provider/…/" --file /tmp/page.md
FAIR_USE_ONLY=rqk node scripts/catalog-loop/rqk-fair-use/one-lead.cjs
```

That writes `inbox/<sourceId>/lead.html` + `lead.json` and ingests one seed.

**Optional manual drop** (desktop): put HTML into
`scripts/catalog-loop/data/rqk-fair-use/inbox/<sourceId>/<name>.html`
with optional sibling `<name>.json` `{ "url": "https://…" }`.

Legacy flat inbox files (no source subfolder) still apply to **RQK only**.

## Scripts

| File | Role |
| --- | --- |
| `scripts/catalog-loop/rqk-fair-use/one-pass.cjs` | Walk all enabled sources; one page each |
| `scripts/catalog-loop/rqk-fair-use/one-lead.cjs` | Compat wrapper — single source (default `rqk`) |
| `scripts/catalog-loop/rqk-fair-use/forever.sh` | Loop: one-pass → sleep |
| `scripts/catalog-loop/rqk-fair-use/tinyout-pull-all.cjs` | One-shot: harvest every tinyout `/studios` page then seed all studio details (`npm run catalog-loop:tinyout-pull-all`) |
| `scripts/catalog-loop/rqk-fair-use/drive-sheets-pull-all.cjs` | One-shot: import every provider tab from Drive research workbooks into find-seeds (`npm run catalog-loop:drive-sheets-pull-all`) |
| `scripts/catalog-loop/rqk-fair-use/tinyout-retry-no-activity.cjs` | Retry tinyout studios previously rejected as `no_activity_mapped` after subtitle extract (`npm run catalog-loop:tinyout-retry-no-activity`) |
| `scripts/catalog-loop/rqk-fair-use/lib/processOneSource.cjs` | Inbox → provider → discovery for one source |
| `scripts/catalog-loop/rqk-fair-use/lib/sources/` | Per-site harvest + extract adapters |
| `scripts/catalog-loop/rqk-fair-use/lib/common.cjs` | Fetch, state, seed append |
| `scripts/catalog-loop/rqk-fair-use/lib/seedBuilder.cjs` | Citation → find-seed |
| `scripts/catalog-loop/rqk-fair-use/lib/genericExtract.cjs` | Shared HTML fact helpers |
| `scripts/catalog-loop/rqk-fair-use/lib/rqkExtract.cjs` | RQK-specific extract (still used by RQK adapter) |
| `scripts/catalog-loop/rqk-fair-use/lib/leadQuality.cjs` | Reject chrome / hub / junk-website leads |
| `scripts/catalog-loop/scarcity-research-brief.cjs` | Hourly thin-neighborhood / scarce-sport brief (shared with Find) |

## Env

| Var | Default | Meaning |
| --- | --- | --- |
| `FAIR_USE_SOURCES` | all | Comma-separated source ids |
| `FAIR_USE_ONLY` | — | Single-source pass (used by `one-lead.cjs`) |
| `FAIR_USE_INTER_SOURCE_SEC` | `45` | Delay between sources in a pass |
| `FAIR_USE_PASS_SLEEP_SEC` / `RQK_SLEEP_SEC` | `300` | Delay between full passes |
| `FAIR_USE_CHECK_ROBOTS_ON_START` | `0` | If `1`, robots-only pass at start |
| `RQK_DATA_DIR` / `FAIR_USE_DATA_DIR` | `scripts/catalog-loop/data/rqk-fair-use` | State + inbox |
| `CATALOG_FIND_SEEDS` | `scripts/catalog-loop/find-seeds.json` | Seed file |
| `DRIVE_SHEETS_DIR` | `/tmp/provider-research` | Workbook folder for `drive-sheets-pull-all` |
| `DRIVE_SHEETS_DRY` | — | If `1`, report only (no seed write) |

## State

`state.json` is multi-source:

```json
{
  "sources": {
    "rqk": { "queue": [], "done": {}, "discoveryCursor": 0, "leadsAdded": 0 },
    "sprout": { "queue": [], "done": {}, "discoveryCursor": 0, "leadsAdded": 0 }
  },
  "passCount": 1,
  "lastPassAt": "…"
}
```

Legacy RQK-only state is migrated automatically on load.
