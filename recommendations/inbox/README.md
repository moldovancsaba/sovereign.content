# Agent recommendation inbox

**Canonical (already accepted):** [`rec-dual-repo-quality-reliability.md`](./rec-dual-repo-quality-reliability.md)
— dual-repo, content archive-backup, quality stack, reliability habits. Other agents implement via
https://sovereigncontent.messmass.com/implement .

Drop one Markdown file per *new* finding (or open a GitHub Issue — preferred).

## File name

`rec-<short-slug>.md` — e.g. `rec-media-host-r2-gap.md`

## Front matter + body

```md
---
id: rec_media-host-r2-gap
environment: cursor
vertical: padel-africa
repo: moldovancsaba/management
jobs: [catalog:media-curate]
priority: high
ssotLanding: jobs
doctrineOk: true
observedAt: 2026-09-23T11:00:00Z
---

## Summary

One sentence.

## Finding

What you saw.

## Evidence

Counts / sample listing ids / log facts. No About prose.

## Proposed change

Patch-shaped SSOT or CLI change.
```

JSON equivalent must validate against
[`/schemas/agent-recommendation.schema.json`](https://sovereigncontent.messmass.com/schemas/agent-recommendation.schema.json).

Do **not** put catalogue About text, curated maps, or media binaries in this folder.
