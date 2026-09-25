# Senegal research seed — Saly + Dakar

Source CSV: [`scripts/data/senegal-padel-verified-2026-09-22.csv`](../scripts/data/senegal-padel-verified-2026-09-22.csv) (Palmeraie).  
Fixture: [`scripts/data/senegal-padel-verified.json`](../scripts/data/senegal-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-sen-ven-001` | La Palmeraie Sporting Club | Saly Portudal / N'Guerigne Bambara |
| `research-sen-ven-002` | Dakar Padel Club | Km 1, Route de Rufisque, Dakar |
| `research-sen-ven-003` | REBEL PADEL Sahm | Galerie Sahm / Avenue Cheikh Anta Diop, Dakar |

`SEN-VEN-002` evidence (2026-09-23): [BalleJaune club card](https://ballejaune.com/club/Dpc) + [Matchpoint](https://dakarpadelclub-sn.matchpoint.com.es/).  
`SEN-VEN-003` evidence (FIND 2026-09-23): [BalleJaune Rebel](https://ballejaune.com/club/rebelpadelsn) + [contact](https://ballejaune.com/club/rebelpadelsn/contact).

```bash
npm run catalog:find -- --status
npm run catalog:find -- --fixture=scripts/data/senegal-padel-verified.json --dry-run
npm run catalog:find -- --fixture=scripts/data/senegal-padel-verified.json
# or:
npm run catalog:seed-research-senegal:dry
npm run catalog:seed-research-senegal
```
