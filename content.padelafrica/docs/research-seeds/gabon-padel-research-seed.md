# Gabon research seed — verified audit

Source CSV: [`scripts/data/gabon-padel-verified-2026-09-22.csv`](../scripts/data/gabon-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/gabon-padel-verified.json`](../scripts/data/gabon-padel-verified.json).

## What was seeded

Two **Active** venues.

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-gab-ven-001` | Le Classico Club | Avenue Jean-Paul II / Bessieux, Libreville | street |
| `research-gab-ven-002` | Eden Sport – Eden Padel Club | Hôtel du Parc, Port-Gentil | street |

```bash
npm run catalog:seed-research-gabon:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-gabon
```

Live (2026-09-22): GA published **2**; catalogue **73 PUBLISHED** across **27** countries.