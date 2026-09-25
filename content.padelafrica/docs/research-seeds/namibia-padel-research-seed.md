# Namibia research seed — Windhoek + existing OSM Swakopmund

Source CSV: [`scripts/data/namibia-padel-verified-2026-09-22.csv`](../scripts/data/namibia-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/namibia-padel-verified.json`](../scripts/data/namibia-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-nam-ven-001` | Namibia Padel Windhoek | Olympia (Sean McBride / Tennis Street) |
| `research-nam-ven-002` | United Padel Namibia | Trustco United Fields, Olympia |
| `osm-node-12477757278` | Namibia Padel Swakopmund (already live; enrich) | Platz Am Meer / Tsavorite Street |

```bash
npm run catalog:seed-research-namibia:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-namibia
```
