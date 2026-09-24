---
id: plan_fleet-daily-swot-2026-09-24
environment: cursor
vertical: sovereign-content-central
repo: moldovancsaba/sovereign.content
jobs:
  - fleet:daily-swot
priority: high
ssotLanding: jobs
doctrineOk: true
observedAt: 2026-09-24T19:40:00Z
status: phase-2-timer-subscribed-2026-09-24
sources:
  - https://github.com/moldovancsaba/sovereign.content/blob/main/HANDOVER.md
  - https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/RESEARCH-2026-09-24.md
  - https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/digests/2026-09-24.md
  - https://sovereigncontent.messmass.com/jobs
---

# Plan — Daily fleet SWOT + cross-agent recommendations

**Status:** Phase 0–2 shipped (research + digest + collector + **daily timer subscribed**). Owner: **SC-central agent**.  
**Research:** [`fleet/RESEARCH-2026-09-24.md`](../../fleet/RESEARCH-2026-09-24.md)  
**First digest:** [`fleet/digests/2026-09-24.md`](../../fleet/digests/2026-09-24.md)  
**Run:** `npm run fleet:daily-swot`  
**Timer:** `fleet-daily-swot` · cron `0 6 * * *` (06:00 UTC)

## Problem

We run **three content agents** with different content types, densities, and engines. Each has (or
will have) its own self-heal / digest loop. Nothing at the **central system** yet:

1. Collects latest how-they-work signals across all three
2. Compares them fairly for **working environment**, efficiency, reliability, consistency
3. Produces **content-type-aware SWOT** + growing knowledge
4. Emits **per-agent fix/improve recommendations with how-to**

Without this, portable learning stays trapped in one vertical’s chat, and we cannot tell which
operating patterns actually fit Cursor Cloud Agent work.

## Goal

A maintained job **`fleet:daily-swot`** that runs once per UTC day on the SC-central agent and
publishes:

| Artifact | Purpose |
| --- | --- |
| `fleet/digests/YYYY-MM-DD.md` + `.json` | Staff-quality daily report (archive = growing knowledge) |
| `fleet/memory/latest.json` | Rolling SWOT + trend deltas for the next run |
| Optional `recommendations/inbox/rec-fleet-*.md` | Portable contract proposals (HiTL) |
| Per-client `fleet/outbox/<client>-YYYY-MM-DD.md` | Actionable fixes routed to that agent’s chat/folder |

## Non-goals

- Opening Mongo / inventing catalogue KPIs
- Merging ClassScout forever-Find with padel until-found
- Crowning one absolute “best vertical” by raw publish counts
- Stealing padel / classscout / sportolok catalog timers
- Auto-merging SSOT `main` doctrine without HiTL

## Content-type awareness (binding)

Every comparison **must** load `fleet/profiles/<client>.json` first. Profiles define:

- `contentUnit`, `density`, `growthMode`, `scheduleFamily`, `honestyBar`
- `fairKpis` (what “good” means for *this* content type)
- `unfairComparisons` (metrics that must not be ranked head-to-head)
- `siblingOpportunities` (what may be borrowed as orchestration only)

If a metric is listed under `unfairComparisons`, the digest may **describe** it per agent but must
not declare a winner on that axis.

## Two scorecards (never conflate)

### A — Working-environment fitness (comparable)

How well the agent works **in the Cursor / Cloud Agent + dual-repo environment**:

| Dimension | Signals |
| --- | --- |
| **Reliability** | Timer still subscribed; ticks complete; quarantine not violated; schedule contract respected |
| **Consistency** | Same tick order day-to-day; docs match reality; empty settled ticks reported honestly |
| **Efficiency** | One orchestrator (not timer spam); heal-before-find; no wasted AI Gateway on catalog |
| **Environment fit** | Ingest-only writes; no release-branch agent commits; SSOT pointers current |

### B — Content-outcome fitness (profile-normalized)

| Client | Primary outcomes (examples) |
| --- | --- |
| padelafrica | FIND seeded/zero-result ratio; About debt; media host mix; HiTL backlog |
| sportolok | Ingest success; schedule validation; decision agreement (when live); quarantine burn-down |
| classscout | Lasting-public / improve fill; find smoke; Tier A pauses; scarcity brief freshness |

Normalize each to 0–100 **within profile**, then discuss — do not average A and B into one vanity score.

## Daily report shape (smart, not mechanical)

```md
# Fleet digest — YYYY-MM-DD

## Executive brief
Narrative: who is healthiest for the working environment today, and why
(content-type caveats explicit).

## Per-agent SWOT
### content.padelafrica
S / W / O / T (evidence bullets)

### content.sportolok
…

### content.classscout
…

## Comparison (environment)
Table: reliability | consistency | efficiency | environment-fit
(with “insufficient signal” when evidence missing)

## Comparison (outcomes — normalized)
Per-profile KPI strip — no unfair winners

## Recommendations
### → content.padelafrica
1. Fix … How: … Evidence: …
### → content.sportolok
…
### → content.classscout
…
### → SC-central / SSOT (HiTL)
…
```

