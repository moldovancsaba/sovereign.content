# Cursor timer — padel-africa orchestrator (single subscription)

Name: `padel-find-tick` (or `padel-catalog-orchestrator`)  
Interval: ~3600s  
**Owner:** Padel Africa Cloud Agent only — do not attach to SC-central / sportolok / classscout chats.

`subscribe_timer` only enqueues a prompt — do not chain timers. Do not touch `fleet-daily-swot`.

Scope: **Padel Africa only.** Repo edits → `content.padelafrica/` + optional `fleet/inbox/padelafrica/status-YYYY-MM-DD.json`. Never edit other `content.*`, comparison SSOT, or the docs site root.

Fleet SSOT (read-only): `fleet/RULES.md` · `fleet/CLIENT-COMPARISON.md`.

```
Timed job tick (padel-africa agent — sovereign.content/content.padelafrica ONLY):
1) You work only on Padel Africa. Do not touch sportolok, classscout, fleet SWOT, or SSOT doctrine.
2) Prefer public management APIs (POST /api/ingest) for any listing write from agent code.
3) If using management engine CLIs on a Cloud Agent with Mongo env for operator hygiene,
   treat them as management product tools — do not claim ingest-only reality; do not add new management routes/crons.
4) Order when running engine CLIs: about-curate → quality-loop → media-curate → autopilot →
   hygiene → serving:reconcile → FIND --until-found → catalog:self-heal --digest.
5) Schedule patches MUST use RecurringSlot (weekday singular) per ingest/content-data-contract.md.
6) After the tick: commit slim fleet/inbox/padelafrica/status-YYYY-MM-DD.json (workingEnv + fair KPIs only).
7) Never invent phones/emails. Report one combined summary. Leave this timer subscribed.
```

See `docs/padel-africa-jobs.md` and `AGENTS.md` (scope + doctrine vs reality).
