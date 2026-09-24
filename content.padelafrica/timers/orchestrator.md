# Cursor timer — padel-africa orchestrator (single subscription)

Name: `padel-find-tick`  
Interval: ~3600s  
**Owner:** Padel Africa Cloud Agent only.

`subscribe_timer` only enqueues a prompt — do not chain timers. Do not touch `fleet-daily-swot`.

Scope: **Padel Africa only.** Repo edits → `content.padelafrica/` + optional `fleet/inbox/padelafrica/status-YYYY-MM-DD.json`.

**Writes:** `POST /api/ingest` only from this agent home. Do **not** run management Mongo `catalog:quality-loop` / listingQuality as agent doctrine. Migrated copies under `src/` are **quarantined** (`src/QUARANTINE.md`). Prefer `npm run catalog:quality-loop` in this folder (ingest stub) once `INGEST_API_KEY` is set.

Fleet SSOT (read-only): `fleet/RULES.md` · `fleet/CLIENT-COMPARISON.md`.

```
Timed job tick (padel-africa — sovereign.content/content.padelafrica ONLY):
1) Padel Africa only. No sportolok/classscout/fleet SWOT/SSOT doctrine edits.
2) Listing writes ONLY via POST /api/ingest (content.padelafrica/ingest). Never MONGODB_URI from agent home.
3) Quarantined Mongo listingQuality / old management catalog:* Mongo CLIs are NOT the steady-state path.
4) When ingest key present: npm run catalog:quality-loop (this folder). FIND: evidence-only WebSearch;
   seed fixtures live under scripts/data — apply only via ingest-capable seed path when available;
   until seed ingest exists, record research fixtures here and do not add management routes.
5) Self-heal digest honesty: doctrine vs reality; hitl_review queue for operator.
6) After tick: fleet/inbox/padelafrica/status-YYYY-MM-DD.json (fair KPIs only).
7) Never invent phones/emails. Leave this timer subscribed. Do not force-push release/padel-africa.
```

See `AGENTS.md`, `STATUS-FOR-CORE.md`, `MIGRATION-FROM-MANAGEMENT.md`.
