# Cursor timer — sportolok orchestrator (single subscription)

Name: `sportolok-tick`  
Interval: ~3600s  
**Owner:** Sportolok Cloud Agent only.

`subscribe_timer` only enqueues a prompt — do not chain timers. Do not touch `fleet-daily-swot`.

Scope: **Sportolok only.** Repo edits → `content.sportolok/` + optional `fleet/inbox/sportolok/status-YYYY-MM-DD.json`.

**Writes:** `POST /api/ingest` only from this agent home. Do **not** run management Mongo `catalog:quality-loop` / listingQuality as agent doctrine. Migrated copies under `src/` are **quarantined** (`src/QUARANTINE.md`). Prefer `npm run catalog:quality-loop` in this folder (ingest stub) once `INGEST_API_KEY` is set.

**LLM:** The Cursor Cloud Agent (I, this agent, executing right now) is the LLM. NO OLLAMA. NO AI GATEWAY. NO EXTERNAL LLM.
I perform all cognitive tasks: scoring quality, writing About descriptions, extracting structured facts.

Fleet SSOT (read-only): `fleet/RULES.md` · `fleet/CLIENT-COMPARISON.md`.

```
Timed job tick (sportolok — sovereign.content/content.sportolok ONLY):
1) Sportolok only. No padel/classscout/fleet SWOT/SSOT doctrine edits.
2) Listing writes ONLY via POST /api/ingest (content.sportolok/ingest). Never MONGODB_URI from agent home.
3) Quarantined direct Mongo writes / old management catalog:* Mongo CLIs are NOT the steady-state path.
4) Growth when pending empty: FIND (fair-use:one-pass / hataron-tul-pass) → enrich → DISCOVERED.
5) Extract DISCOVERED without Ollama: npm run catalog:extract-discovered (ingest {advance:true}). Not forcePublish.
6) forcePublish ONLY for soft-incomplete REVIEW_READY — never the growth story.
7) After tick: fleet/inbox/sportolok/status-YYYY-MM-DD.json (fair KPIs; Itthon + HT cameras separately).
8) Never invent phones/emails. Leave this timer subscribed. Do not force-push release/sportolok.
9) NO OLLAMA. NO AI GATEWAY. I (the Cursor Cloud Agent, this agent) am the LLM for all AI tasks.
```

See `AGENTS.md`, `STATUS-FOR-CORE.md`, `MIGRATION-FROM-MANAGEMENT.md`.
