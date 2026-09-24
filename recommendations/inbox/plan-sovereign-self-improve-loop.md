---
id: plan_sovereign-self-improve-loop-2026-09-24
environment: cursor
vertical: padel-africa
repo: moldovancsaba/sovereign.content
jobs:
  - catalog:self-heal
  - catalog:quality-loop
  - catalog:find
  - catalog:media-curate
  - catalog:hygiene
priority: high
ssotLanding: jobs
doctrineOk: true
observedAt: 2026-09-24T18:10:00Z
status: accepted-plan-2026-09-24-hitl
sources:
  - https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/padel-africa-self-heal-feedback-audit-2026-09-24.md
  - https://sovereigncontent.messmass.com/jobs
---

# Plan — Sovereign self-heal → self-improve loop (2026-09-24)

Status: **accepted plan** (docs first). Implement on management; portable contracts land on Jobs.

## Problem

Self-heal **detects and records** well for About debt and FIND attempts, but process feedback
(process lessons, FIND source yields, media/geo orphans, SSOT inbox, operator notes) is mostly
**write-only**. There is no job that asks: “is there new feedback, and what should we do?”

Audit: management
[`docs/padel-africa-self-heal-feedback-audit-2026-09-24.md`](https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/padel-africa-self-heal-feedback-audit-2026-09-24.md).

## Goal

A portable **self-improve** layer on top of self-heal:

```
detect → recommend → classify → apply|brief|propose-contract → encode → steer next
```

Honesty bar unchanged: never invent contacts, phones, ages, court counts, or venues.

## Smart reports (not mechanical)

Digests and agent timer reports must read like a staff audit, not a counter dump:

1. **Executive brief** — settled vs blocked, FIND allow/defer, HiTL count
2. **Per item** — situation → evidence → analysis → recommendation → delivery class
3. **HiTL queue** — only items that wait for the operator, each with `operatorPrompt`

Empty quality/media ticks may stay short. Digest / FIND / heal decisions may not.

## HiTL delivery (smart delivery)

| Class | Agent does | Operator |
| --- | --- | --- |
| `auto` | Runs CLI immediately | No ask |
| `agent_execute` | WebSearch / seed with evidence bar | No ask if honesty holds |
| `hitl_review` | Draft + detailed report | **Wait** for accept/revise/reject |

**Auto examples:** quality-loop About, about-curate from facts, media OG→R2, contact enrich from headers, serving:reconcile, honest FIND zero-result.

**Agent-execute examples:** FIND seed with two sources; research `--brief`.

**HiTL examples:** SSOT portable contracts, doctrine/threshold changes, operator product-intent notes, thin single-source seeds, engine-merge / forever Find, inventing facts (refuse).

Engine: management `src/lib/catalogSelfHeal/hitlDelivery.ts` + `--digest`. Guide: `docs/padel-africa-self-heal-hitl.md`.

## Architecture (three feedback lanes)

| Lane | Examples | Auto-apply? | Encode to |
| --- | --- | --- | --- |
| **A — Listing debt** | About kinds, `operator_feedback`, wired `media_thin` / `geo_weak` / `contact_gap` | Yes where evidence exists (quality-loop, media-curate, contact-enrich); else agent `--brief` | `listing_quality_lessons` + attempt files |
| **B — Process residue** | process-lessons.json, FIND source yields, timer failures, ops_block | No invent; **digest → actionable briefs or SSOT draft recs** | process lessons + SSOT inbox drafts |
| **C — Portable contracts** | SSOT Issues / inbox MD | Never auto-merge to `main`; agent proposal + human accept | Jobs / Cursor / Adopting |

## New / extended jobs

### 1. `catalog:self-heal --digest`

CLI mode on the existing `catalog:self-heal` script (there is **no** `catalog:self-improve` npm
script). Digest JSON may include `"job": "catalog:self-improve"` as a **report label** only.

Bounded tick that **reads** feedback stores and prints a machine-readable plan:

```json
{
  "job": "catalog:self-improve",
  "mode": "digest",
  "executiveBrief": "Narrative verdict…",
  "summary": { "autoCount": 0, "agentExecuteCount": 0, "hitlReviewCount": 0 },
  "items": [{ "situation": "…", "evidence": [], "analysis": "…", "recommendation": "…", "delivery": "auto|agent_execute|hitl_review" }],
  "autoCommands": [],
  "hitlQueue": [],
  "instructions": ["Report executiveBrief first…"]
}
```

Sources to scan:

