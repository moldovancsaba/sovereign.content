# Tunisia research seed — curated Tunis sample + OSM Mourouj

Source CSV: [`scripts/data/tunisia-padel-verified-2026-09-22.csv`](../scripts/data/tunisia-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/tunisia-padel-verified.json`](../scripts/data/tunisia-padel-verified.json).

Tunisia has a large market. This is a **curated sample**.

| Id | Listing | Place |
| --- | --- | --- |
| `research-tun-ven-001` | Sky Padel Charguia | Charguia 1, Tunis |
| `research-tun-ven-002` | Padel House Tunisia | Ariana |
| `osm-node-14065918067` | Padel in Mourouj (already live; enrich) | RR36, Mourouj |

```bash
npm run catalog:seed-research-tunisia:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-tunisia
```
