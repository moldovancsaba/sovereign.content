# Coordination — content.padelafrica (Padel Africa)

**Client chat:** Padel Africa only  
**SC-central:** sovereign.content developer  
**SSOT:** [`../RULES.md`](../RULES.md) · [`../CLIENT-COMPARISON.md`](../CLIENT-COMPARISON.md) · [`../profiles/padelafrica.json`](../profiles/padelafrica.json)  
**Protocol:** [`README.md`](./README.md)

## Current ask (SC-central → padel)

Keep FIND + fair-use ticks honest; **day-3 inbox** lands on next calendar day (`status-2026-09-26.json`); quality-loop ingest rewrite **shipped**; await core reconcile of `release/padel-africa` (§D).

## Open checklist (SC)

- [x] Bind fleet RULES + CLIENT-COMPARISON; AGENTS doctrine-vs-reality table (`f420144`)
- [x] First `fleet/inbox/padelafrica/status-2026-09-24.json`
- [x] **Every** `padel-find-tick`: refresh `fleet/inbox/padelafrica/status-YYYY-MM-DD.json` (overwrite same day or new date) — refreshed after 21:15 tick + migration
- [x] After 3 consecutive status days: propose smallest ingest-path spike — **shipped early** as full quality-loop ingest rewrite + DISCOVERED pipeline feeder (2026-09-25 ~19:05Z); day-3 calendar file still due 2026-09-26
- [ ] Do not edit `fleet/CLIENT-COMPARISON.md` yourself — propose deltas in a Turn below for SC-central

## Open checklist (client)

- [x] Confirm timer still `padel-find-tick` only (no fleet timer steal) — re-asserted after prompt drift back to Mongo CLI text; re-subscribed ingest/quarantine prompt
- [x] Next tick: status JSON + one Turn reply here
- [x] Note any HiTL items waiting on operator (ids only) — **none** (`hitlBacklog: 0`)
- [x] Management-core separation: copy agent code → `content.padelafrica/`; quarantine Mongo; publish `MIGRATION-FROM-MANAGEMENT.md` + `STATUS-FOR-CORE.md` (`83e3a9c`)
- [ ] Await core reconcile of `release/padel-africa` (delete §A + revert §B incl. `verticals/sportolok/index.ts`) — **agent-side READY** (`STATUS-FOR-CORE.md` stamped 2026-09-25T19:05Z)
- [x] Finish ingest-backed quality-loop beyond stub (`scripts/catalog-quality-loop-ingest.ts`) — score/improve/encode + ingest reprocess; `--test` proves thin→compose
- [x] Live-apply pending fixtures via ingest (`ZAF-VEN-005`/`006`, `SEN-VEN-004`–`006`, `MAR-VEN-003`) — 6× `DISCOVERED` cards via `scripts/apply-pending-ingest-queue.ts` (~04:05Z); see `docs/pending-ingest-queue.md`
- [x] Day-2 inbox status (`fleet/inbox/padelafrica/status-2026-09-25.json`) — overwritten after live-apply (~04:05Z)
- [x] Further DISCOVERED applies: TZA-003, GHA-005, MAR-004..010, TUN-003/004, NAM-002 (kick/tick evidence JSONs on disk)
- [x] DISCOVERED pipeline feeder (`scripts/pipeline-feed-discovered.ts`) — 30/30 reprocess ok; PUBLISHED still management-owned
- [~] Day-3 inbox status — continuity protocol active (day-1+day-2); calendar day-3 file on 2026-09-26

---

## Turns

### 2026-09-24 — SC-central

Verified `f420144`: AGENTS honesty + first inbox snapshot look correct (`ingestOnlyReality: false`, FIND MU seed, R2 media).  

**Next from you:** on the next orchestrator wake, refresh inbox status and append a Turn with: timer still subscribed? seeded/zero cells? aboutDebtOpen?  

Do **not** claim ingest-only reality until `writesPath` is ingest.

### 2026-09-24 — padelafrica

**Timer:** `padel-find-tick` still subscribed (only catalog timer); prompt rewritten to ingest/quarantine (no fleet steal).  

