# Zimbabwe research seed — Padel Zim + existing OSM Old Georgians

Source CSV: [`scripts/data/zimbabwe-padel-verified-2026-09-22.csv`](../scripts/data/zimbabwe-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/zimbabwe-padel-verified.json`](../scripts/data/zimbabwe-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-zwe-ven-001` | Padel Zim The Hub | 170 The Chase, Harare |
| `research-zwe-ven-002` | Padel Zim Highlands | Highlands Sports Club |
| `osm-way-443984820` | Old Georgians (already live; enrich About) | Wycombe Avenue, Mount Pleasant |

```bash
npm run catalog:seed-research-zimbabwe:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-zimbabwe
```
