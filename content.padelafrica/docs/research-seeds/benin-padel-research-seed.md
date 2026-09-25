# Benin research audit — OSM enrich only

Fixture: [`scripts/data/benin-padel-verified.json`](../scripts/data/benin-padel-verified.json) (empty; `--enrich-only`).  
Archive note: [`scripts/data/benin-padel-osm-enrich-2026-09-22.csv`](../scripts/data/benin-padel-osm-enrich-2026-09-22.csv).

| Id | Listing | Place |
| --- | --- | --- |
| `osm-node-13440135409` | Cotonou Padel Club (already live; enrich) | Route des Pêches, Togbin-Fandji |

No additional named Active venues verified beyond this OSM card within the audit cap (Padel Lands lists only this club).

```bash
npm run catalog:seed-research-benin:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-benin
```
