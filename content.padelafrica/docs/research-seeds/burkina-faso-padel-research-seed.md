# Burkina Faso research seed — verified 5-minute audit

Source CSV: [`scripts/data/burkina-faso-padel-verified-2026-09-22.csv`](../scripts/data/burkina-faso-padel-verified-2026-09-22.csv).
Fixture: [`scripts/data/burkina-faso-padel-verified.json`](../scripts/data/burkina-faso-padel-verified.json).

| Id | Listing | Locality | Geo |
| --- | --- | --- | --- |
| `research-bfa-ven-001` | Lancaster Ouaga 2000 | Ouaga 2000 | street (Google Business) |
| `research-bfa-ven-002` | KABB Football Arena | Ouaga 2000 | locality (Nominatim neighbourhood) |

KABB has no public phone/website in the audit — seeded thin, contact not invented.

```bash
npm run catalog:seed-research-burkina:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-burkina
```
