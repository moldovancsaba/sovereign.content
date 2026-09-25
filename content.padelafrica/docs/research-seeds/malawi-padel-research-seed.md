# Malawi research seed — verified audit

Source CSV: [`scripts/data/malawi-padel-verified-2026-09-22.csv`](../scripts/data/malawi-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/malawi-padel-verified.json`](../scripts/data/malawi-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-mwi-ven-001` | Pulse Park | Lilongwe |
| `research-mwi-ven-002` | GoPadel Club | Likuni Road, Lilongwe |
| `research-mwi-ven-003` | Padel Zone | Mall of Africa, Ginnery Corner / Blantyre |

```bash
npm run catalog:seed-research-malawi:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-malawi
```
