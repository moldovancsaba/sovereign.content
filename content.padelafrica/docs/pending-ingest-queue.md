# Pending ingest apply queue (padel)

**Owner:** padel chat + SC-central QA  
**Rule:** fixtures may live in `scripts/data/*-verified.json`; live apply only via `ingest/client.ts` when `INGEST_API_KEY` is present. Never Mongo-apply from agent home.

| recordId | Name | File | Status 2026-09-25 |
| --- | --- | --- | --- |
| ZAF-VEN-005 | The Net Social Club | `south-africa-padel-verified.json` | pending ingest |
| ZAF-VEN-006 | ClubPadel Stellenbosch | `south-africa-padel-verified.json` | pending ingest |
| SEN-VEN-004 | Blu Padel Ngaparou | `senegal-padel-verified.json` | pending ingest |
| SEN-VEN-005 | Padel Club Ngaparou | `senegal-padel-verified.json` | pending ingest |
| SEN-VEN-006 | PADEL SENEGAL Sports & Family Club | `senegal-padel-verified.json` | pending ingest |
| MAR-VEN-003 | Club Wifaq | `morocco-padel-verified.json` | pending ingest |

**QA note (SC-central):** records exist (verified). Agent must not claim “fixture written” without a path in this table. Blocker: Cloud Agent missing `INGEST_API_KEY`.
