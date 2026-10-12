# Mini-prompt — open your coordination thread

Paste to each agent (swap the URL):

```text
Next steps live in the shared coordination thread (both of us read/write the same file on sovereign.content main):

<THREAD_URL>

Also read:
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/coordination/README.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/RULES.md

Do: update Open checklist, append a ## Turns entry for today, commit/push main. Do not create a parallel tracker. Keep fleet/inbox status JSON after ticks.
```

| Agent | `THREAD_URL` |
| --- | --- |
| Padel | https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/coordination/padelafrica.md |
| Sportolok | https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/coordination/sportolok.md |
| ClassScout | https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/coordination/classscout.md |

---

## Maintenance wake (2026-10-12) — paste into each client chat

Fleet was silent ~12 days (last SC commits 2026-09-30). SC-central updated timer prompts on `main` and re-subscribed `fleet-daily-swot` here. **Client timers must be re-subscribed on their own chats.**

### Padel Africa

```text
SC-central maintenance wake (2026-10-12).

1) Pull sovereign.content main. Read content.padelafrica/timers/orchestrator.md (updated: pipeline:feed-discovered every tick + under-covered FIND).
2) subscribe_timer name padel-find-tick ~3600s using that file's prompt. Leave subscribed. Do NOT touch fleet-daily-swot.
3) Run one full tick NOW: quality-loop → pipeline:feed-discovered (×1–2 limit 30) → fair-use if needed → under-covered FIND → ingest → fleet/inbox/padelafrica/status-YYYY-MM-DD.json → Turn on fleet/coordination/padelafrica.md.
4) Push main. Honest qualityAtCeiling if About improve has nothing to do.
```

### Sportolok

```text
SC-central maintenance wake (2026-10-12).

1) Pull sovereign.content main. Read content.sportolok/timers/orchestrator.md (extract gated: management PR #329 advance closed unmerged).
2) subscribe_timer name sportolok-tick ~3600s using that prompt. Leave subscribed. Do NOT touch fleet-daily-swot.
3) Run one tick NOW: quality → FIND/enrich if pending empty → try catalog:extract-discovered; if advance_not_deployed, record blocker and skip (no forcePublish growth) → drain soft-incomplete only → inbox status-YYYY-MM-DD.json → coord Turn.
4) Push main. Do not claim production-ready.
```

### ClassScout

```text
SC-central maintenance wake (2026-10-12).

1) Pull sovereign.content main. Read content.classscout/timers/orchestrator.md + docs/cutover-status.md (visibility first; cutover still deferred).
2) subscribe_timer name classscout-find-tick ~3600s. Leave subscribed. Do NOT touch fleet-daily-swot.
3) Confirm product forever healthy; emit fleet/inbox/classscout/status-YYYY-MM-DD.json TODAY (counts/enums). Append Turn if debt posture changed.
4) Push main. Do not start cutover until ≥3 consecutive live inbox days after resume.
```
