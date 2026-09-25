# Tanzania research audit — FIND + OSM

Fixture: [`scripts/data/tanzania-padel-verified.json`](../scripts/data/tanzania-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `osm-node-13937004559` | Padel Sports Africa (already live; enrich) | Kimweri Avenue / Masaki, Dar es Salaam |
| `research-tza-ven-001` | Padel Centre TZ Slipway | Slipway, Msasani Peninsula, Dar es Salaam |
| `research-tza-ven-002` | The Hub Bwejuu | Bwejuu, Zanzibar |

FIND 2026-09-23 evidence: [Padel Centre TZ contact](https://padelcentretz.com/contact-us/) + [booking](https://padelcentretz.com/booking/).

```bash
npm run catalog:find -- --status
npm run catalog:find -- --fixture=scripts/data/tanzania-padel-verified.json --dry-run
npm run catalog:find -- --fixture=scripts/data/tanzania-padel-verified.json
```
