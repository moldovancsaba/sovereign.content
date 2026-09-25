# Mauritius research seed — verified audit

Source CSV: [`scripts/data/mauritius-padel-verified-2026-09-22.csv`](../scripts/data/mauritius-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/mauritius-padel-verified.json`](../scripts/data/mauritius-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-mus-ven-001` | Isla Padel Grand Baie | La Croisette, Grand Baie |

```bash
npm run catalog:seed-research-mauritius:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-mauritius
```
