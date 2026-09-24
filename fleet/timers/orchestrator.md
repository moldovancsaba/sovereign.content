# Cursor timer — fleet daily SWOT (SC-central)

Name: `fleet-daily-swot`  
Interval: ~86400s (once per UTC day)

Own this on the **sovereign.content central** Cloud Agent only. Do not attach to padel / classscout /
sportolok catalog orchestrators.

```
Timed job tick (SC-central — sovereign.content/fleet):
1) Read fleet/AGENTS.md + recommendations/inbox/plan-fleet-daily-swot.md.
2) Load fleet/profiles/*.json (content-type awareness is binding).
3) Collect signals: content.*/ pointers+timers+recent docs, fleet/inbox snapshots, git --since=24h,
   optional HTTP smoke of siteUrls, recommendations/inbox watermark, fleet/memory/latest.json.
4) Produce SWOT + two scorecards (environment vs outcomes). Never unfair-compare raw publish counts.
5) Write fleet/digests/YYYY-MM-DD.md + .json, update fleet/memory/latest.json, write fleet/outbox/*.
6) If portable contract needed, draft recommendations/inbox/rec-fleet-*.md as hitl_review.
7) Commit/push main. Report executive brief. Leave this timer subscribed.
8) Never invent catalogue KPIs; insufficient_signal when evidence missing.
```

Status: Phase 0 plan shipped — subscribe when Phase 2 script exists.
