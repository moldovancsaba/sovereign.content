# Padel Africa — research audit coverage

Evidence-only country audits (five-minute verified CSVs) vs live published catalogue.

Live snapshot (2026-09-24 FIND until-found Giza): **161 PUBLISHED / 42 countries**.

## Audits processed (this PR series)

| Country | ISO | Outcome | Listing ids / notes |
| --- | --- | --- | --- |
| Algeria → Sudan | … | Prior + this PR | Through `release/padel-africa` #222 + #225 |
| Benin | BJ | **OSM enrich only** | `osm-node-13440135409` Cotonou Padel Club |
| Mozambique | MZ | Seeded 2 + OSM Maputo enrich | `research-moz-ven-*` |
| Namibia | NA | Seeded 1 + OSM Swakopmund enrich | `research-nam-ven-001` |
| Niger | NE | **Zero result** | |
| Nigeria | NG | Seeded 4 Lagos sample | `research-nga-ven-*` |
| Rwanda | RW | Seeded 1 | `research-rwa-ven-001` |
| Senegal | SN | Seeded 3 | `research-sen-ven-001`–`003` (Palmeraie + Dakar Padel Club + REBEL PADEL Sahm via `catalog:find`) |
| Seychelles | SC | Seeded 2 | `research-syc-ven-*` |
| Sierra Leone | SL | Seeded 2 | `research-sle-ven-*` |
| Somalia | SO | Seeded 1 | `research-som-ven-001` (Hargeisa) |
| South Africa | ZA | Seeded 3 + OSM V&A enrich | `research-zaf-ven-*` |
| South Sudan | SS | **Zero result** | |
| Sudan | SD | **Zero result** | |
| Tanzania | TZ | Seeded 2 + OSM | `research-tza-ven-001`–`002` (Padel Centre TZ Slipway + The Hub Bwejuu via `catalog:find`) + `osm-node-13937004559` |
| Togo | TG | Seeded 2 | `research-tgo-ven-*` |
| Tunisia | TN | Seeded 2 + OSM Mourouj enrich | `research-tun-ven-*` |
| Uganda | UG | Seeded 2 | `research-uga-ven-*` |
| Zambia | ZM | Seeded 3 | `research-zmb-ven-001`–`003` (Deuce + Padelplus + Xtreme via `catalog:find`) |
| Zimbabwe | ZW | Seeded 2 + OSM Old Georgians enrich | `research-zwe-ven-*` |
| Libya | LY | Seeded 3 | `research-lby-ven-001`–`003` (Padel House + Zeyani + Mendoza via `catalog:find`) |
| Equatorial Guinea | GQ | Seeded 2 | `research-gnq-ven-001`–`002` (Sport Club Malabo + Ukomba Bata via `catalog:find`) |
| Kenya | KE | Seeded 7 + OSM | Nairobi sample + FIND Mombasa `005`–`006` + **FIND Nakuru** `research-ken-ven-007` (Royal Padelzone Pavilion) + Pulse OSM |
| Egypt | EG | Seeded 5 + OSM | Alexandria sample + **FIND until-found Giza** `research-egy-ven-005` (Pro Padel Egypt Le Jardin) + Neon OSM |
| São Tomé and Príncipe | ST | **Zero result** | Continent FIND brief 2026-09-24 — no operating club evidence |

## Live OSM-only research status

All previously live OSM-only countries (BJ, MZ, NA, TN, TZ, ZA, ZW) now have a research pass (seed and/or enrich).

## Next (optional)

Prefer `npm run catalog:find -- --until-found --max-cells 8` and **execute the campaign**
(WebSearch cells until one seeds or budget exhausted). `--next` is single-cell only.
City-scoped deepen for large markets (EG, GH, MA, NG, ZA) and sparse n=1 cells; cooled
zero-result missings rotate.

Zero-result audits are first-class (archive CSV + summary JSON; no seed script).

## Quality loop posture

- Curated Abouts in Mongo `listing_curated_abouts` (applied onto `listings.description`)
- Scheduled path: listing quality loop on by default (`LISTING_QUALITY_LOOP=false` to refuse)
- `/stats` card feedback → `operator_feedback` (never paste notes into About)