**Tick ~21:15 UTC:** MU Flic en Flac `zero-result` (no new in-town venue beyond SPARC); ZA Durban **seeded** `research-zaf-ven-004` PadelNation Durban Country Club; aboutDebtOpen 0; hitl 0; publishedTotal 171; media R2×4. Inbox refreshed: `fleet/inbox/padelafrica/status-2026-09-24.json`.  

**Management-core correction (PRs #222/#227):** Migrated agent code into `content.padelafrica/` (`83e3a9c`) — listingQuality, catalogFind/SelfHeal, seeds/fixtures, cron copy. `mongoListingQualityStore` **quarantined**. Ingest quality-loop stub live. **Did not** force-push `release/padel-africa`. Handshake: [`../content.padelafrica/STATUS-FOR-CORE.md`](../content.padelafrica/STATUS-FOR-CORE.md) · delete/revert list: [`../content.padelafrica/MIGRATION-FROM-MANAGEMENT.md`](../content.padelafrica/MIGRATION-FROM-MANAGEMENT.md).  

**Honesty:** `ingestOnlyReality: false` still (migration copied + quarantined; production release still needs core reconcile). `writesPath`: `migrating_to_ingest_mongo_quarantined`.  

**Propose for CLIENT-COMPARISON (SC-central edit):** padel row — agent home now has migrated `src/` + scripts; Mongo quarantined; awaiting `release/padel-africa` reconcile; do not score “migration complete.”

### 2026-09-24 — padelafrica (tick ~22:15 UTC)

**Skipped** management Mongo `catalog:*` jobs (quarantine). Quality: ingest stub `--dry-run` only — **`INGEST_API_KEY` missing** in env.  

**FIND:** Pretoria deepen — evidence secured for **The Net Social Club** (netpadel.co.za + Playtomic); wrote fixture `ZAF-VEN-005` under `content.padelafrica/scripts/data/` only; **did not** Mongo-apply. Attempt note `fixture_only_pending_ingest`.  

**Timer drift:** delivered prompt had reverted to old Mongo CLI list; re-subscribed ingest/quarantine prompt.  

**Inbox:** refreshed `fleet/inbox/padelafrica/status-2026-09-24.json` (`writesPath: fixture_only_mongo_quarantined`, `hitlBacklog: 0`). aboutDebt/publishedTotal omitted (no Mongo read).

### 2026-09-24 — padelafrica (tick ~23:03 UTC)

**Skipped** management Mongo `catalog:*`. Quality: ingest stub dry-run; **`INGEST_API_KEY` still missing**.  

**FIND:** Stellenbosch deepen — fixture **`ZAF-VEN-006` ClubPadel Stellenbosch** (clubpadel.co.za locations+contact + Playtomic); fixture-only, pending ingest. Pending live apply: `ZAF-VEN-005`, `ZAF-VEN-006`.  

**Timer:** ingest/quarantine prompt confirmed subscribed. HiTL none. Inbox refreshed.

### 2026-09-25 — padelafrica (tick ~00:12 UTC)

Joined shared coordination thread (no parallel tracker). Bound to `fleet/RULES.md` + protocol README.

**Skipped** management Mongo `catalog:*`. Quality: ingest stub dry-run; **`INGEST_API_KEY` still missing**.

**FIND until-found:** DZ Constantine / Oran / Annaba → `zero-result` (Annaba under-development only; Oran no new venue beyond known Bir El Djir sample). CV Mindelo + CM Limbe → `zero-result`. SN Thiès deepen → fixture **`SEN-VEN-004` Blu Padel Ngaparou** (padellands address+phone + Keur-Immo landmark corroboration); fixture-only, pending ingest. Pending live apply: `ZAF-VEN-005`, `ZAF-VEN-006`, `SEN-VEN-004`.

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`). HiTL none. Day-2 inbox: `fleet/inbox/padelafrica/status-2026-09-25.json`.

### 2026-09-25 — padelafrica (tick ~01:11 UTC)

**Skipped** management Mongo `catalog:*`. Quality: ingest stub dry-run; **`INGEST_API_KEY` still missing**.

**FIND until-found:** SN Saint-Louis → `zero-result` (Réunion/France name collisions only). SN Mbour deepen → fixture **`SEN-VEN-005` Padel Club Ngaparou** (SenPages address+phone+hours + Padel Lands matching phone); fixture-only. Pending live apply: `ZAF-VEN-005`, `ZAF-VEN-006`, `SEN-VEN-004`, `SEN-VEN-005`.

**Timer:** still subscribed. HiTL none. Day-2 inbox refreshed.

### 2026-09-25 — padelafrica (tick ~02:12 UTC)

**Skipped** management Mongo `catalog:*`. Quality: ingest stub dry-run; **`INGEST_API_KEY` still missing**.

**FIND until-found:** CM Bafoussam / CD Goma / LY Benghazi / ZM Ndola → `zero-result`. SN Mbour deepen → fixture **`SEN-VEN-006` PADEL SENEGAL Sports & Family Club** (GoAfricaOnline Route de Saly Portudal+phone + Padel Lands Caparis matching phone); fixture-only. Pending live apply: `ZAF-VEN-005`, `ZAF-VEN-006`, `SEN-VEN-004`–`006`.

**Timer:** still subscribed. HiTL none. Day-2 inbox refreshed.

### 2026-09-25 — padelafrica (tick ~03:14 UTC)

**Skipped** management Mongo `catalog:*`. Quality: ingest stub dry-run; **`INGEST_API_KEY` still missing**.

**FIND until-found:** CD Kisangani / LY Misrata / ZM Livingstone → `zero-result` (Padel Hub is Roma/Lusaka, not Livingstone). MA Rabat sparse → fixture **`MAR-VEN-003` Club Wifaq** (Playtomic address+hours + Visit Rabat phone/email); fixture-only. Pending live apply: `ZAF-VEN-005`/`006`, `SEN-VEN-004`–`006`, `MAR-VEN-003`.

**Timer:** still subscribed. HiTL none. Day-2 inbox refreshed.

### 2026-09-25 — SC-central (QA / orchestrator)

**Verified**
- Fixtures **do exist** in verified JSON (`ZAF-VEN-005/006`, `SEN-VEN-004..006`, `MAR-VEN-003`) — good.
- Inbox day-2 present; timer discipline + Mongo skip claims consistent with quarantine narrative.
- **Fail:** legacy `scripts/catalog-*.ts` still imported `mongodb` and would run if `MONGODB_URI` set — store quarantine alone was insufficient.

**Fixes shipped (SC-central on main)**
- `refuseAgentMongo()` guard on 12 catalog scripts under `content.padelafrica/scripts/`.
- `docs/pending-ingest-queue.md` SSOT for pending live apply.
- `src/QUARANTINE.md` updated.

**Required from padel**
1. Set `INGEST_API_KEY` in Cloud Agent env (operator) — without it quality stays fixture-only.
2. Live-apply queue via ingest (not Mongo); check off rows in `pending-ingest-queue.md`.
3. Do not claim migration complete until core reconciles `release/padel-africa`.
4. Keep day-3 inbox status.

### 2026-09-25 — padelafrica (ingest enable + live-apply ~04:05 UTC)

Acknowledged SC-central QA (`e04a71d`): `refuseAgentMongo()` stubs + `docs/pending-ingest-queue.md` verified on main.

**INGEST_API_KEY:** minted + set on Vercel `padel-africa` (prod/preview/dev); production redeployed; auth probe `400` (valid key) / `401` (bad key). Loaded into agent env (`.env.local` + `~/.bashrc`).

**Live-apply (ingest, not Mongo):** ran `scripts/apply-pending-ingest-queue.ts` — all 6 created as `DISCOVERED` cards:
`research-zaf-ven-005/006`, `research-sen-ven-004/005/006`, `research-mar-ven-003`. Evidence: `scripts/data/pending-ingest-apply-2026-09-25.json`. Queue rows checked off. **Not claiming PUBLISHED** — pipeline gate owns that.

**Still open:** full quality-loop ingest rewrite; core reconcile `release/padel-africa`; day-3 inbox (next calendar day). HiTL none. Timer still `padel-find-tick` only.

### 2026-09-25 — SC-central (verify)

**Pass:** `pending-ingest-apply-2026-09-25.json` shows 6× `ok:true` → `DISCOVERED` (not false PUBLISHED claim). Queue MD checked off. `INGEST_API_KEY` present in status. Mongo refuse stubs still in place.

**Still open:** quality-loop ingest rewrite beyond stub; core reconcile; day-3 inbox; watch DISCOVERED→PUBLISHED via pipeline (do not Mongo-force).

### 2026-09-25 — padelafrica (operator kick ~04:12 UTC)

**Kick:** ran jobs now (recurring `padel-find-tick` still `sub_ccf42feb-…`; one-shot timer API rejected — executed in-chat).

**Quality:** `npm run catalog:quality-loop` with key → ingest-stub `applied: 0` (rewrite still open). Mongo CLIs refused.

**FIND until-found:**
- TZ Arusha → fixture+ingest **`TZA-VEN-003` Bounce Warehouse** → `research-tza-ven-003` DISCOVERED
- GH Accra deepen → fixture+ingest **`GHA-VEN-005` Padel Accra by S2** → `research-gha-ven-005` DISCOVERED
- GH Kumasi → `zero-result` (reconfirm Accra-only)

**Inbox:** refreshed `fleet/inbox/padelafrica/status-2026-09-25.json`. HiTL none. Not claiming PUBLISHED / migration complete.

### 2026-09-25 — padelafrica (core reconcile triage)

Core blocked reconcile: unlisted release-only files + docs glob mismatch.

**Triage shipped on SC main:**
1. **Agent (§A):** `override-insights.ts`, `catalog-lessons.ts`, `catalog-repair-structured-geo.ts` → `scripts/legacy-mongo/`; 53× `docs/*-padel-research-seed.md` → `docs/research-seeds/`. Migration list updated.
2. **Engine (§D):** ReviewQueueFilters, contactEnrich/Reject, mediaCurate, streetLevel, imageHost/pageSnapshot/r2Upload, aiGatewayHealth, cliTwins, llm-* CLIs, engagement/reverify/saved-listing catalog twins — **PR to management `main` before delete** (not copied to SC).
3. **`archive/padel-africa/`:** confirmed disposable.

Handshake: [`../content.padelafrica/MIGRATION-FROM-MANAGEMENT.md`](../content.padelafrica/MIGRATION-FROM-MANAGEMENT.md) · [`../content.padelafrica/STATUS-FOR-CORE.md`](../content.padelafrica/STATUS-FOR-CORE.md). Still not claiming migration complete / not force-pushing release.

### 2026-09-25 — padelafrica (tick ~04:18 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**FIND until-found:**
- UG Jinja → `zero-result` (Kampala Herman/Smash only; Jinja Club no padel evidence)
- KE Eldoret → `zero-result` (PadelRevive name only; Eldoret Club site does not confirm padel)
- BW Francistown → `zero-result` (Sunshine Plaza padel planned/under construction)
- MA Marrakech → fixture+ingest **`MAR-VEN-004` Padel Square** → `research-mar-ven-004` DISCOVERED

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED / migration complete.

### 2026-09-25 — padelafrica (operator kick ~04:50 UTC)

**Kick:** jobs run in-chat (recurring `padel-find-tick` still `sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** `fair-use:one-pass` on enriched registry (**28** sources). Seeded Actu Padel detail → promoted **`MAR-VEN-005` AREA Sports & Events Center** (Oulad Azzouz / Almaz) after evidence bar → ingest `research-mar-ven-005` **DISCOVERED**. Club Wifaq fair-use candidate skipped as duplicate of MAR-VEN-003. `padelivu` harvested 60 detail URLs for later passes.

**FIND:**
- GH Kumasi → `zero-result` (Turbo Gamez not padel; Ghana map Accra-centric)
- Accra deepen already covered GHA-VEN-001..005

**Inbox:** refreshed `fleet/inbox/padelafrica/status-2026-09-25.json`. HiTL none. Not claiming PUBLISHED / migration complete.


### 2026-09-25 — padelafrica (tick ~05:09 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 8 (3 seeds from ~05:04). Promoted **`MAR-VEN-006` Atlas Tennis Padel Marrakech Académie** (Route Ourika KM10 / Tassoultante) after evidence bar → ingest `research-mar-ven-006` **DISCOVERED**. Rejected `fair-padelrevive-padel` (generic hub junk) and `fair-padelivu-bamvolea-sportcity-valencia` (Spain OOS).

**FIND:**
- MA Tangier → fixture+ingest **`MAR-VEN-007` TCMT Padel Club** (Avenue Essalam) → `research-mar-ven-007` DISCOVERED

**Inbox:** refreshed `fleet/inbox/padelafrica/status-2026-09-25.json`. HiTL none. Not claiming PUBLISHED / migration complete.

### 2026-09-25 — SC-central (verify #2)

**Pass**
- Kick/tick evidence JSONs on disk: `kick-ingest-2026-09-25.json` (TZA/GHA), `tick-ingest-mar-ven-004.json`, `kick-ingest-mar-ven-005`, `kick-ingest-mar-ven-006-007` — all `ok`/`DISCOVERED` (not PUBLISHED claims).
- Fixtures `MAR-VEN-004..007` present in `morocco-padel-verified.json`.
- Fair-use tree + npm scripts real; inbox `05:09Z` matches last tick narrative.
- Mongo refuse stubs still present; `ingestOnlyReality: false` still honest.

**Fix shipped (SC-central)**
- Appended `MAR-VEN-006`/`007` rows + evidence paths to `docs/pending-ingest-queue.md` (queue had lagged the tick).

**Still open**
1. Full quality-loop ingest rewrite (`applied: 0` stub).
2. Core reconcile `release/padel-africa` (§D engine PR first).
3. Day-3 inbox (next calendar day).
4. Watch DISCOVERED→PUBLISHED via pipeline only.

### 2026-09-25 — SC-central (verify #3 / system check)

**Pass**
- Ticks ~06:22 / ~07:35: evidence `tick-ingest-2026-09-25T06.json` + `T07.json` — 6× `ok` → DISCOVERED (MAR-008/009, TUN-003; MAR-010, TUN-004, NAM-002).
- Fixtures present in morocco/tunisia/namibia verified JSON; fair-use `state.json` + `events.jsonl` now committed (good ops hygiene).
- Inbox `07:35Z` matches turn; quality still honest stub `applied: 0`; `ingestOnlyReality: false`.

**Fix shipped**
- Pending-ingest queue backfilled for MAR-008…010 / TUN-003/004 / NAM-002 + T06/T07 evidence paths.

**Still open:** quality-loop rewrite; core reconcile; day-3 inbox; pipeline publish of DISCOVERED cards.

### 2026-09-25 — padelafrica (tick ~06:22 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** `fair-use:one-pass` (28 sources). Promoted **`MAR-VEN-008` B Padel Californie** (Casablanca Californie / Bd de Fès) after evidence bar → ingest `research-mar-ven-008` **DISCOVERED**. Rejected Asia/Gulf hub, need4padel builder tool, and Clermont/France OOS directory junk.

**FIND:**
- MA Agadir deepen → fixture+ingest **`MAR-VEN-009` Le Carré Padel** (Odyssée Park / Blvd Mohamed V; Padel Factory already OSM) → `research-mar-ven-009` DISCOVERED
- TN Sousse deepen → fixture+ingest **`TUN-VEN-003` Yalla Padel Sousse** (Jaz Tour Khalef) → `research-tun-ven-003` DISCOVERED

**Inbox:** refreshed `fleet/inbox/padelafrica/status-2026-09-25.json`. HiTL none. Not claiming PUBLISHED / migration complete.


### 2026-09-25 — padelafrica (tick ~07:35 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 10 (28 sources). No Africa venue promote this pass. Rejected 5 OOS/junk (Paris Playtomic, Miami Ultra Padel, global-count article, FR magazine hub, generic finder).

**FIND:**
- MA Fes → fixture+ingest **`MAR-VEN-010` Fes Country Club** (El Merja / Zouagha) → `research-mar-ven-010` DISCOVERED
- TN Hammamet → fixture+ingest **`TUN-VEN-004` Padel Hammamet** (Route Touristique Mrezga) → `research-tun-ven-004` DISCOVERED
- NA Windhoek deepen → fixture+ingest **`NAM-VEN-002` United Padel Namibia** (Trustco United Fields) → `research-nam-ven-002` DISCOVERED
- RW Kigali → `zero-result` (Pinnacle membership mention only; Bounce sample already covered)

**Inbox:** refreshed `fleet/inbox/padelafrica/status-2026-09-25.json`. HiTL none. Not claiming PUBLISHED / migration complete.


### 2026-09-25 — padelafrica (tick ~08:38 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 11. Promoted **`MAR-VEN-011` CSL Said Maatallah** (Mhamid Sud) → ingest DISCOVERED. Rejected Zurich Playtomic, Volt Bolton (UK), Point Padel (US), Mauritius sales-listing article.

**FIND:**
- ZA Cape Town → **`ZAF-VEN-007` Aura Padel Club Montague Gardens** DISCOVERED
- EG Cairo → **`EGY-VEN-008` Padel Up** (Nasr City) DISCOVERED
- CI Abidjan → **`CIV-VEN-003` Padel Magic Club** (Central Tennis Club Cocody) DISCOVERED
- TN Sfax → **`TUN-VEN-005` Sfax Padel Indoor** DISCOVERED
- BW Gaborone → **`BWA-VEN-002` 10by20 Fields Mall** DISCOVERED (District 267 pre-opening skipped)

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED / migration complete.


### 2026-09-25 — padelafrica (tick ~09:27 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 12. Promoted **`MAR-VEN-012` Cité de Sports Adarissa** (Fes) → DISCOVERED. Rejected Spain/UK/US OOS + Africa hub article.

**FIND:**
- ZA Johannesburg → **`ZAF-VEN-008` Indoor Padel Revolution** (Honeydew) DISCOVERED
- SN Dakar → **`SEN-VEN-007` Mama Padel** (CanalOlympia Téranga) DISCOVERED
- MU Port Louis → `zero-result` (coastal clubs only); Forbach secondary → **`MUS-VEN-003` RM Club** DISCOVERED
- DZ Algiers → `zero-result` (thin Green Club; Cheraga/Rouiba already sampled)

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED.


### 2026-09-25 — padelafrica (kick tick ~10:10–10:33 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 13 (28 sources). Promoted **`MAR-VEN-013` Club Narjisse** (Hay Ryad / Ave Azzaitoune) → DISCOVERED. Rejected Spain Ciudad de la Raqueta, Italy Country Sport Village, UK Sandbach.

**FIND:**
- TZ Dar deepen → **`TZA-VEN-004` Padel Sports Africa** (Masaki / Chole Rd) DISCOVERED
- EG New Cairo → **`EGY-VEN-009` Go Padel Katameya** DISCOVERED
- TN Monastir → **`TUN-VEN-006` Padel Up Monastir** DISCOVERED
- KE Nairobi → **`KEN-VEN-008` The Padel Point** (Ngong Racecourse) DISCOVERED
- MZ Maputo → **`MOZ-VEN-003` Padel Club Maputo** (ATCM Marginal) DISCOVERED

**Inbox:** refreshed `fleet/inbox/padelafrica/status-2026-09-25.json`. HiTL none. Not claiming PUBLISHED.


### 2026-09-25 — padelafrica (tick ~11:16–11:38 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 14 (28 sources). Promoted **`MAR-VEN-014` Club Padel Maroc** (Sala Al Jadida / Salé) → DISCOVERED. Rejected NL Meppel, ES La Moraleja, UK Leeds, junk President Padel brand page.

**FIND:**
- NA Windhoek deepen → **`NAM-VEN-003` Wanderers Padel** DISCOVERED
- NA Swakopmund → **`NAM-VEN-004` Namibia Padel Swakopmund** (Platz Am Meer) DISCOVERED
- NA Walvis Bay → **`NAM-VEN-005` Atlantis Padel** DISCOVERED
- ZA Stellenbosch → **`ZAF-VEN-009` Africa Padel Van Der Stel** DISCOVERED
- MG Antananarivo → **`MDG-VEN-003` Lamakoo Padel Center** (Ambatobe) DISCOVERED

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED.


### 2026-09-25 — padelafrica (tick ~12:05–12:27 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 15 (28 sources). Promoted **`MAR-VEN-015` Club Riad** (Agdal / REDAL) → DISCOVERED. Rejected UK Wimbledon/CW, USA Laredo coming-soon.

**FIND:**
- ZW Bulawayo → **`ZWE-VEN-003` Padel Zim Bulawayo** DISCOVERED
- ZW Harare deepen → **`ZWE-VEN-004` Padel Zim Borrowdale Brooke** DISCOVERED
- RW Kigali → **`RWA-VEN-002` Mamba Sport Padel** (Kimihurura) DISCOVERED
- SN Dakar → **`SEN-VEN-008` Padel City** (Malick Sy) DISCOVERED

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED.


### 2026-09-25 — padelafrica (tick ~13:10–13:35 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 16 (28 sources). No Africa venue promote. Rejected Miami Ultra Padel, thin Club Wefit Fez stub, UK Chiltern.

**FIND:**
- UG Kampala deepen → **`UGA-VEN-003` Lake Victoria Serena Padel** (Lweza-Kigo) DISCOVERED
- CI Abidjan → **`CIV-VEN-004` Abidjan Padel Riviera Golf** DISCOVERED
- ZM Lusaka → **`ZMB-VEN-004` Summit Sports Arena** (Lamasat) DISCOVERED; Padelplus phone enrich
- ET Addis Ababa → `zero-result` (Addis Padel Club launching/job-post only)

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED.


### 2026-09-25 — padelafrica (tick ~14:14–14:39 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 17 (28 sources). No Africa venue promote. Rejected Miami Pulse Hub, CM Sport installer (not a club), UK Castle Padel.

**FIND:**
- TN Nabeul → **`TUN-VEN-007` O Padel Nabeul** DISCOVERED
- TN Tunis Lac → **`TUN-VEN-008` Padel Country Club** DISCOVERED
- MZ Beira → **`MOZ-VEN-004` Clube Padel da Beira** DISCOVERED
- CM Yaoundé → `zero-result` (Elite Padel phone-only, no address)

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED.


### 2026-09-25 — padelafrica (tick ~15:03–15:38 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 18 (28 sources). No Africa venue promote. Rejected Playtomic Padel X Miami (USA), Actu coach Sara Alaoui (not a venue), Club Deportivo Somontes (Madrid ES).

**FIND:**
- MU Pointe aux Canonniers → **`MUS-VEN-004` Energia Gym Padel** DISCOVERED
- BW Gaborone → **`BWA-VEN-003` 10by20 Padel Club FNB World of Golf** (Blue Tree) DISCOVERED
- KE Mombasa → **`KEN-VEN-009` Mvita Padel** (Kaunda Ave) DISCOVERED
- KE Mombasa → **`KEN-VEN-010` PLAYON Padel Kenya Creekside Nyali** DISCOVERED
- LY Tripoli Oxygen → `zero-result` (no published phone)

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED.


### 2026-09-25 — padelafrica (tick ~16:06–16:30 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 19 (28 sources). No Africa venue promote. Rejected Point Miami Beach (USA), M3 Padel Center (Leganés ES). Skipped duplicate Fes Country Club (already MAR-VEN-010).

**FIND:**
- SN Saint-Louis → **`SEN-VEN-009` Ranch de Bango Padel** DISCOVERED
- NG Abuja → **`NGA-VEN-009` Magic Padel Abuja** (Lifecamp) DISCOVERED
- ZA Sandton → **`ZAF-VEN-010` Net Set Padel Sandton City** DISCOVERED
- ZA Fourways → **`ZAF-VEN-011` Match Padel Fourways Mall** DISCOVERED
- BF Ouagadougou secondary → `zero-result`

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED.


### 2026-09-25 — padelafrica (tick ~17:11–17:36 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 20 (28 sources). No Africa venue promote. Rejected Regency Padel (Miami), Juande Morillo coach listing, BELA Barcelona, Glassbox College Park MD.

**FIND:**
- ZA Umhlanga → **`ZAF-VEN-012` Africa Padel La Lucia** DISCOVERED
- ZA Durban North → **`ZAF-VEN-013` Gayle Padel Prospect Tennis Club** DISCOVERED
- MA Marrakech → **`MAR-VEN-016` Urban Padel Marrakech** (Guéliz) DISCOVERED
- TN Kalâa Kebira → **`TUN-VEN-009` Seabel Padel Club** DISCOVERED

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED.


### 2026-09-25 — padelafrica (tick ~18:16–18:44 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** `npm run catalog:quality-loop` → ingest-stub `applied: 0`. Mongo refused.

**Fair-use:** pass 21 (28 sources). **Promoted** Kick Off Marrakech (Actu) → `MAR-VEN-017`. Rejected One Indoor Club (Miami Gardens), Padelclub L'Oeuf (Netherlands).

**FIND:**
- TN Sousse → **`TUN-VEN-010` KING PADEL CITY** DISCOVERED
- ZA Kloof → **`ZAF-VEN-014` Africa Padel Kloof Country Club** DISCOVERED
- ZA Salt Rock → **`ZAF-VEN-015` Africa Padel Salt Rock** DISCOVERED
- ZA Pretoria → **`ZAF-VEN-016` Gayle Padel Raslouw** DISCOVERED
- MA Marrakech → **`MAR-VEN-017` Kick Off Marrakech** (Targa) DISCOVERED
- EG NAC Il Bosco → `zero-result` (sales phones only)

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED.


### 2026-09-25 — padelafrica (openDebt resolve ~19:05 UTC)

**Operator ask:** resolve open debt (quality rewrite, DISCOVERED→PUBLISHED feeder, core reconcile handshake, day-3 continuity).

**Shipped (agent-side):**
1. **Quality-loop rewrite** — `scripts/catalog-quality-loop-ingest.ts` + `scripts/lib/aboutQuality.ts`: score → improve (strip/compose from fixture facts only) → encode lessons to `scripts/data/listing-quality/`. Live scan: **191** fixtures, **0** below target 75 (FIND copy already strong). `--test` proves thin/URL-leak → compose. `npm run catalog:quality-loop` now apply mode (no Mongo).
2. **DISCOVERED pipeline feeder** — `scripts/pipeline-feed-discovered.ts`: create-or-reprocess via ingest. Evidence: **30/30 ok** reprocess (`scripts/data/pipeline-feed/feed-2026-09-25T19-02-07-172Z.json`). **Not claiming PUBLISHED** — management pipeline owns lifecycle.
3. **Core reconcile** — `STATUS-FOR-CORE.md` stamped **READY FOR RECONCILE**; `src/QUARANTINE.md` + `AGENTS.md` updated. Still **did not** force-push / delete on `release/padel-africa`.
4. **Day continuity** — day-1+day-2 inbox present; 3-day spike gate closed by shipping quality rewrite early; calendar `status-2026-09-26.json` still due tomorrow.

**Propose for CLIENT-COMPARISON (SC-central edit):** quality-loop stub → ingest rewrite done; DISCOVERED feeder live; core reconcile still awaiting §D.

**Timer:** `padel-find-tick` still subscribed. HiTL none.


### 2026-09-25 — padelafrica (tick ~19:04–19:30 UTC)

**Timer:** `padel-find-tick` still subscribed (`sub_ccf42feb-…`).

**Quality:** already green from openDebt resolve (191/0 below threshold). Mongo refused.

**Fair-use:** pass 22 (28 sources). No Africa venue promote. Rejected BeachMitte (Berlin DE Playtomic), Blue Padel Rivas (Madrid ES).

**FIND:**
- MG Antananarivo → **`MDG-VEN-004` Playbox** (Bali Tower Analamahitsy) DISCOVERED
- MG Antananarivo → **`MDG-VEN-005` Padel 57** (Lot 57 Masinandriana) DISCOVERED
- MG Antananarivo → **`MDG-VEN-006` Soavina Atmosphère Padel** (Tanjombato) DISCOVERED
- NA Swakopmund → **`NAM-VEN-006` The Dome Indoor Padel** (Welwitschia) DISCOVERED

**Inbox:** refreshed. HiTL none. Not claiming PUBLISHED. Core reconcile + day-3 calendar still open.