JSON twin validates against `fleet/schema/daily-swot.schema.json`.

## Architecture

```
fleet/
├── RESEARCH-2026-09-24.md
├── AGENTS.md
├── profiles/           # content-type profiles (SSOT for fair compare)
├── schema/
├── inbox/<client>/     # optional agent-emitted status snapshots (git)
├── digests/            # growing knowledge archive
├── memory/             # rolling SWOT + watermarks
├── outbox/             # per-agent recommendation packets
├── timers/orchestrator.md
└── scripts/            # collect → analyze → write (Phase 1+)
```

### Collect (Phase 1)

Read-only from this repo + HTTP smoke:

1. `content.*/AGENTS.md`, `pointers.json`, `timers/`, recent `docs/` mtime
2. `fleet/inbox/<client>/*.json` if present (agent-pushed status)
3. Git log `--since=24.hours` under each `content.*`
4. Optional HEAD requests to `siteUrl` / `siteUrls` (up/down only)
5. `recommendations/inbox/` new files since watermark
6. Previous `fleet/memory/latest.json`

### Analyze (Phase 1–2)

Rule-first rubric (deterministic), then optional LLM narrative polish **only** for executive brief —
same honesty bar as padel digests: never invent outcomes. Missing signal → `insufficient_signal`.

### Publish (Phase 1+)

1. Write digest MD+JSON under `fleet/digests/`
2. Update `fleet/memory/latest.json`
3. Write `fleet/outbox/<client>-date.md`
4. If portable contract needed → draft `recommendations/inbox/rec-fleet-*.md` with `hitl_review`
5. Commit/push to **`main`**; update `/jobs` + `/whats-new` when the contract ships

### Timer (Phase 2)

One SC-central subscription (~86400s), name e.g. `fleet-daily-swot`. Prompt in
`fleet/timers/orchestrator.md`. Do **not** attach this to padel-find-tick.

## Phased delivery

### Phase 0 — Research + plan ✅

- Research brief + this plan + profile stubs + Jobs/Whats-new pointers

### Phase 1 — Profiles, schema, first digest + script ✅ (2026-09-24)

1. Profiles + schema shipped
2. Collector `fleet/scripts/daily-swot.mjs` + `npm run fleet:daily-swot`
3. First digest `fleet/digests/2026-09-24.{md,json}` + memory + outbox packets
4. Snapshot drop format documented in `fleet/inbox/README.md`

Acceptance met: digest refuses unfair winners; sportolok migration/quarantine gaps scored honestly; outcomes `insufficient_signal` without inventing Mongo KPIs.

### Phase 2 — Daily timer ✅ (2026-09-24)

1. Subscribed SC-central timer `fleet-daily-swot` cron `0 6 * * *` (06:00 UTC)
2. Second consecutive digest + trend deltas still open until first automated wake

Acceptance partial: timer live; trend history fills on next daily runs.

### Phase 3 — Agent-emitted status + outbox routing

1. Each client docs a one-liner: after catalog digest, append `fleet/inbox/<client>/status-DATE.json`
   (padel chat / classscout runners / sportolok — coordinated, not forced)
2. Outbox packets become the default handoff into client chats
3. Site page `/fleet` (or Jobs subsection) lists last 7 digests

Acceptance: at least two clients push a status snapshot in one week.

### Phase 4 — Growing knowledge → portable contracts

1. When the same Weakness appears ≥3 days, emit HiTL `rec-fleet-*` with doctrineOk checklist
2. Memory retains SWOT history (bounded, e.g. 30 days)
3. Quarterly “environment winner patterns” note for Adopting / Implement

## Recommendation quality bar

Each recommendation must include:

1. **Target** (`content.<client>` or `ssot`)
2. **Problem** (one sentence)
3. **Why it matters** (reliability / efficiency / consistency / outcome)
4. **How** (commands, file paths, or playbook steps — no invented facts)
5. **Evidence** (digest ids, doc paths, git SHAs, snapshot fields)
6. **delivery:** `auto` | `agent_execute` | `hitl_review` (reuse HiTL vocabulary)

## Risks

| Risk | Mitigation |
| --- | --- |
| Ranking sparse vs dense by publish volume | Profiles + unfairComparisons |
| SC-central invents Mongo KPIs | Insufficient-signal rule; inbox snapshots only |
| Timer contention with padel | Separate agent + separate subscription |
| Sportolok looks “worst” forever during quarantine | Scorecard A can still rise on ingest cutover progress; call migration state explicitly |
| Doc drift | Digest checks Jobs wording vs `fleet/` reality |

## Acceptance (system)

An operator (or new SC agent) can answer from one daily digest:

1. How did each agent work yesterday (process + outcomes)?
2. Who is currently **better for the working environment**, and on which dimensions?
3. What should each agent fix next, and **how**?
4. What did we learn that we did not know last week (growing knowledge)?

## Related

- Research: `fleet/RESEARCH-2026-09-24.md`
- HANDOVER §5 open work
- Per-vertical self-improve: `plan-sovereign-self-improve-loop.md`
- Jobs: https://sovereigncontent.messmass.com/jobs
