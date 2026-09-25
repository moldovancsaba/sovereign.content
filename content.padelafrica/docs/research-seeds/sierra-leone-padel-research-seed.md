# Sierra Leone research seed — two Freetown courts

Source CSV: [`scripts/data/sierra-leone-padel-verified-2026-09-22.csv`](../scripts/data/sierra-leone-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/sierra-leone-padel-verified.json`](../scripts/data/sierra-leone-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-sle-ven-001` | Young Sports Men Club Padel | Wilkinson Road, Freetown |
| `research-sle-ven-002` | Royal Fitness Padel | Juba / Peninsular Highway |

```bash
npm run catalog:seed-research-sierra-leone:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-sierra-leone
```
