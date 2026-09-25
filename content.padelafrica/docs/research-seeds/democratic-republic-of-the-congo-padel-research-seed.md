# Democratic Republic of the Congo research seed — verified 5-minute audit

Source CSV: [`scripts/data/democratic-republic-of-the-congo-padel-verified-2026-09-22.csv`](../scripts/data/democratic-republic-of-the-congo-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/democratic-republic-of-the-congo-padel-verified.json`](../scripts/data/democratic-republic-of-the-congo-padel-verified.json).

Country code **CD** (DRC), not CG (Republic of the Congo).

## What was seeded

Seven **Active** venues. Not seeded:

| Record | Why |
| --- | --- |
| COD-ORG-001 Fédération Congolaise de Padel | FIP federation — not a playable venue |

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-cod-ven-001` | Blue Padel Kinshasa | Avenue Kalemie, Gombe | street |
| `research-cod-ven-002` | Sporting Padel Belle Vue | Belle Vue, Kinshasa | locality |
| `research-cod-ven-003` | Cercle de Kinshasa – Padel | Avenue du Cercle, Gombe | street |
| `research-cod-ven-004` | River Padel | Kinshasa | locality (thin) |
| `research-cod-ven-005` | CHL Padel Club | Karavia, Lubumbashi | street (Cercle Hippique) |
| `research-cod-ven-006` | Le Cercle Belge de Lubumbashi | Avenue Kilela Balanda | street |
| `research-cod-ven-007` | La Joie Padel | La Joie Mall, Kolwezi | street |

Court-count conflict at Cercle de Kinshasa (official 2 vs directory 1) — official retained. River Padel seeded thin (no invented contact).

```bash
npm run catalog:seed-research-drc:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-drc
```

Live (2026-09-22): CD published **7**; catalogue **58 PUBLISHED** across **21** countries.