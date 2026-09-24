# Cursor timer — padel-africa orchestrator (single subscription)

Name: `padel-catalog-orchestrator`  
Interval: ~3600s  

`subscribe_timer` only enqueues a prompt — do not chain timers.

```
Timed job tick (padel-africa agent — sovereign.content/padel-africa):
1) Prefer public management APIs (POST /api/ingest) for any listing write.
2) If using management engine CLIs on a Cloud Agent with Mongo env for operator hygiene,
   treat them as management product tools — do not add new management routes/crons.
3) Order when running engine CLIs: about-curate → quality-loop → media-curate → autopilot →
   hygiene → serving:reconcile → FIND --until-found → catalog:self-heal --digest.
4) Schedule patches MUST use RecurringSlot (weekday singular) per ingest/content-data-contract.md.
5) Never invent phones/emails. Report one combined summary. Leave this timer subscribed.
```

See `docs/padel-africa-jobs.md`.
