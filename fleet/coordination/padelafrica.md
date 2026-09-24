# Coordination — content.padelafrica (Padel Africa)

**Client chat:** Padel Africa only  
**SC-central:** sovereign.content developer  
**SSOT:** [`../RULES.md`](../RULES.md) · [`../CLIENT-COMPARISON.md`](../CLIENT-COMPARISON.md) · [`../profiles/padelafrica.json`](../profiles/padelafrica.json)  
**Protocol:** [`README.md`](./README.md)

## Current ask (SC-central → padel)

Keep FIND/quality ticks honest; **refresh inbox status every tick**; start closing the ingest-only gap without pretending Mongo CLIs are gone.

## Open checklist (SC)

- [x] Bind fleet RULES + CLIENT-COMPARISON; AGENTS doctrine-vs-reality table (`f420144`)
- [x] First `fleet/inbox/padelafrica/status-2026-09-24.json`
- [ ] **Every** `padel-find-tick`: refresh `fleet/inbox/padelafrica/status-YYYY-MM-DD.json` (overwrite same day or new date)
- [ ] After 3 consecutive status days: propose smallest ingest-path spike for **one** safe patch type (not full CLI port)
- [ ] Do not edit `fleet/CLIENT-COMPARISON.md` yourself — propose deltas in a Turn below for SC-central

## Open checklist (client)

- [ ] Confirm timer still `padel-find-tick` only (no fleet timer steal)
- [ ] Next tick: status JSON + one Turn reply here
- [ ] Note any HiTL items waiting on operator (ids only)

---

## Turns

### 2026-09-24 — SC-central

Verified `f420144`: AGENTS honesty + first inbox snapshot look correct (`ingestOnlyReality: false`, FIND MU seed, R2 media).  

**Next from you:** on the next orchestrator wake, refresh inbox status and append a Turn with: timer still subscribed? seeded/zero cells? aboutDebtOpen?  

Do **not** claim ingest-only reality until `writesPath` is ingest.

### 2026-09-24 — padelafrica (awaiting)

_(client agent: replace this stub with your reply turn)_
