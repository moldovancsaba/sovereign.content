# Pending ingest apply queue (padel)

**Owner:** padel chat + SC-central QA  
**Rule:** fixtures may live in `scripts/data/*-verified.json`; live apply only via `ingest/client.ts` when `INGEST_API_KEY` is present. Never Mongo-apply from agent home.

| recordId | Name | File | Status 2026-09-25 |
| --- | --- | --- | --- |
| ZAF-VEN-005 | The Net Social Club | `south-africa-padel-verified.json` | **applied** → `research-zaf-ven-005` DISCOVERED (`scripts/apply-pending-ingest-queue.ts` ~04:05Z) |
| ZAF-VEN-006 | ClubPadel Stellenbosch | `south-africa-padel-verified.json` | **applied** → `research-zaf-ven-006` DISCOVERED |
| SEN-VEN-004 | Blu Padel Ngaparou | `senegal-padel-verified.json` | **applied** → `research-sen-ven-004` DISCOVERED |
| SEN-VEN-005 | Padel Club Ngaparou | `senegal-padel-verified.json` | **applied** → `research-sen-ven-005` DISCOVERED |
| SEN-VEN-006 | PADEL SENEGAL Sports & Family Club | `senegal-padel-verified.json` | **applied** → `research-sen-ven-006` DISCOVERED |
| MAR-VEN-003 | Club Wifaq | `morocco-padel-verified.json` | **applied** → `research-mar-ven-003` DISCOVERED |


| TZA-VEN-003 | Bounce Warehouse | `tanzania-padel-verified.json` | **applied** → `research-tza-ven-003` DISCOVERED (kick ~04:12Z) |
| GHA-VEN-005 | Padel Accra by S2 | `ghana-padel-verified.json` | **applied** → `research-gha-ven-005` DISCOVERED (kick ~04:12Z) |

| MAR-VEN-004 | Padel Square Marrakech | `morocco-padel-verified.json` | **applied** → `research-mar-ven-004` DISCOVERED (tick ~04:18Z) |

| MAR-VEN-005 | AREA Sports & Events Center | `morocco-padel-verified.json` | **applied** → `research-mar-ven-005` DISCOVERED (kick ~04:50Z; fair-use promote) |
| MAR-VEN-006 | Atlas Tennis Padel Marrakech Académie | `morocco-padel-verified.json` | **applied** → `research-mar-ven-006` DISCOVERED (tick ~05:09Z; fair-use promote) |
| MAR-VEN-007 | TCMT Padel Club | `morocco-padel-verified.json` | **applied** → `research-mar-ven-007` DISCOVERED (tick ~05:09Z; FIND Tangier) |

**Evidence:** `scripts/data/pending-ingest-apply-2026-09-25.json` + `kick-ingest-2026-09-25.json` + `tick-ingest-mar-ven-004.json` + `kick-ingest-mar-ven-005-2026-09-25.json` + `kick-ingest-mar-ven-006-007-2026-09-25.json`  
**Honesty:** cards entered the ingest pipeline as `DISCOVERED` (not Mongo-written `PUBLISHED`). Pipeline gate still owns publish.  
**QA note (SC-central):** `INGEST_API_KEY` set on Vercel `padel-africa` + agent env; Mongo catalog entrypoints remain `refuseAgentMongo()` stubs.
