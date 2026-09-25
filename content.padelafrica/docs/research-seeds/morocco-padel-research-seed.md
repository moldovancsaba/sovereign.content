# Morocco research seed — curated Casablanca sample + existing OSM

Source CSV: [`scripts/data/morocco-padel-verified-2026-09-22.csv`](../scripts/data/morocco-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/morocco-padel-verified.json`](../scripts/data/morocco-padel-verified.json).

Morocco has a large market (70+ clubs). This is a **curated sample**.

| Id | Listing | Place |
| --- | --- | --- |
| `research-mar-ven-001` | Depot 4 Indoor Padel | Aïn-Chock, Casablanca |
| `research-mar-ven-002` | Padel 4 | Bouskoura / Ville Verte |
| `osm-node-13300140471` | Padel Factory (already live) | Agadir |

```bash
npm run catalog:seed-research-morocco:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-morocco
```
