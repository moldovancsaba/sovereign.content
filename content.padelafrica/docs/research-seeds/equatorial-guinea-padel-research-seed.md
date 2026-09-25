# Equatorial Guinea research seed — verified audit

Source CSV: [`scripts/data/equatorial-guinea-padel-verified-2026-09-22.csv`](../scripts/data/equatorial-guinea-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/equatorial-guinea-padel-verified.json`](../scripts/data/equatorial-guinea-padel-verified.json).

## What was seeded

Two **Active** venues (Sport Club Malabo + FIND Ukomba Bata).

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-gnq-ven-001` | Sport Club Malabo | Beside Venezuelan Embassy, Malabo | locality |
| `research-gnq-ven-002` | Ukomba Sport Padel Club | Ukomba beachfront, Bata | locality |

**Not seeded as a second Malabo venue:** `padelmalabo.com` (league + Campo 1 booking) — active Malabo play, but no distinct street address separate from Sport Club within the audit window.

FIND 2026-09-23 evidence: [Padel Lands Ukomba](https://padellands.com/en/padel-courts/ukomba-sport-padel-club/) + [AnalistasPadel](https://www.analistaspadel.com/el-padel-en-guinea-ecuatorial/).

```bash
npm run catalog:find -- --status
npm run catalog:find -- --fixture=scripts/data/equatorial-guinea-padel-verified.json --dry-run
npm run catalog:find -- --fixture=scripts/data/equatorial-guinea-padel-verified.json
# or:
npm run catalog:seed-research-equatorial-guinea:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-equatorial-guinea
```

Live (2026-09-23 FIND): GQ published **2**; catalogue **158 PUBLISHED** across **42** countries.
