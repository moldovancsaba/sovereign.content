# Cabo Verde research seed — verified 5-minute audit

Source CSV: [`scripts/data/cabo-verde-padel-verified-2026-09-22.csv`](../scripts/data/cabo-verde-padel-verified-2026-09-22.csv).
Fixture: [`scripts/data/cabo-verde-padel-verified.json`](../scripts/data/cabo-verde-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-cpv-ven-001` | Praia Padel Club Indoor | Várzea, Praia (Santiago) |
| `research-cpv-ven-002` | Oásis Praia Padel | Prainha, Praia (Santiago) |
| `research-cpv-ven-003` | VOI Praia de Chaves Resort | Sal Rei / Chaves (Boa Vista) |
| `research-cpv-ven-004` | ROBINSON BOA VISTA | Praia de Chaves (Boa Vista) |
| `research-cpv-ven-005` | VOI Vila do Farol Resort | Santa Maria (Sal) |

**Not seeded:** `CPV-EVT-001` Praia Padel Cup — tournament record using VEN-001, not an extra location. Court-count conflicts (VOI Chaves 1 vs 2) left unresolved in About.

```bash
npm run catalog:seed-research-cabo-verde:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-cabo-verde
```
