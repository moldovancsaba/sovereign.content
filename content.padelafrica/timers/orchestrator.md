# Cursor timer — padel-africa orchestrator (single subscription)

Name: `padel-find-tick`  
Interval: ~3600s  
**Owner:** Padel Africa Cloud Agent only.

`subscribe_timer` only enqueues a prompt — do not chain timers. Do not touch `fleet-daily-swot`.

Scope: **Padel Africa only.** Repo edits → `content.padelafrica/` + optional `fleet/inbox/padelafrica/status-YYYY-MM-DD.json`.

**Writes:** `POST /api/ingest` only from this agent home. Do **not** run management Mongo `catalog:quality-loop` / listingQuality as agent doctrine. Migrated copies under `src/` are **quarantined** (`src/QUARANTINE.md`). Prefer `npm run catalog:quality-loop` in this folder once `INGEST_API_KEY` is set.

Fleet SSOT (read-only): `fleet/RULES.md` · `fleet/CLIENT-COMPARISON.md`.

**Maintenance (2026-10-12):** After the Sep 30–Oct 12 silence, re-subscribe this timer on the **Padel** chat and run one tick immediately.

```
Timed job tick (padel-africa — sovereign.content/content.padelafrica ONLY):
1) Padel Africa only. No sportolok/classscout/fleet SWOT/SSOT doctrine edits.
2) Listing writes ONLY via POST /api/ingest (content.padelafrica/ingest). Never MONGODB_URI from agent home.
3) Quarantined Mongo listingQuality / old management catalog:* Mongo CLIs are NOT the steady-state path.
4) Quality: npm run catalog:quality-loop (this folder). If catalog is at About ceiling (≥75 / skip_closed only),
   record qualityAtCeiling=true and qualityLoopApplied honestly — do not pretend improve is the delivery lever.
5) Pipeline (every tick, primary DISCOVERED→value lever): npm run pipeline:feed-discovered -- --limit 30
   (run a second batch if the first is full). Management owns PUBLISHED — never claim lifecycle.
6) Fair-use seed replenish (when pending verified/apply queue is empty): npm run fair-use:status;
   if pendingCandidates is low, ONE npm run fair-use:one-pass. Do NOT forever-loop. Soft-skip CF/403.
   Promote after evidence bar → scripts/data/*-verified.json → ingest.
   Evidence: phone/email optional; official WhatsApp/Instagram/Facebook/X = contact;
   if no street use city-level line1 + OSM/Nominatim city pin (geoPrecision=locality).
7) FIND: evidence-only WebSearch; prefer under-covered countries over saturated ZA densify.
   Seed via ingest DISCOVERED; commit tick-ingest evidence JSON when you apply.
8) After tick: fleet/inbox/padelafrica/status-YYYY-MM-DD.json (fair KPIs only) + short Turn on
   fleet/coordination/padelafrica.md when posture changes.
9) Never invent phones/emails/social handles. Leave this timer subscribed. Do not force-push release/padel-africa.
```

See `AGENTS.md`, `STATUS-FOR-CORE.md`, `MIGRATION-FROM-MANAGEMENT.md`, `docs/quality-loop-ingest.md`.
