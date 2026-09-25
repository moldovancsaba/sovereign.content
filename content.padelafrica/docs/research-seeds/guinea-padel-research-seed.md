# Guinea research seed — verified audit

Source CSV: [`scripts/data/guinea-padel-verified-2026-09-22.csv`](../scripts/data/guinea-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/guinea-padel-verified.json`](../scripts/data/guinea-padel-verified.json).

## What was seeded

One **Active** venue.

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-gin-ven-001` | Riviera Padel | Riviera Royal Hotel, Conakry | street |

```bash
npm run catalog:seed-research-guinea:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-guinea
```

Live (2026-09-22): GN published **1**; catalogue **73 PUBLISHED** across **27** countries.