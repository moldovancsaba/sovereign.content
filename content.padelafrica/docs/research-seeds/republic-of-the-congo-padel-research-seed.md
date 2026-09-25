# Republic of the Congo research seed — verified 5-minute audit

Source CSV: [`scripts/data/republic-of-the-congo-padel-verified-2026-09-22.csv`](../scripts/data/republic-of-the-congo-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/republic-of-the-congo-padel-verified.json`](../scripts/data/republic-of-the-congo-padel-verified.json).

Country code **CG** (Congo-Brazzaville), not CD/DRC.

| Id | Listing | Place | Geo |
| --- | --- | --- | --- |
| `research-cog-ven-001` | K Padel / Kennys Padel | K Galerie, Pointe-Noire | street (Avenue François Charles) |
| `research-cog-ven-002` | Tennis Club Brazzaville | Patte d'Oie, Brazzaville | street (rond-point) |
| `research-cog-ven-003` | Padel 2001 | Compound 2001, Pointe-Noire | locality (Centre-Ville) |
| `research-cog-ven-004` | Cercle Civil de Pointe-Noire | Boulevard de Loango | street (Mâ Loango) |
| `research-cog-ven-005` | Le Derrick | Avenue Massafi / Plage Mondaine | street (Massafi) |

All five audit venues were **Active** / reported active — seeded. Court-count gaps (Padel 2001, Le Derrick) left unresolved in About. Multi-phone rows keep the first published number only.

```bash
npm run catalog:seed-research-congo:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-congo
```

Live (2026-09-22): CG published **5**; catalogue **51 PUBLISHED** across **20** countries.