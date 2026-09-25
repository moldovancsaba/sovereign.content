# Fleet outbox — content.sportolok — 2026-09-25

From `fleet:daily-swot`. Content type: **dense_local** / **evaluate_delivery_plus_ingest_cutover**.

## Quarantined Mongo sovereign runtime is not yet rewritten to ingest

- **Why:** Blocks reliable/efficient autonomous ticks; environment fit stays capped
- **How:** Rewrite call sites to ingest/client.ts + scheduleToRecurringSlots; keep src/ as reference; prove one dry PATCH; chase core reconcile via CORE-TEAM-STATUS.md
- **Delivery:** `agent_execute`
- **Evidence:** content.sportolok/src/QUARANTINE.md; content.sportolok/MIGRATION-FROM-MANAGEMENT.md; pointers.json migration note

