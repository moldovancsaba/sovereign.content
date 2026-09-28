# Cursor timer — classscout orchestrator (single subscription)

Name: `classscout-find-tick`  
Interval: ~3600s  
**Owner:** ClassScout / Your Field Cloud Agent only.

`subscribe_timer` only enqueues a prompt — do not chain timers. Do not touch `fleet-daily-swot`.

Scope: **ClassScout only.** Repo edits → `content.classscout/` + required `fleet/inbox/classscout/status-YYYY-MM-DD.json`.

**Visibility first (binding, 2026-09-28):** forever may keep running on the product tree
(`moldovancsaba/classscout/scripts/catalog-loop`). Cutover to SC scripts is **deferred** until the
fleet can see daily KPIs. Missing inbox for a UTC day is a product defect.

Fleet SSOT (read-only): `fleet/RULES.md` · `fleet/CLIENT-COMPARISON.md`.

```
Timed job tick (classscout — Padel reporting discipline):
1) ClassScout only. No padel/sportolok/fleet SWOT ownership edits.
2) Prefer product forever when live PID is healthy; do not force cutover this tick.
3) Run: npm run catalog-loop:sparse-timer -- --with-watchdog --with-find-on-stall --with-self-heal --with-fleet-inbox
   (from product /workspace). If forever dead or Find stalled, confirm watchdog heal.
4) REQUIRED every tick: refresh fleet/inbox/classscout/status-YYYY-MM-DD.json
   (npm run catalog-loop:fleet-inbox -- --push). Counts/enums only — no About prose.
5) Schedule fields MUST use recurringPrograms.daysOfWeek — never RecurringSlot / weekdays[].
6) Media: generated_art_only. Never invent phones/emails/addresses.
7) Append a short Turn on fleet/coordination/classscout.md when debt posture changes.
8) Leave this timer subscribed. Do not steal fleet-daily-swot.
```

See `AGENTS.md`, `docs/cutover-status.md`, `docs/catalog-find-improve-loop.md`.
