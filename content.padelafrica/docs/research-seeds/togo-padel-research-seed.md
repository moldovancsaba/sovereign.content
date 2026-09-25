# Togo research seed — two Lomé clubs

Source CSV: [`scripts/data/togo-padel-verified-2026-09-22.csv`](../scripts/data/togo-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/togo-padel-verified.json`](../scripts/data/togo-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-tgo-ven-001` | L'Afriklub Padel | Boulevard Jean-Paul II, Lomé |
| `research-tgo-ven-002` | Padel Family Club | Didjolé, Lomé |

```bash
npm run catalog:seed-research-togo:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-togo
```
