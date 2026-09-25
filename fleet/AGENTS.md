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
4. Do not steal client catalog timers; `fleet-daily-swot` is SC-central only.
5. Push artifacts to **`main`**.
6. Cross-client comparisons: **only** [`CLIENT-COMPARISON.md`](./CLIENT-COMPARISON.md). Full rigid rules: [`RULES.md`](./RULES.md).

## Start

1. Read [`RULES.md`](./RULES.md) then [`CLIENT-COMPARISON.md`](./CLIENT-COMPARISON.md) then [`ORCHESTRATOR.md`](./ORCHESTRATOR.md)
2. Read [`RESEARCH-2026-09-24.md`](./RESEARCH-2026-09-24.md)
3. Read the plan in recommendations inbox
4. Skim `profiles/*.json`
5. Operator prompts (one-shot paste): [`PROMPTS-TO-CLIENT-AGENTS.md`](./PROMPTS-TO-CLIENT-AGENTS.md)
6. **Ongoing back-and-forth:** [`coordination/`](./coordination/) — shared MD threads SC ↔ each client
7. Quality: verify claims on disk, fix on `main`, append SC-central QA turns
