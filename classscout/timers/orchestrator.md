# Cursor timer — classscout orchestrator (single subscription)

Name: `classscout-catalog-orchestrator`  
Interval: ~3600s (or dense forever in the cloud VM — see docs)

`subscribe_timer` only enqueues a prompt — do not chain timers.

```
Timed job tick (classscout agent — sovereign.content/classscout):
1) Listing writes ONLY via POST /api/ingest (+ upload) with Bearer INGEST_API_KEY.
2) Prefer scripts/ under this folder: about-curate → quality-loop / improve → self-heal status →
   (apply-auto when deferFind) → find → encode → hourly report/push-stats.
3) Dense US mode: forever.sh. Sparse mode: sparse-timer.sh with --with-self-heal etc.
4) Schedule fields MUST use recurringPrograms.daysOfWeek (Monday..Sunday) per
   ingest/content-data-contract.md — never management RecurringSlot / weekdays[].
5) Never invent phones/emails/addresses. Media policy: generated_art_only.
6) Report one combined summary. Leave this timer subscribed.
```

See `docs/catalog-find-improve-loop.md` and `docs/sovereign-content-alignment.md`.
