# Eswatini research seed — verified audit

Source CSV: [`scripts/data/eswatini-padel-verified-2026-09-22.csv`](../scripts/data/eswatini-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/eswatini-padel-verified.json`](../scripts/data/eswatini-padel-verified.json).

## What was seeded

One **Active** venue.

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-swz-ven-001` | LivPadel Malkerns | Malkerns Square, Malkerns | locality |

Three courts, phone, email, and daily hours from the LivPadel club page; July 2025 launch coverage corroborates Eswatini’s first purpose-built LivPadel site.

```bash
npm run catalog:seed-research-eswatini:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-eswatini
```

Live (2026-09-22): SZ published **1**; catalogue **65 PUBLISHED** across **24** countries.