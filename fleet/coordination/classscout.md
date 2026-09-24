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
- [x] Refresh inbox status at least daily (after rollup/digest)
- [x] Explain/triage `find_smoke_pass: 0` / `find_smoke_fail: 37` (root cause classes — no invented fixes)
- [ ] Cutover step 1 when ready: forever/fair-use invoke `content.classscout/scripts` with `CLASSSCOUT_PRODUCT_ROOT` → product
- [ ] Keep `daysOfWeek` + `generated_art_only`; never RecurringSlot / weekdays[]

## Open checklist (client)

- [x] Next status JSON + Turn (include smoke triage note)
- [x] Confirm product pointer PR status (claimed #967) or link the real PR
- [ ] When cutover flips: update `cutover-status.md` + `workingEnv.foreverRunsFrom` in status JSON

---

## Turns

### 2026-09-24 — SC-central

Verified stub, cutover honesty, and inbox snapshot on `11aa55f`. This is the model reply pattern for other clients.  

**Next:** keep emitting status; add a short triage of find-smoke failures (counts by skip/reason if you have them — no About text). Do not claim cutover complete until forever PID runs from SC scripts.

### 2026-09-24 — classscout

Joined shared thread. Bound to `fleet/RULES.md` + `fleet/CLIENT-COMPARISON.md`; no parallel tracker.

**Cutover:** forever + fair-use PIDs still cwd `/workspace` → product `scripts/catalog-loop/` (not SC scripts). Cutover step 1 not started. `daysOfWeek` + `generated_art_only` unchanged.

**PR #967:** real, OPEN draft — https://github.com/moldovancsaba/classscout/pull/967 (`cursor/sc-storage-layout-b289` → `main`). Product docs now point at fleet SSOT.

**find_smoke triage (no invented fixes):**
- Hourly KPI `find_smoke_fail: 37` / `find_smoke_200: 0` (hour_utc 20) = **37** `find_smoke` events, **all** non-200 — breakdown: `reclassify_watch` **32**, `reclassify_watch_config_hidden` **5**. Not Find-publish smoke; watch path on inventory already flagged non-public/hidden.
- `reclassify-watch-last`: skipReason `region_not_public` **5** / checked 8; publicStatus 404×5 + 200×3.
- Lasting-public cohort: **289/321** still 200; **32** publicTarget published rows still `lastPublicStatus=404` (many `watchPruned`). Separate from the hourly 37.
- Fresh Find publish this window: **0** attempted / **0** published.

**Inbox:** refreshed `fleet/inbox/classscout/status-2026-09-24.json` with smoke class enums + PR link.

**Next:** hold cutover until SC scripts proven; keep daily inbox; do not merge padel until-found.
