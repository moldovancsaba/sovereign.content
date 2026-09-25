# Egypt research seed — Alexandria sample + FIND Giza deepen

Source CSV: [`scripts/data/egypt-padel-verified-2026-09-22.csv`](../scripts/data/egypt-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/egypt-padel-verified.json`](../scripts/data/egypt-padel-verified.json).

Egypt has a large padel market. This audit is a **curated sample** plus enrichment of OSM Neon Padel — **not** a full national inventory.

## What was seeded

| Id | Listing | Place |
| --- | --- | --- |
| `research-egy-ven-001` | WePadel Complex | Alexandria |
| `research-egy-ven-002` | WePadel Smouha | Alexandria |
| `research-egy-ven-003` | Green Plaza Sports Complex | Alexandria |
| `research-egy-ven-004` | Alex Padel | Alexandria |
| `osm-way-1233805697` | Neon Padel (enrich) | New Cairo |
| `research-egy-ven-005` | Pro Padel Egypt Le Jardin | **Giza** / Sheikh Zayed (FIND until-found 2026-09-24) |
| `research-egy-ven-006` | Hurghada Padel | **Hurghada** Downtown Beach (FIND until-found tick 2026-09-24) |
| `research-egy-ven-007` | Domina Coral Bay Padel | **Sharm El Sheikh** Hadaba / Coral Bay (FIND until-found tick 2026-09-24) |
| `research-egy-ven-008` | Padel Up | **Cairo** Nasr City (FIND until-found tick 2026-09-25) |
| `research-egy-ven-009` | Go Padel Katameya | Katameya Heights, New Cairo |

FIND evidence: [Skedda booking](https://propadeleg.skedda.com/booking) (Le Jardin courts) + phone +20 11 28099322 + Playtomic directory card.

```bash
npm run catalog:find -- --until-found --max-cells 8
npm run catalog:find -- --fixture=scripts/data/egypt-padel-verified.json --dry-run
npm run catalog:find -- --fixture=scripts/data/egypt-padel-verified.json
```
