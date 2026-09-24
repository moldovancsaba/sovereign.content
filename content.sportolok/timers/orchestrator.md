# Cursor timer — sportolok (single orchestrator)

Name: `sportolok-catalog-orchestrator`  
Interval: ~3600s  

Do **not** run in-process `src/lib/sovereign` Mongo executors against the shared database.
Use `ingest/client.ts` + `scheduleToRecurringSlots` for any content write.

```
Timed job tick (sportolok agent — sovereign.content/content.sportolok):
1) Read AGENTS.md. Writes only via POST /api/ingest on sport.doneisbetter.com.
2) Convert any schedule with ingest/scheduleToRecurringSlots before patch.
3) Report JSON summary. Leave this timer subscribed. No management cron additions.
```
