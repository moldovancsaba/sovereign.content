# Côte d'Ivoire research seed — curated Abidjan sample + existing OSM

Source CSV: [`scripts/data/ivory-coast-padel-verified-2026-09-22.csv`](../scripts/data/ivory-coast-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/ivory-coast-padel-verified.json`](../scripts/data/ivory-coast-padel-verified.json).

## What was seeded

Two **Active** research venues (sample). Ace padel already live as OSM.

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-civ-ven-001` | Padelta | Cocody Danga | locality |
| `research-civ-ven-002` | WePadel Marcory | Marcory Résidentiel | locality |
| `osm-node-12650488436` | Ace padel (already live) | Rue Yves Mankambou, Marcory | existing OSM |

```bash
npm run catalog:seed-research-ivory-coast:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-ivory-coast
```

Live (2026-09-22): CI published **3** (2 research + OSM Ace); catalogue **76 PUBLISHED** across **28** countries.