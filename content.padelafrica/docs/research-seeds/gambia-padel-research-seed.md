# Gambia research seed — Kololi Beach Resort (+ existing OSM)

Source CSV: [`scripts/data/gambia-padel-verified-2026-09-22.csv`](../scripts/data/gambia-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/gambia-padel-verified.json`](../scripts/data/gambia-padel-verified.json).

## What was seeded

One **Active** research venue, distinct from the existing OSM Seaview Plaza card.

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-gmb-ven-001` | Kololi Beach Resort Padel | Senegambia Strip, Kololi | street |
| `osm-way-1503420104` | Padel Club Gambia (already live) | Seaview Plazza | existing OSM |

```bash
npm run catalog:seed-research-gambia:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-gambia
```

Live (2026-09-22): GM published **2** (research + OSM); catalogue **73 PUBLISHED** across **27** countries.