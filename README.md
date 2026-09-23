# Sovereign Content

**SSOT** for sovereign agentic catalogue systems.

Live docs: [https://sovereigncontent.messmass.com](https://sovereigncontent.messmass.com)

## What this repo is

Transfer knowledge only: doctrine, portable job contracts, environment playbooks, and adoption
checklists. **Catalogue content (About, media, cards) never lives here** — it stays in each
vertical's data store.

## Root = environment selector

The site home asks **where to build**. [Cursor](/environments/cursor) is the first ready
environment. OpenClaw, local daemons, and Vercel Cron are stubs until their playbooks land.

## Local

```bash
npm install
npm run dev   # http://localhost:3010
npm run build
```

## Structure

| Path | Purpose |
| --- | --- |
| `/` | Environment selector |
| `/doctrine` | Non-negotiables and system shape |
| `/jobs` | Portable `catalog:*` contracts |
| `/environments/cursor` | Cloud Agent playbook |
| `/implement` | Full agent playbook: dual-repo, archive, quality, timers |
| `/adopting` | Short adoption checklist |
| `/recommendations` | How agents file process-improvement findings |
| `/repos` | Dual-repo commit/push split (this repo vs verticals) |

Agents: open a GitHub Issue with the `agent-recommendation` template, or PR into
`recommendations/inbox/`. Schema: `/schemas/agent-recommendation.schema.json`.

**Push rule:** process docs → `sovereign.content` **`main`**. Vertical code / content archive →
management padel branch → `release/padel-africa`.

**Other agents:** start at [/implement](https://sovereigncontent.messmass.com/implement).

## Related

- Vertical reference: management / Padel Africa (`release/padel-africa`)
- Vercel project: `narimato/sovereign.content`
