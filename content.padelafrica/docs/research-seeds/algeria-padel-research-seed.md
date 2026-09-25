# Algeria research seed — verified ecosystem audit

Source CSV: [`scripts/data/algeria-padel-ecosystem-verified-2026-09-22.csv`](../scripts/data/algeria-padel-ecosystem-verified-2026-09-22.csv)
(audit dated 2026-09-22). Fixture:
[`scripts/data/algeria-padel-verified.json`](../scripts/data/algeria-padel-verified.json).

## What was seeded

Only rows with `inclusion_status=included` **and** `counts_as_distinct_active_location=Yes`
(five active venues). Everything else in the audit stays out of the catalogue:

| Record | Why not seeded |
| --- | --- |
| ALG-ORG-* | Federation / league / benchmark — not a playable venue |
| ALG-HIS-001 (Padel Oxygen) | Permanently closed; same site as OXYGÉN ARENA |
| ALG-CAN-* | Needs confirmation / unverified |
| ALG-EXC-* | False positives (SUP, tennis, nautical, miscoded) |
| ALG-AUD-* | Audit-only market benchmark |

| Id | Listing | Locality |
| --- | --- | --- |
| `research-alg-ven-001` | Area Wellness Club Oran | Bir El Djir |
| `research-alg-ven-002` | Central Padel | Bir El Djir |
| `research-alg-ven-003` | Vibora Padel Club | Bir El Djir |
| `research-alg-ven-004` | Akhy Padel Indoor | Rouiba |
| `research-alg-ven-005` | OXYGÉN ARENA | Chéraga |

## Rules

- Evidence only — names, addresses, phones, websites, coords from the audit (or Nominatim
  locality centroid when the CSV had no pin: Area Wellness → Bir El Djir admin centroid,
  `geo.precision=locality`)
- Price stays `unknown`; court counts omitted from About when sources conflict (Central Padel 9 vs 10)
- About: recommendation tone, no inline URLs/phones
- Idempotent upsert by `research-alg-ven-00N`
- Prior Instagram lead `l-openclaw-viborapadelclub-instagram.com` remains `REVIEW_READY`;
  published canonical for Vibora is `research-alg-ven-003`

```bash
npm run catalog:seed-research-algeria:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-research-algeria
```

Live (2026-09-22): PUBLISHED **20** across **16** countries including DZ.
