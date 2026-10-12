# Cursor timer — fleet daily SWOT (SC-central)

Name: `fleet-daily-swot`  
Interval: cron `0 6 * * *` (06:00 UTC daily)  
**Owner:** sovereign.content central Cloud Agent only.

Do not attach to padel / classscout / sportolok catalog orchestrators.

**Maintenance (2026-10-12):** Prior subscription expired (~Oct 1). Re-subscribed on SC-central this turn.

```
Timed job tick (SC-central — sovereign.content/fleet) — fleet:daily-swot:
1) Ensure checkout of moldovancsaba/sovereign.content main is current (pull if needed).
2) Read fleet/AGENTS.md + recommendations/inbox/plan-fleet-daily-swot.md + fleet/profiles/*.json (content-type awareness is binding).
3) Run: npm run fleet:daily-swot
4) Review the new fleet/digests/YYYY-MM-DD.md executive brief. Never invent catalogue KPIs; keep insufficient_signal when fleet/inbox snapshots are missing. Never unfair-compare raw publish counts across sparse vs dense clients.
5) If portable contract needed, draft recommendations/inbox/rec-fleet-*.md as hitl_review (do not auto-merge doctrine).
6) Commit and push to main. Report the executive brief + bestFitFolder + recommendation count.
7) Leave this timer (fleet-daily-swot) subscribed. Do not touch padel/classscout/sportolok catalog orchestrator timers.
```

Status: **Phase 2 subscribed** (2026-10-12) — fires daily 06:00 UTC; `npm run fleet:daily-swot` also works on demand.
