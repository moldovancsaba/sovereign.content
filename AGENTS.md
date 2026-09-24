# Agent notes

This repository has two layers:

1. **SSOT docs site** (repo root Next.js app) — doctrine, Jobs, Cursor, Adopting.
2. **Per-client agent workspaces** — top-level `padel-africa/` and `sportolok/` (independent;
   no cross-imports).

## Rules

- Do **not** add catalogue content, Mongo seeds, or media binaries to the docs site.
- Do **not** add management app routes/libs/crons from agent work. Engine changes → PR to
  `moldovancsaba/management` **`main`** only.
- Agents write to live apps **only** via documented public APIs (`POST /api/ingest`).
- Schedule data must use singular `weekday` RecurringSlots — see each client's
  `ingest/content-data-contract.md`.
- Read `node_modules/next/dist/docs/` before changing the docs-site framework.

## Start here

| Client | Folder |
| --- | --- |
| Padel Africa | [`padel-africa/AGENTS.md`](./padel-africa/AGENTS.md) |
| Sportolok | [`sportolok/AGENTS.md`](./sportolok/AGENTS.md) |
| Core-team separation status | [`CORE-TEAM-STATUS.md`](./CORE-TEAM-STATUS.md) |
| Site | `/jobs`, `/implement`, `/environments/cursor`, `/adopting` |
