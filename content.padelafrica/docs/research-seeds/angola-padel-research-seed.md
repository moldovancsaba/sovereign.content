# Angola research seed — verified 5-minute audit

Source CSV: [`scripts/data/angola-padel-verified-2026-09-22.csv`](../scripts/data/angola-padel-verified-2026-09-22.csv)
(audit dated 2026-09-22). Fixture:
[`scripts/data/angola-padel-verified.json`](../scripts/data/angola-padel-verified.json).

## What was seeded

Fifteen research club / multi-sport padel venues (14 Luanda-area + Lubango Kimbo). Not seeded:

| Record | Why |
| --- | --- |
| AGO-ORG-001 (APPL) | Provincial association — not a playable venue |
| AGO-VEN-012 Clube de Padel de Angola (CPA) | Already published as OSM `osm-way-1333292737` (enriched with research phone/email/Facebook instead of duplicating) |

| Id | Listing | Locality | Geo |
| --- | --- | --- | --- |
| `research-ago-ven-001` | Padel4um / Clube Padel Hotel Fórum | Alvalade | street (Hotel Fórum) |
| `research-ago-ven-002` | Baía Padel Club | Baía de Luanda | locality |
| `research-ago-ven-003` | Casa de Padel Angola (CDP) | Luanda | street |
| `research-ago-ven-004` | Clube Desportivo Miramax | Miramar | locality |
| `research-ago-ven-005` | KOOL PADEL | Lar do Patriota | locality |
| `research-ago-ven-006` | Padel da Villa | Talatona | locality |
| `research-ago-ven-007` | Padel Mania CTL | Ingombotas | locality |
| `research-ago-ven-008` | Padel Park Luanda | Talatona | street (Talatona Shopping) |
| `research-ago-ven-009` | PREMIER PADEL CLUB Standard Bank | Talatona | locality |
| `research-ago-ven-010` | Q88 | Luanda | street (Clube Naval) |
| `research-ago-ven-011` | Smash Padel Angola | Bungo | locality |
| `research-ago-ven-013` | Dragon Padel Club Boa Vida | Boa Vida | locality |
| `research-ago-ven-014` | Max Padel | Benfica | locality |
| `research-ago-ven-015` | Playtime | Luanda Sul | locality |

Most Luanda street addresses are not in Nominatim — pins use neighbourhood / landmark geocodes with honest `geo.precision` (`street` only when a named landmark resolved).

## Rules

- Evidence only from the audit (first-party sites, Playtomic, directories)
- Price `unknown`; court-count conflicts left unresolved in About (CDP 5 vs 6, Smash 4 vs 5)
- About: recommendation tone, no inline URLs/phones
- Idempotent upsert by `research-ago-ven-00N`

```bash
npm run catalog:seed-research-angola:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-angola
```

Live (2026-09-22): AO published **15** (14 research + OSM CPA); catalogue **34 PUBLISHED** across **16** countries.
