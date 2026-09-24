# fleet/ — SC-central cross-agent jobs

**Owner:** sovereign content developer agent (this repo’s central chat)  
**Not a client folder.** Do not put catalogue content here. Do not import from `content.*`.

## Purpose

Jobs that look **across** all content agents:

| Job | Cadence | Status |
| --- | --- | --- |
| `fleet:daily-swot` | Daily 06:00 UTC (`fleet-daily-swot` timer) | **Phase 2 subscribed** — `npm run fleet:daily-swot` · digests in `digests/` · [plan](../recommendations/inbox/plan-fleet-daily-swot.md) |

## Rules

1. Content-type profiles in `profiles/` are binding for fair comparison.
2. Never open product Mongo. Prefer `inbox/<client>/` snapshots and public HTTP smoke.
3. Never invent outcomes. Missing signal → `insufficient_signal`.
4. Do not steal client catalog timers; this folder has its own daily timer when Phase 2 ships.
5. Push artifacts to **`main`**.

## Start

1. Read [`CONTENT-CLIENTS-WORKFLOW-COMPARISON.md`](./CONTENT-CLIENTS-WORKFLOW-COMPARISON.md) — padel vs sportolok vs classscout workflow audit
2. Read [`RESEARCH-2026-09-24.md`](./RESEARCH-2026-09-24.md)
3. Read the plan in recommendations inbox
4. Skim `profiles/*.json`
