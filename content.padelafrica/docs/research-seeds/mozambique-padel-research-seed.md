# Mozambique research seed — Gayle + Tofo + existing OSM Maputo

Source CSV: [`scripts/data/mozambique-padel-verified-2026-09-22.csv`](../scripts/data/mozambique-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/mozambique-padel-verified.json`](../scripts/data/mozambique-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-moz-ven-001` | Gayle Padel Club Moz | Behind Glória Mall, Maputo |
| `research-moz-ven-002` | Padel Club Tofo | Praia do Tofo, Inhambane |
| `osm-way-1183409068` | Padel Club Maputo (already live) | Rua 3.896, Maputo |

```bash
npm run catalog:seed-research-mozambique:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-mozambique
```
