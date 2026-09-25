# Ghana research seed — curated Accra sample

Source CSV: [`scripts/data/ghana-padel-verified-2026-09-22.csv`](../scripts/data/ghana-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/ghana-padel-verified.json`](../scripts/data/ghana-padel-verified.json).

Ghana has a growing Accra market. This audit is a **curated sample** of four first-party clubs — **not** a full national inventory (PadelRevive lists additional venues).

## What was seeded

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-gha-ven-001` | Clan Padel (Clan 7) | 150 Osu Badu St, Airport West | locality |
| `research-gha-ven-002` | The Padel Club Ghana | Karroum St, Adjiringanor | locality |
| `research-gha-ven-003` | Nirvana Play & Party | 54 Swaniker St | locality |
| `research-gha-ven-004` | Aura Lifestyle Club | 10 Anorhor St, Osu | locality |

```bash
npm run catalog:seed-research-ghana:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-ghana
```

Live (2026-09-22): GH published **4**; catalogue **73 PUBLISHED** across **27** countries.