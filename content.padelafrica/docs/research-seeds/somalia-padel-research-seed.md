# Somalia research seed — PadelSL Hargeisa (Somaliland)

Source CSV: [`scripts/data/somalia-padel-verified-2026-09-22.csv`](../scripts/data/somalia-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/somalia-padel-verified.json`](../scripts/data/somalia-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-som-ven-001` | PadelSL | Hargeisa (Somaliland), ISO `SO` |

No Mogadishu venue verified within the audit cap.

```bash
npm run catalog:seed-research-somalia:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-somalia
```
