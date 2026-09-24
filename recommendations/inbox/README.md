# Agent recommendation inbox

**Self-improve loop (accepted plan):** [`plan-sovereign-self-improve-loop.md`](./plan-sovereign-self-improve-loop.md)
— digest new feedback → heal / brief / propose portable contracts. CLI: `catalog:self-heal --digest`
(not `catalog:self-improve`).

**ClassScout twin orchestration:** [`plan-classscout-twin-orchestration.md`](./plan-classscout-twin-orchestration.md)

**Padel job examples / FIND unstarve:** [`plan-padel-africa-job-examples.md`](./plan-padel-africa-job-examples.md),
[`plan-catalog-find-unstarve.md`](./plan-catalog-find-unstarve.md)

**ClassScout #6–#21 portable contracts:** [`plan-classscout-recs-6-21.md`](./plan-classscout-recs-6-21.md)

**Canonical (already accepted):** [`rec-dual-repo-quality-reliability.md`](./rec-dual-repo-quality-reliability.md)
— dual-repo, content archive-backup, quality stack, reliability habits. Other agents implement via
https://sovereigncontent.messmass.com/implement .

**ClassScout #6–#8 (accepted, phased):** [`plan-classscout-rec-6-7-8.md`](./plan-classscout-rec-6-7-8.md)
— street/chrome detectors, job alias twins (docs), media-curate policy hook.

**Sportolok gate feedback (evaluated, revised):** [`plan-sportolok-gate-feedback.md`](./plan-sportolok-gate-feedback.md)
— **unified always-on activity completeness** (padel now; tennis/squash by taxonomy extension);
Nominatim auto-geo; review to-reach-publish. Reject `%` autonomyThreshold and Google/FB/IG defaults.

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
