# Fair-use source expansion — 2026-09-25

**Goal:** find **20 new** sites that list padel venues, clubs, events, or shops for the
`scripts/fair-use/` feeder (citation only → official club URL for Find/ingest).

**Already in registry (not counted):** padellands, analistas, padel-without-borders, ballejaune,
playtomic, matchpoint, padel-maroc, actu-padel.

## Added (20) — HTTP 200 verified 2026-09-25

| # | Id | URL | Role |
| --- | --- | --- | --- |
| 1 | `padelrevive` | https://padelrevive.com/padel-clubs-in-africa/ | Africa/Asia/Gulf mapped club directories + CSV |
| 2 | `findapadelcourt-za` | https://findapadelcourt.co.za/ | South Africa venue finder (200+ venues) |
| 3 | `africapadel` | https://www.africapadel.com/ | Africa Padel club network (SA) |
| 4 | `padelivu` | https://padelivu.com/clubs | Global clubs map (~6k / 90 countries) |
| 5 | `padelmap` | https://padelmap.net/ | Courts by country/city (incl. UAE, Africa) |
| 6 | `padel-llc` | https://padel.llc/ | OSM `sport=padel` facilities (~8k) |
| 7 | `need4padel` | https://need4padel.com/ | Industry + pro-shop / equipment directory |
| 8 | `worldpadelnetwork` | https://www.worldpadelnetwork.com/padel-businesses/ | Verified padel businesses |
| 9 | `padelsearch` | https://padelsearch.info/web | Stakeholders: centers, events, manufacturing |
| 10 | `padel-magazine-uk` | https://www.padel-magazine.co.uk/club-directory/ | Clubs + shop + agenda |
| 11 | `padelmagazine-fr` | https://padelmagazine.fr/annuaires/ | FR annuaires + calendrier |
| 12 | `padelfip` | https://www.padelfip.com/live/ | Official FIP tournament calendar |
| 13 | `premierpadel` | https://premierpadel.com/en/home-page | Premier Padel tour calendar/venues |
| 14 | `thepadeldirectory` | https://www.thepadeldirectory.co.uk/ | UK courts / events / holidays |
| 15 | `matchi` | https://www.matchi.se/ | MATCHi booking network |
| 16 | `anybuddy` | https://www.anybuddyapp.com/ | Anybuddy racket marketplace |
| 17 | `padelusa` | https://padelusa.org/ | USPA club map |
| 18 | `padelbrowser` | https://www.padelbrowser.com/ | US club directory (powers USPA map) |
| 19 | `bounce-game` | https://www.bounce.game/ | Clinics / leagues / open-play demand |
| 20 | `totalpadel` | https://www.totalpadel.com/ | Equipment retail / shop |

Registry: [`scripts/fair-use/sources.json`](../scripts/fair-use/sources.json) (28 sources total).

## Checked but not added (this pass)

| URL | Why skipped |
| --- | --- |
| https://trustpadel.com/ | HTTP 403 from research UA — soft-skip later via citation inbox |
| https://mypadelway.com/ | HTTP 403 |
| https://www.padelsnipe.com/ | unreachable |
| https://www.padelinsight.com/ | domain for sale |
| https://4padel.com/ | unreachable |
| https://www.urbanpadel.com/ | 404 |
| https://egyptpadel.com/ | unreachable |
| Single-venue operators (e.g. wepadeleg.com) | not multi-listing directories |
| https://www.tunisie-padel.com/ | verified 200 — backlog candidate |
| https://padeli.com/ | verified 200 (Gulf) — backlog |
| https://www.courtpro.com/ | verified 200 — backlog |
| https://padelshop.com/ / https://padelmarket.com/ | verified 200 shops — backlog |
| https://www.padeladdict.com/ | verified 200 news — backlog |
| https://www.hexagonworldseries.com/ | events — backlog |

## Fair-use reminder

Directories/events/shops are **citations**. Confirm official club website + evidence bar before
fixture → ingest. One page per source per pass; soft-skip CF/403.
