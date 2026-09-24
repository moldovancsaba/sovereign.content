# Plan — Padel Africa job examples for other agents (2026-09-24)

Status: **accepted / shipped** (management PR #227 + this SSOT push).

## Intent

Give other vertical agents a concrete, copyable example of how a mature `catalog:*` job
set should work — tick order, JSON summaries, FIND until-found protocol, R2/ImgBB hosts —
without copying padel domain fixtures.

## Shipped

| Surface | What |
| --- | --- |
| management `docs/padel-africa-jobs.md` | Worked examples (quality, about, media, hygiene, self-heal, FIND, autopilot) |
| management `docs/dual-repo-workflow.md` | Example job set block + until-found / R2 notes |
| SSOT `/jobs` | Padel reference tick + self-heal + until-found + R2 primary wording |
| SSOT `/adopting` | Points at padel-africa-jobs.md; expanded day-one CLIs |
| SSOT `/environments/cursor` | Full reference timer set + FIND until-found playbook |
| SSOT `/whats-new` | 2026-09-24 entry |
| SSOT `/jobs` Dense-US twin | ClassScout keep vs adopt table |
| management `docs/classscout-sovereign-twin.md` | Twin knowledge + orchestration list |
| `plan-classscout-twin-orchestration.md` | Accepted ClassScout process plan |

## Agent contract (portable)

1. Content ticks write **Mongo only** — no GDS/pack load; use `serving:reconcile` for cards.
2. Media: **R2 primary → ImgBB backup → https passthrough**; scripts load `.env.local`.
3. Growth: `catalog:find --until-found` — agent executes briefs; never invent contacts; stop on first seed.
4. Empty about/media/quality/autopilot ticks = settled catalogue, not a failure — use FIND.
5. Self-heal first when debt is hot (FIND defers).

## Do not

- Put listing About/media into `sovereign.content`
- Treat GDS pack-load warnings as content failures
- Use AI Gateway / Ollama on these Cloud Agent catalog ticks
- Invent venues to satisfy a FIND timer
