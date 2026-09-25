# Nigeria research seed — curated Lagos sample

Source CSV: [`scripts/data/nigeria-padel-verified-2026-09-22.csv`](../scripts/data/nigeria-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/nigeria-padel-verified.json`](../scripts/data/nigeria-padel-verified.json).

Nigeria has a multi-city market. This is a **curated Lagos sample**.

| Id | Listing | Place |
| --- | --- | --- |
| `research-nga-ven-001` | Padel X Nigeria | Cooper Road, Ikoyi |
| `research-nga-ven-002` | The Padel Club Lagos | Glover Road, Ikoyi |
| `research-nga-ven-003` | The Padel House Ikoyi | Ribadu Road, Ikoyi |
| `research-nga-ven-004` | The Padel Court Lekki | Kusenla Road, Lekki |
| `research-nga-ven-005` | Padelon Abuja | **Abuja** River Plate Park / Wuse 2 (FIND until-found tick 2026-09-24) |
| `research-nga-ven-006` | PadelBay | **Owerri** Aladinma (FIND deepen after PH zero 2026-09-24) |

```bash
npm run catalog:seed-research-nigeria:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-nigeria
```
