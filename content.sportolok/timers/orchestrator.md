# Cursor timer — sportolok orchestrator (single subscription)

Name: `sportolok-tick`  
Interval: ~3600s  
**Owner:** Sportolok Cloud Agent only.

`subscribe_timer` only enqueues a prompt — do not chain timers. Do not touch `fleet-daily-swot`.

Scope: **Sportolok only.** Repo edits → `content.sportolok/` + optional `fleet/inbox/sportolok/status-YYYY-MM-DD.json`.

**Writes:** `POST /api/ingest` only from this agent home. Do **not** run management Mongo `catalog:quality-loop` / listingQuality as agent doctrine. Migrated copies under `src/` are **quarantined** (`src/QUARANTINE.md`). Prefer ingest scripts in this folder once `INGEST_API_KEY` is set.

**LLM:** The Cursor Cloud Agent (this agent) is the LLM. NO OLLAMA. NO AI GATEWAY. NO EXTERNAL LLM.

Fleet SSOT (read-only): `fleet/RULES.md` · `fleet/CLIENT-COMPARISON.md`.

**Maintenance (2026-10-12):** Re-subscribe on the **Sportolok** chat. Management PR #329 (`ingest {advance:true}`) was **closed unmerged** — treat extract as gated (see step 5).

```
Timed job tick (sportolok — sovereign.content/content.sportolok ONLY):
1) Sportolok only. No padel/classscout/fleet SWOT/SSOT doctrine edits.
2) Listing writes ONLY via POST /api/ingest (content.sportolok/ingest). Never MONGODB_URI from agent home.
3) Quarantined direct Mongo writes / old management catalog:* Mongo CLIs are NOT the steady-state path.
4) When ingest key present: npm run catalog:quality-loop; optional about-curate / media-curate (ingest paths).
5) Growth when pending seeds empty: FIND (fair-use:one-pass / hataron-tul-pass) → enrich → DISCOVERED.
6) Extract DISCOVERED: npm run catalog:extract-discovered (ingest {advance:true}).
   If response is advance_not_deployed / 400 unrecognized: record blocker in inbox, SKIP extract this tick
   (do not forcePublish as a substitute growth path). Resume extract only after management deploys advance.
7) forcePublish ONLY via catalog:drain-review-ready for soft-incomplete REVIEW_READY — never the growth story.
8) After tick: fleet/inbox/sportolok/status-YYYY-MM-DD.json (Itthon + HT cameras separately) + coord Turn.
9) Never invent phones/emails. Leave this timer subscribed. Do not force-push release/sportolok.
10) NO OLLAMA. NO AI GATEWAY. Cloud Agent is the LLM for all cognitive tasks.
```

See `AGENTS.md`, `STATUS-FOR-CORE.md`, `MIGRATION-FROM-MANAGEMENT.md`.
