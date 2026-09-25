# Seychelles research seed — Eden Island + Labriz

Source CSV: [`scripts/data/seychelles-padel-verified-2026-09-22.csv`](../scripts/data/seychelles-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/seychelles-padel-verified.json`](../scripts/data/seychelles-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-syc-ven-001` | Eden Island Clubhouse Padel | Eden Island, Mahé |
| `research-syc-ven-002` | Seychelles Padel Society Labriz | Bel Ombre, Mahé |

```bash
npm run catalog:seed-research-seychelles:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-seychelles
```
