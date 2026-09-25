# Burundi research seed — verified 5-minute audit

Source CSV: [`scripts/data/burundi-padel-verified-2026-09-22.csv`](../scripts/data/burundi-padel-verified-2026-09-22.csv).
Fixture: [`scripts/data/burundi-padel-verified.json`](../scripts/data/burundi-padel-verified.json).

| Id | Listing | Locality |
| --- | --- | --- |
| `research-bdi-ven-001` | Padel Club de Bujumbura | Bujumbura (Entente Sportive / Avenue du Stade) |

**Not seeded:** `BDI-ORG-001` Fédération Burundaise de Tennis — organisation record; its two padel courts are the same physical inventory as VEN-001 (must not double-count). Unfinished project courts at the site are also excluded.

```bash
npm run catalog:seed-research-burundi:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-burundi
```
