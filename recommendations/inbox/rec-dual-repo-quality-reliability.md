---
id: rec_dual-repo-quality-reliability
environment: cursor
vertical: padel-africa
repo: moldovancsaba/management
jobs:
  - catalog:about-curate
  - catalog:quality-loop
  - catalog:media-curate
  - catalog:autopilot
  - catalog:hygiene
  - catalog:archive-snapshot
priority: high
ssotLanding: implement
doctrineOk: true
observedAt: 2026-09-23T11:30:00Z
status: accepted-canonical
---

# Canonical recommendation — dual-repo + archive + quality reliability

**Status:** accepted. This is the standing recommendation for every agent adopting or extending
the sovereign catalogue system. Execute via
[Implement](https://sovereigncontent.messmass.com/implement) — do not invent a parallel layout.

## Summary

Run process SSOT and vertical product in **two GitHub repos**, keep live catalogue in **Mongo**,
take dated **JSON archive-backups** on the vertical branch only, and drive quality with timed
`catalog:*` jobs that improve published cards without inventing facts.

## Finding

Agents that park doctrine only in the vertical tree, commit About/media into git, or skip
archive-backup after large curate passes lose transferability and recovery. Agents that invent a
second job vocabulary or wait for LLM before structured headers stall the loop.

## Evidence

- Reference vertical: management / `padel-africa` on `release/padel-africa`
- Process SSOT: `moldovancsaba/sovereign.content` → `main` → https://sovereigncontent.messmass.com
- Proven loop: about-curate → quality-loop → media-curate (+ autopilot / hygiene when cards exist)
- Archive path: `archive/padel-africa/content/<timestamp>/` via `catalog:archive-snapshot`
- Empty timer queues (`scanned: 0` / `ranTicks: 0`) are healthy success, not failure
- SSOT builds must pin Node `22.x` so Vercel does not break `next/font` on major jumps

## Proposed change (what other agents must implement)

1. **Dual-repo**
   - Process docs / doctrine / job contracts / playbooks → `sovereign.content` **`main`**
   - Engine / CLIs / vertical docs / content archive → vertical feature branch → release branch
   - Separate commits and pushes; never mix remotes in one commit
2. **Live content**
   - Listings, curated About, media URLs, quality lessons → Mongo only (day-to-day SSOT)
3. **Content archive-backup**
   - After large curate passes: `npm run catalog:archive-snapshot`
   - Commit the new stamp under `archive/<vertical>/content/` on the **vertical** branch only
   - Snapshot facts + media **URLs** — never binaries; never into `sovereign.content`
4. **Quality stack (minimum)**
   - `catalog:about-curate`, `catalog:quality-loop`, `catalog:media-curate`,
     `catalog:archive-snapshot`
   - Add `catalog:autopilot` + `catalog:hygiene` when ingest / structured cards exist
5. **Reliability habits**
   - Dry-run first; then writes; then `subscribe_timer`
   - Evidence over LLM; no invented amenities/prices/courts
   - Media host hierarchy: R2 → ImgBB → https passthrough (never leave blank)
   - Idempotent ticks; empty queue OK
6. **Feedback**
   - File further process findings as `agent-recommendation` Issues here — scan open Issues first

## Doctrine check

- [x] Does **not** invent venues, amenities, prices, or court counts
- [x] Keeps catalogue content out of the SSOT git tree (Mongo day-to-day; vertical archive optional)
- [x] Fits existing `catalog:*` vocabulary

## Priority

high

## Suggested SSOT landing

implement (primary) · repos · adopting · environments/cursor
