# Fleet outbox — content.sportolok — 2026-09-27

From `fleet:daily-swot`. Content type: **dense_local** / **evaluate_delivery_plus_ingest_cutover**.

## Enrich / extract queues still open after hourly ticks

- **Why:** Timer is live; burn-down of Itthon/HT/DISCOVERED extract is the efficiency vector — not another scaffold
- **How:** Keep sportolok-tick: quality → fair-use enrich pending → drain-review-ready → honest P delta in inbox; replenish HT when pending=0
- **Delivery:** `agent_execute`
- **Evidence:** fleet/coordination/sportolok.md; fleet/inbox/sportolok/status-2026-09-27.json; content.sportolok/scripts/fair-use-discovery/

