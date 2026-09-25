# Cameroon research seed — verified 5-minute audit

Source CSV: [`scripts/data/cameroon-padel-verified-2026-09-22.csv`](../scripts/data/cameroon-padel-verified-2026-09-22.csv).
Fixture: [`scripts/data/cameroon-padel-verified.json`](../scripts/data/cameroon-padel-verified.json).

## What was seeded

Four **Active** venues. Not seeded as new research cards:

| Record | Why |
| --- | --- |
| CMR-ORG-001 FECAPADEL | National association — not a playable venue |
| CMR-VEN-001 Elite Padel Yaoundé | Already published as OSM `osm-way-1524068106` (enriched with research website/phone/Instagram/About instead of duplicating) |
| CMR-DEV-001 Tennis Club de Douala | Planned padel extension — not active |

| Id | Listing | Locality | Geo |
| --- | --- | --- | --- |
| `research-cmr-ven-002` | Kimalé Multisports 237 | Youpwe / Douala | locality (Youpwe suburb) |
| `research-cmr-ven-003` | Pro Padel Cameroun | Hydrocarbures / Douala | locality (Rue des Hydrocarbures) |
| `research-cmr-ven-004` | ORA Complex / ORA Wellness | Hydrocarbures / Douala | locality (same neighbourhood pin) |
| `research-cmr-ven-005` | BENDO | Quartier Golf / Yaoundé | locality (Carrefour Golf) |

Pro Padel and ORA both sit in Hydrocarbures — audit does not establish whether they are the same site; cards stay separate. BENDO is a thin recruitment-signal row (no invented contact).

```bash
npm run catalog:seed-research-cameroon:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-cameroon
```

Live (2026-09-22): CM published **5** (4 research + OSM Elite); catalogue **46 PUBLISHED** across **19** countries.