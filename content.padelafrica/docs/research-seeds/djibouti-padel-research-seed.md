# Djibouti research seed — verified audit

Source CSV: [`scripts/data/djibouti-padel-verified-2026-09-22.csv`](../scripts/data/djibouti-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/djibouti-padel-verified.json`](../scripts/data/djibouti-padel-verified.json).

## What was seeded

One **Active** venue.

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-dji-ven-001` | Djibouti Padel One | Djibouti | locality (city) |

Four courts + booking app + support email verified. Street address not published — city pin retained. Balbala locality circulated in secondary notes but was not confirmed on a first-party page.

```bash
npm run catalog:seed-research-djibouti:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-djibouti
```

Live (2026-09-22): DJ published **1**; catalogue **65 PUBLISHED** across **24** countries.