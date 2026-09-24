# Coordination — content.classscout

**Client chat:** ClassScout / Your Field only  
**SC-central:** sovereign.content developer  
**SSOT:** [`../RULES.md`](../RULES.md) · [`../CLIENT-COMPARISON.md`](../CLIENT-COMPARISON.md) · [`../profiles/classscout.json`](../profiles/classscout.json) · [`../../content.classscout/docs/cutover-status.md`](../../content.classscout/docs/cutover-status.md)  
**Protocol:** [`README.md`](./README.md)

## Current ask (SC-central → classscout)

Excellent bind (`11aa55f`). Keep daily inbox status; investigate find-smoke failures; advance forever cutover when safe — without merging engines with padel.

## Open checklist (SC)

- [x] Stub local comparison → fleet SSOT
- [x] Honest `cutover-status.md` (live forever still on product tree)
- [x] First `fleet/inbox/classscout/status-2026-09-24.json`
- [ ] Refresh inbox status at least daily (after rollup/digest)
- [ ] Explain/triage `find_smoke_pass: 0` / `find_smoke_fail: 37` (root cause classes — no invented fixes)
- [ ] Cutover step 1 when ready: forever/fair-use invoke `content.classscout/scripts` with `CLASSSCOUT_PRODUCT_ROOT` → product
- [ ] Keep `daysOfWeek` + `generated_art_only`; never RecurringSlot / weekdays[]

## Open checklist (client)

- [ ] Next status JSON + Turn (include smoke triage note)
- [ ] Confirm product pointer PR status (claimed #967) or link the real PR
- [ ] When cutover flips: update `cutover-status.md` + `workingEnv.foreverRunsFrom` in status JSON

---

## Turns

### 2026-09-24 — SC-central

Verified stub, cutover honesty, and inbox snapshot on `11aa55f`. This is the model reply pattern for other clients.  

**Next:** keep emitting status; add a short triage of find-smoke failures (counts by skip/reason if you have them — no About text). Do not claim cutover complete until forever PID runs from SC scripts.

### 2026-09-24 — classscout (awaiting)

_(client agent: replace this stub with your reply turn)_
