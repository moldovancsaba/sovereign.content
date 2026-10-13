# Cursor timer — padel-africa orchestrator (single subscription)

Name: `padel-find-tick`  
Interval: ~3600s  
**Owner:** Padel Africa Cloud Agent only.

`subscribe_timer` only enqueues a prompt — do not chain timers. Do not touch `fleet-daily-swot`.

Scope: **Padel Africa only.** Repo edits → `content.padelafrica/` + optional `fleet/inbox/padelafrica/status-YYYY-MM-DD.json`.

**Writes:** `POST /api/ingest` only. Never Mongo from agent home. Prefer `npm run catalog:quality-loop` here once `INGEST_API_KEY` is set. Migrated `src/` is quarantined (`src/QUARANTINE.md`).

**Listing contract (binding):** [`docs/LISTING-STANDARDS.md`](../docs/LISTING-STANDARDS.md) — structured headers, social → `contactLinks`, phone optional, city pin OK, never claim PUBLISHED. Builder: [`ingest/buildStructuredSourceText.ts`](../ingest/buildStructuredSourceText.ts).

Fleet SSOT (read-only): `fleet/RULES.md` · `fleet/CLIENT-COMPARISON.md`.

```
Timed job tick (padel-africa — discovery → enrich → maintain → publish-via-ingest):

0) Scope. Padel Africa only. No sportolok/classscout/fleet SWOT/SSOT doctrine edits.
   Listing writes ONLY via POST /api/ingest. Never invent phones/emails/social handles.
   Align every seed/reprocess to docs/LISTING-STANDARDS.md (structured Name/Address/coords +
   Instagram/Facebook/WhatsApp/Twitter/Email headers; Website never = Instagram).

1) DISCOVER — fair-use + FIND under-covered countries.
   a) npm run fair-use:status. If pendingCandidates is low / verified-apply queue empty:
      ONE npm run fair-use:one-pass (Africa-first scripts/fair-use/sources.json). Soft-skip CF/403.
      Do NOT forever-loop. Promote needs_verify → *-padel-verified.json only after evidence bar.
   b) FIND: evidence-only WebSearch; prefer under-covered countries over saturated ZA densify.
      Evidence: phone/email optional; official WhatsApp/Instagram/Facebook/X = contact
      (http(s) URLs → contactLinks; WhatsApp bare +digits → https://wa.me/…);
      no street → Near {city} + OSM/Nominatim city pin (geoPrecision=locality).
   c) Seed new venues as DISCOVERED via ingest (buildStructuredSourceText). Commit tick-ingest
      evidence JSON when you apply.

2) ENRICH — fill honest debt on known listings (street, phone, social, first-party URL).
   When a later tick finds better first-party/booking facts, reprocess via ingest with updated
   structured headers (same id). Do not invent placeholders. Prefer contactLinks social over
   leaving the detail contact panel empty.

3) MAINTAIN — listing quality (About / encode), not Mongo catalog:*.
   npm run catalog:quality-loop (this folder). If at About ceiling (≥75 / skip_closed only),
   record qualityAtCeiling=true honestly — improve is not the growth lever.

4) PUBLISH PATH — feed DISCOVERED so management can earn PUBLISHED (every tick).
   npm run pipeline:feed-discovered -- --limit 30 (second batch if the first is full).
   Management owns lifecycle — never claim PUBLISHED; never set lifecycleState.

5) Bookkeeping.
   fleet/inbox/padelafrica/status-YYYY-MM-DD.json (fair KPIs) + short Turn on
   fleet/coordination/padelafrica.md when posture/rules/sources change.
   Leave this timer subscribed. Do not force-push release/padel-africa.
```

See `AGENTS.md`, `docs/LISTING-STANDARDS.md`, `STATUS-FOR-CORE.md`, `scripts/fair-use/README.md`.
