# Rwanda research seed — Bounce Kiyovu

Source CSV: [`scripts/data/rwanda-padel-verified-2026-09-22.csv`](../scripts/data/rwanda-padel-verified-2026-09-22.csv).  
Fixture: [`scripts/data/rwanda-padel-verified.json`](../scripts/data/rwanda-padel-verified.json).

| Id | Listing | Place |
| --- | --- | --- |
| `research-rwa-ven-001` | Bounce Kiyovu | 16 KN 47 Street, Kigali |

```bash
npm run catalog:seed-research-rwanda:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-rwanda
```
