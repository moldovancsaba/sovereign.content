# South Africa research seed — curated sample + existing OSM V&A

Source CSV: [`scripts/data/south-africa-padel-verified-2026-09-22.csv`](../scripts/data/south-africa-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/south-africa-padel-verified.json`](../scripts/data/south-africa-padel-verified.json).

South Africa has a very large market (70+ clubs). This is a **curated sample**.

| Id | Listing | Place |
| --- | --- | --- |
| `research-zaf-ven-001` | Africa Padel Camps Bay | Camps Bay, Cape Town |
| `research-zaf-ven-002` | Africa Padel Claremont | Claremont, Cape Town |
| `research-zaf-ven-003` | Discovery Padel Park Sandton | Sandhurst, Sandton |
| `research-zaf-ven-004` | PadelNation Durban Country Club | Durban |
| `research-zaf-ven-005` | The Net Social Club | Pretoria |
| `research-zaf-ven-006` | ClubPadel Stellenbosch | Stellenbosch |
| `research-zaf-ven-007` | Aura Padel Club Montague Gardens | Cape Town |
| `research-zaf-ven-008` | Indoor Padel Revolution | Johannesburg Honeydew |
| `research-zaf-ven-009` | Africa Padel Van Der Stel | 28 Du Toit Street, Stellenbosch Central |
| `osm-way-1266919001` | Africa Padel V&A (already live; enrich) | Portswood Road, Cape Town |

```bash
npm run catalog:seed-research-south-africa:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-south-africa
```
