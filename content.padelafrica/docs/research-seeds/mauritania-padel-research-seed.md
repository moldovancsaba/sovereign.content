# Mauritania research seed — verified audit

Source CSV: [`scripts/data/mauritania-padel-verified-2026-09-22.csv`](../scripts/data/mauritania-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/mauritania-padel-verified.json`](../scripts/data/mauritania-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-mrt-ven-001` | Sahara Padel Club | Tevragh Zeina, Nouakchott |

```bash
npm run catalog:seed-research-mauritania:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-mauritania
```
