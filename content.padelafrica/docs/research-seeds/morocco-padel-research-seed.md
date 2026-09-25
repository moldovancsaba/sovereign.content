# Morocco research seed — curated Casablanca sample + existing OSM

Source CSV: [`scripts/data/morocco-padel-verified-2026-09-22.csv`](../scripts/data/morocco-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/morocco-padel-verified.json`](../scripts/data/morocco-padel-verified.json).

Morocco has a large market (70+ clubs). This is a **curated sample**.

| Id | Listing | Place |
| --- | --- | --- |
| `research-mar-ven-001` | Depot 4 Indoor Padel | Aïn-Chock, Casablanca |
| `research-mar-ven-002` | Padel 4 | Bouskoura / Ville Verte |
| `research-mar-ven-003` | Club Wifaq | Rabat (Les Ambassadeurs) |
| `research-mar-ven-004` | Padel Square Marrakech | Route d'Amizmiz |
| `research-mar-ven-005` | AREA Sports & Events Center | Oulad Azzouz / Almaz |
| `research-mar-ven-006` | Atlas Tennis Padel Marrakech Académie | Route Ourika KM 10 / Tassoultante |
| `research-mar-ven-007` | TCMT Padel Club | Avenue Essalam, Tangier |
| `research-mar-ven-008` | B Padel Californie | Californie / Bd de Fès, Casablanca |
| `research-mar-ven-009` | Le Carré Padel Agadir | Odysée Park, Blvd Mohamed V |
| `research-mar-ven-010` | Fes Country Club | Complexe El Merja / Zouagha |
| `research-mar-ven-011` | Centre Sports et Loisirs Said Maatallah | Mhamid Sud / Dior Atlas |
| `research-mar-ven-012` | Cité de Sports Adarissa | Hay Adarissa, Fes |
| `research-mar-ven-013` | Club Narjisse | Avenue Azzaitoune, Hay Ryad, Rabat |
| `research-mar-ven-014` | Club Padel Maroc | Route de Meknès 879 RC, Sala Al Jadida, Salé |
| `research-mar-ven-015` | Club Riad | Avenue Imam Malik / Abdelaziz Boutal, Agdal, Rabat |
| `osm-node-13300140471` | Padel Factory (already live) | Agadir |

```bash
npm run catalog:seed-research-morocco:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-morocco
```
