# Agent notes

This repository has two layers:

1. **SSOT docs site** (repo root Next.js app) — doctrine, Jobs, Cursor, Adopting.
2. **Per-client agent workspaces** — top-level `content.classscout/`, `content.padelafrica/`, and
   `content.sportolok/` (independent; no cross-imports).

## Rules

- Do **not** add catalogue content, Mongo seeds, or media binaries to the docs site.
- Do **not** add management app routes/libs/crons from agent work. Engine changes → PR to
  `moldovancsaba/management` **`main`** only.
- Do **not** add ClassScout product routes for agent autonomy — use `content.classscout/` here and
  `POST /api/ingest` on `moldovancsaba/classscout`.
- Agents write to live apps **only** via documented public APIs (`POST /api/ingest`).
- Schedule data must match **that client’s** contract — ClassScout uses
  `recurringPrograms.daysOfWeek`; management clients use singular `weekday` RecurringSlots.
  See each client's `ingest/content-data-contract.md`.
- Read `node_modules/next/dist/docs/` before changing the docs-site framework.

## Start here

| Doc | Role |
| --- | --- |
| **[`HANDOVER.md`](./HANDOVER.md)** | **New SC-central agent — read first** (state, open work, first hour) |
| **[`fleet/RULES.md`](./fleet/RULES.md)** | **Rigid** dual-repo delivery + comparison honesty (binding) |
| **[`fleet/CLIENT-COMPARISON.md`](./fleet/CLIENT-COMPARISON.md)** | **Only** cross-client maturity/workflow comparison SSOT |
| **[`fleet/coordination/`](./fleet/coordination/)** | Shared next-step threads SC ↔ each client agent |
| **[`fleet/`](./fleet/)** | Cross-agent jobs (`fleet:daily-swot`) — not a client folder |
| ClassScout / Your Field | [`content.classscout/AGENTS.md`](./content.classscout/AGENTS.md) |
| Padel Africa | [`content.padelafrica/AGENTS.md`](./content.padelafrica/AGENTS.md) |
| Sportolok | [`content.sportolok/AGENTS.md`](./content.sportolok/AGENTS.md) |
| Core-team separation status | [`CORE-TEAM-STATUS.md`](./CORE-TEAM-STATUS.md) |
| Site | `/jobs`, `/implement`, `/environments/cursor`, `/adopting` |
