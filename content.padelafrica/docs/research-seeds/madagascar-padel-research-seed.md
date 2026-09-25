# Madagascar research seed — Antananarivo sample + existing OSM

Source CSV: [`scripts/data/madagascar-padel-verified-2026-09-22.csv`](../scripts/data/madagascar-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/madagascar-padel-verified.json`](../scripts/data/madagascar-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-mdg-ven-001` | Tropical Padel | Talatamaty |
| `research-mdg-ven-002` | Garden Padel Ivandry | Ivandry |
| `osm-node-11844432371` | Lamakoo Padel center (already live) | Rocade d'Iarivo |

```bash
npm run catalog:seed-research-madagascar:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-madagascar
```
