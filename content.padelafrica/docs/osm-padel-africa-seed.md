# OSM seed — Padel Africa catalogue batches

## Batch 1 — first 10 (one per country)

Snapshot: [`scripts/data/osm-padel-africa-10.json`](../scripts/data/osm-padel-africa-10.json).

| CC | Listing | Locality |
| --- | --- | --- |
| MZ | Padel Club Maputo | Cidade de Maputo |
| ZA | Africa Padel V&A | Cape Town |
| AO | Clube de Padel de Angola (CPA) | Talatona |
| CI | Ace padel | Marcory |
| MA | Padel Factory | Agadir |
| TN | Padel in Mourouj | Mourouj |
| NA | Namibia Padel | Swakopmund |
| KE | Pulse Padel Gigiri | Nairobi |
| TZ | Padel Sports Africa | Dar es Salaam |
| EG | Neon Padel | Cairo |

```bash
node scripts/seed-osm-padel-africa-10.standalone.mjs --dry-run
MONGODB_URI=... MONGODB_DB=padel-africa node scripts/seed-osm-padel-africa-10.standalone.mjs
```

## Batch 2 — next uncovered countries (OSM ceiling)

Snapshot: [`scripts/data/osm-padel-africa-next.json`](../scripts/data/osm-padel-africa-next.json).

After batch 1, Nominatim + Overpass across the remaining African ISO countries found **only five** named (or name-attributable) padel venues in countries that still had zero listings. Real clubs exist in NG/GH/BW and others, but they are **not on OpenStreetMap** yet — this batch does not invent them.

| CC | Listing | Locality | Evidence |
| --- | --- | --- |
| BJ | Cotonou Padel Club | Togbin-Fandji | Named `leisure=sports_centre` + `sport=padel` |
| CM | Elite Padel | Yaoundé | Named club + phone/website on OSM |
| MG | Lamakoo Padel center | Antananarivo | Named tourism attraction (padel in name) |
| GM | Padel Club Gambia | Sukuta | Named `leisure=pitch` + `sport=padel` |
| ZW | Old Georgians Sports Club | Harare | Named sports centre; two `sport=padel` pitches inside its polygon |

Also mapped but **not seeded** (no honest listing name):

- SN — unnamed `sport=padel` pitch (Almadies, Dakar)
- GQ — unnamed padel pitches near Mookata Resort (outside resort polygon)
- RE — unnamed padel pitches (Nominatim country `fr`)
- ZM — unnamed pitches only

```bash
npm run catalog:seed-osm-padel-next:dry
MONGODB_URI=... MONGODB_DB=padel-africa npm run catalog:seed-osm-padel-next
```

## About copy

Curated visitor recommendations live in Mongo `listing_curated_abouts` (keyed by listing id) and on
`listings.description`. They are **not** stored in the git repository. The seeder prefers these
Mongo overrides over the tag template when present.

Rules for About text:

- Recommendation tone and proper length (~300–450 characters) — place, why go, who it’s for
- **No inline URLs** (`validatePublicDescription` rejects them); website/phone stay in contact fields
- No “OSM lists…”, no coordinates, no “More at …” / “Call …” dumps
- Facts from OSM/Nominatim plus corroborated public club pages when available

The **listing quality loop** (`docs/listing-quality-loop.md`) prefers these curated Abouts when it
rewrites weak published descriptions (`npm run catalog:quality-loop`).
