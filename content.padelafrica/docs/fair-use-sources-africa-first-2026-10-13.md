# Fair-use source catalogue — Africa-first refresh (2026-10-13)

## Why

Hourly ticks were harvesting EU/US directories (USPA, Padel Browser, UK/FR magazines, MATCHi,
Bounce, shop hubs) that yield out-of-scope leads and burn polite-pass budget. Meanwhile the best
Africa atlases (PadelRevive country pages + CSV, CourtPro, Playtomic directory) were under-used.

## Changes

| Action | Sources |
| --- | --- |
| **Removed** | `padelusa`, `padelbrowser`, `thepadeldirectory`, `matchi`, `bounce-game`, `padel-magazine-uk`, `padelmagazine-fr`, `totalpadel`, `need4padel`, `worldpadelnetwork`, `padelsearch`, `padelivu`, `anybuddy` |
| **Added** | `courtpro`, `playtomic-directory`, `padelafrica-apc` |
| **Expanded** | `padelrevive` (12 country pages + CSV), `padellands`, `ballejaune`, `actu-padel`, `padelmap` (Africa-only pages), `findapadelcourt-za` cities |

Registry count: **28 → 18** Africa-useful sources. SSOT: `scripts/fair-use/sources.json`.

## Agent posture

Still citation-only → evidence bar → `*-padel-verified.json` → ingest via
`ingest/buildStructuredSourceText.ts`. Reject OOS (non-Africa) leads at promote time.
