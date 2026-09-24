# Cursor timer — fleet daily SWOT (SC-central)

Name: `fleet-daily-swot`  
Interval: cron `0 6 * * *` (06:00 UTC daily)  
Subscription: active on SC-central Cloud Agent (`sub_2d708b6a-cf71-41de-82b1-715d0dca2f16`)

Own this on the **sovereign.content central** Cloud Agent only. Do not attach to padel / classscout /
sportolok catalog orchestrators.

```
Timed job tick (SC-central — sovereign.content/fleet):
1) Pull moldovancsaba/sovereign.content main.
2) Read fleet/AGENTS.md + recommendations/inbox/plan-fleet-daily-swot.md.
3) Load fleet/profiles/*.json (content-type awareness is binding).
4) Run npm run fleet:daily-swot
5) Review digest; never invent catalogue KPIs; never unfair-compare raw publish counts.
6) If portable contract needed, draft recommendations/inbox/rec-fleet-*.md as hitl_review.
7) Commit/push main. Report executive brief. Leave this timer subscribed.
```

Status: **Phase 2 subscribed** — fires daily 06:00 UTC; run `npm run fleet:daily-swot` also works on demand.
