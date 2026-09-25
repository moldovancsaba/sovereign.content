# Uganda research seed — two Kampala clubs

Source CSV: [`scripts/data/uganda-padel-verified-2026-09-22.csv`](../scripts/data/uganda-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/uganda-padel-verified.json`](../scripts/data/uganda-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-uga-ven-001` | Herman Padel Center | Ggaba Road, Nsambya |
| `research-uga-ven-002` | Smash Padel Uganda | Old Kira Road, Bukoto |
| `research-uga-ven-003` | Lake Victoria Serena Padel | Lweza-Kigo Road off Entebbe Road, Kampala |

```bash
npm run catalog:seed-research-uganda:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-uganda
```
