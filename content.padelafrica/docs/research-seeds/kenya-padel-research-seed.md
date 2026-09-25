# Kenya research seed — Nairobi sample + FIND Mombasa / Nakuru deepen

Source CSV: [`scripts/data/kenya-padel-verified-2026-09-22.csv`](../scripts/data/kenya-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/kenya-padel-verified.json`](../scripts/data/kenya-padel-verified.json).

## What was seeded

| Id | Listing | Place |
| --- | --- | --- |
| `research-ken-ven-001` | Ace Padel Kenya | Aga Khan Sports Centre, Parklands |
| `research-ken-ven-002` | Padel254 | Goan Gymkhana, Ngara |
| `research-ken-ven-003` | PLAYON Padel Kenya Jafferys | Jaffery Sports Club, Lavington |
| `research-ken-ven-004` | Networks Padel Village | Limuru Road |
| `osm-way-1317470888` | Pulse Padel Gigiri (already live) | UN Close, Gigiri |
| `research-ken-ven-005` | PLAYON Padel Club and Academy | City Mall Nyali, **Mombasa** (FIND 2026-09-24) |
| `research-ken-ven-006` | Smash Zone Padel | Kizingo, **Mombasa** (FIND 2026-09-24) |
| `research-ken-ven-007` | Royal Padelzone Pavilion Nakuru | Pavilion Sports Club, Milimani, **Nakuru** (FIND 2026-09-24) |

FIND deepen evidence: [Playtomic CityMall](https://playtomic.com/clubs/playon-padel-club-and-academy) + [Smash Zone](https://smashzone.ke/) + [Royal Padelzone](https://royalpadelzone.co.ke/) (+ Nation Nakuru feature).

```bash
npm run catalog:find -- --until-found --max-cells 8
npm run catalog:find -- --fixture=scripts/data/kenya-padel-verified.json --dry-run
npm run catalog:find -- --fixture=scripts/data/kenya-padel-verified.json
```
