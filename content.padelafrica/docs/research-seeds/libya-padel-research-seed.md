# Libya research seed — verified audit

Source CSV: [`scripts/data/libya-padel-verified-2026-09-22.csv`](../scripts/data/libya-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/libya-padel-verified.json`](../scripts/data/libya-padel-verified.json).

## What was seeded

Three **Active** venues (Padel House + FIND Zeyani + Mendoza).

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-lby-ven-001` | Padel House | Ain Zara, Tripoli | locality |
| `research-lby-ven-002` | Zeyani Padel Zone | Omar Almukhtar Road, Tripoli | street |
| `research-lby-ven-003` | Mendoza Club LY | Abu Salim, Tripoli | locality |

FIND 2026-09-23 evidence: [Padel Lands Libya](https://padellands.com/en/pistas-de-padel/otros-paises/libya-en/) + [Padel Without Borders](https://www.padelwithoutborders.com/libya-padel/).

```bash
npm run catalog:find -- --status
npm run catalog:find -- --fixture=scripts/data/libya-padel-verified.json --dry-run
npm run catalog:find -- --fixture=scripts/data/libya-padel-verified.json
# or:
npm run catalog:seed-research-libya:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-libya
```

Live (2026-09-23 FIND): LY published **3**; catalogue **158 PUBLISHED** across **42** countries.
