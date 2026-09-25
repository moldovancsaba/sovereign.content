# Fleet outbox — content.classscout — 2026-09-25

From `fleet:daily-swot`. Content type: **dense_metro_us** / **forever_find_improve**.

## Hourly quality rollup / lasting-public signals stay local to runner data dir

- **Why:** Central comparison lacks ClassScout outcome fitness without snapshots
- **How:** Have quality-rollup or weekly-digest also write a slim fleet/inbox/classscout/status-DATE.json (counts/enums only)
- **Delivery:** `agent_execute`
- **Evidence:** content.classscout/docs/catalog-find-improve-loop.md; fleet/inbox/README.md

## Product-repo transitional catalog-loop copies may still be the live runners

- **Why:** Agent-home cutover incomplete → consistency risk across environments
- **How:** Confirm forever.sh runs from content.classscout/scripts; retire product wrappers when INGEST_API_KEY path is proven
- **Delivery:** `hitl_review`
- **Evidence:** content.classscout/AGENTS.md; HANDOVER.md §5