- Mongo open `listing_quality_recommendations` (all kinds)
- `card_feedback` not yet bridged
- `padel-africa-process-lessons.json` newer than last digest watermark
- `padel-africa-find-attempts.json` — aggregate zero-result patterns by city/source
- Optional: local checkout of `sovereign.content/recommendations/inbox/` (status ≠ shipped)

Watermark: `scripts/data/padel-africa-self-improve-cursor.json` (`lastDigestAt`, `seenLessonIds`, `seenAttemptKeys`).

### 2. Wire orphan debt producers (lane A)

| Fix | Change |
| --- | --- |
| Media → `media_thin` | Call `recommendationsFromMediaCurate` from `catalog:media-curate` on failed/empty (not `already_has_media`) |
| Hygiene geo → `geo_weak` | Open when Nominatim fails / non-street line1 after retries |
| Sibling close bug | On About apply, **do not** skip `contact_gap` / `media_thin` / `geo_weak` / `research_needed` siblings |
| Lesson steer | Use `preferredTacticOrder` inside improve tactic selection (not summary-only) |
| Operator feedback | Optionally bridge `global`+`instruction` as process lesson (not About paste) |

### 3. FIND source yield memory (lane A/B)

Extend `--record-attempt` (or sibling flag):

```bash
npm run catalog:find -- --record-attempt --cc=AO --city=Lubango --outcome=seeded \
  --source-label="LNL review" --source-url="https://…"
```

Store on attempt; brief builder ranks sources that previously seeded that country.

### 4. Process → SSOT draft (lane B→C)

When digest sees repeated patterns (e.g. ≥3 zero-results same city class, or `ops_block` R2):

- Write **draft** `recommendations/inbox/rec-<slug>.md` (or print the file body for the agent to commit on SSOT `main`)
- Never invent portable contracts without evidence + `doctrineOk`
- ClassScout / Sportolok twin: same digest shape via thin aliases

### 5. Timer cadence

Prefer **one** orchestrator timer (see management `docs/padel-africa-jobs.md`). Do not add a sixth
`padel-self-improve-tick` while MCP rejects new subscription names — fold digest into the existing
orchestrator prompt as the last step.

| Timer | Cadence | Prompt gist |
| --- | --- | --- |
| **Single:** `padel-find-tick` (orchestrator) | ~3600s | about → quality → media → autopilot → hygiene/reconcile → FIND `--until-found` → `catalog:self-heal --digest`. Run auto/agent_execute; queue hitl_review. Leave subscribed. |

## Phased delivery

### Phase 0 — Docs (this plan + audit) ✅

Ship audit + Jobs pointer + inbox plan.

### Phase 1 — Close honesty bugs (management)

1. Sibling-close exclude research kinds  
2. Wire `media_thin` from media-curate  
3. Open `geo_weak` from hygiene unresolved street-level failures  
4. Apply `preferredTacticOrder` in improve  

Acceptance: unit tests; dry-run media/hygiene show debt opens; improve no longer skips contact siblings.

### Phase 2 — Digest CLI + HiTL (partially shipped)

1. `catalog:self-heal --digest` with narrative items + HiTL classes (**shipped**)  
2. Watermark file for “new since last digest”  
3. Cloud Agent timer prompt: require executiveBrief + per-item analysis; run auto; wait on hitlQueue  

Acceptance: digest JSON stable; HiTL items never auto-merged to SSOT main; empty digest is success.

### Phase 3 — FIND source yields + SSOT draft emit

1. Attempt `sourceLabel` / `sourceUrl`  
2. Brief ranking by yield  
3. Optional `--emit-ssot-draft` writing inbox MD body  

Acceptance: one seeded cell records source; next brief for that country lists it first among equals.

### Phase 4 — Cross-vertical twins

Document aliases on ClassScout / Sportolok adopting pages; do not merge engines.

## Non-goals

- Auto-merge SSOT `main` without agent/human review  
- Auto-invent venues or contacts from process lessons  
- Replace forever Find on ClassScout  
- LLM-required digest (structured rules first; AI Gateway optional later)

## Acceptance (system)

An agent can answer from one digest tick:

1. What new feedback arrived since last run?  
2. What listing debt to heal now (commands)?  
3. What process pattern to remember or propose as a portable contract?  
4. What must stay agent-brief (research evidence wall)?

## Related

- Audit: management `docs/padel-africa-self-heal-feedback-audit-2026-09-24.md`  
- Self-heal guide: `docs/padel-africa-self-heal.md`  
- Jobs: https://sovereigncontent.messmass.com/jobs  
- Twin: management `docs/classscout-sovereign-twin.md`
