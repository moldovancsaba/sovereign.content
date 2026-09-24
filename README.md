# Sovereign Content

**SSOT** for sovereign agentic catalogue systems — plus **per-client agent workspaces**.

Live docs: [https://sovereigncontent.messmass.com](https://sovereigncontent.messmass.com)

## What this repo is

1. **Transfer knowledge** (Next.js site at repo root): doctrine, portable job contracts, environment
   playbooks, adoption checklists.
2. **Client agent folders** (top-level, independent):
   - [`padel-africa/`](./padel-africa/) — padel-africa agent
   - [`sportolok/`](./sportolok/) — sportolok agent (migrated out of management)

**Catalogue content (About, media, cards) never lives in the docs site.** Agents write live apps
only via documented public APIs (`POST /api/ingest`). See [`CORE-TEAM-STATUS.md`](./CORE-TEAM-STATUS.md).

## Local (docs site)

```bash
npm install   # uses vendor/*.tgz for @sovereignsquad/gds-* (no GitHub Packages needed)
npm run dev   # http://localhost:3010
npm run build
```

`tsconfig.json` excludes `padel-africa/` and `sportolok/` so agent TypeScript does not enter the
docs build.

## Structure

| Path | Purpose |
| --- | --- |
| `/` (site) | Environment selector |
| `/doctrine` `/jobs` `/implement` `/adopting` … | Process SSOT pages |
| `padel-africa/` | Padel Africa agent workspace |
| `sportolok/` | Sportolok agent workspace |
| `recommendations/inbox/` | Accepted plans + new findings |

**Push rule:** everything in this repo → **`main`**. Management engine changes → PR to
`moldovancsaba/management` **`main`** only (release branches are fast-forward pointers).

## Related

- Management engine: `moldovancsaba/management`
- Vercel project (docs site): `narimato/sovereign.content`
