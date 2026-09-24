# Sportolok ↔ Sovereign Content — adoption answers (2026-09-23)

Mirror of SSOT public pages for the management PR line (SSOT git push may be denied for some
agent tokens). Canonical site once deployed: https://sovereigncontent.messmass.com

## Confirmation (mandated model)

**Publish authority = binary gate + `activityCompleteness`.** There is no sanctioned
`autonomyThreshold` / confidence 0–1 auto-publish path for sportolok or any other vertical.

Scoring for **delivery / promotion / geographic scarcity** on a mature catalogue is allowed.
Scoring that decides whether the machine may publish is not.

## Sportolok profiles (already in this repo)

See `verticals/sportolok/index.ts` — all eight taxonomy slugs + default. Courses (`tanfolyam`) and
events (`verseny`) require schedule; description required on most forms; price soft.

## Soft-incomplete behavior

| Situation | Result |
| --- | --- |
| Soft gaps only (within `maxSoftMissing`) | Listing written at `REVIEW_READY`; card waits for staff |
| Already `PUBLISHED` + soft re-extract | Listing **stays live**; card → `REVIEW_READY` |
| Required completeness missing | `BLOCKED_REPAIRABLE` |
| No geocode | `real-address` **blocker** (not a soft %) |
| Empty media array | **Does not block** — fill with `catalog:media-curate` |

## Promote vs publish

Scoring for **delivery / promotion / geographic scarcity** on a mature catalogue is allowed
(`serving:popularity-refresh` applies a small geographic-gap boost to `popularityRank`). Scoring that
decides whether the machine may publish is not.

## Cron ↔ CLI twins (P1)

Every `vercel.json` cron has an npm twin agents can run without `CRON_SECRET`.
`npm run check:cron-cli-twins` fails CI/gauntlet when a scheduled job lacks its twin.

## Lessons (P2)

`catalog:override-insights` / `catalog:lessons` emit `SovereignLesson` rows with effects
`suggest-config` | `soften-required` | `none`. Effects are hints only — never silent blocker mutation.
`real-address` / territory / safety / knowledge always get `none`.

## Day-one `catalog:*` for sportolok

Mandatory improvement loop:

- `catalog:about-curate`
- `catalog:quality-loop`
- `catalog:media-curate`
- `catalog:hygiene` (geo / Nominatim + street gate)

When content cards exist: `catalog:autopilot`. Learning hints: `catalog:override-insights`.
After About / media writes: `serving:reconcile` (content ticks are Mongo-only — no GDS load).

## Padel Africa reference tick (copy the pattern)

Worked examples with JSON shapes and FIND until-found:
[`padel-africa-jobs.md`](padel-africa-jobs.md). Short form:

```bash
npm run catalog:self-heal -- --status          # heal-first when debt is hot
npm run catalog:about-curate -- --limit 15
npm run catalog:quality-loop -- --score-limit 100 --improve-limit 40
npm run catalog:media-curate -- --limit 25     # R2 primary / ImgBB backup
npm run catalog:hygiene
npm run serving:reconcile -- --limit 200
npm run catalog:find -- --until-found --max-cells 8   # agent executes briefs
npm run catalog:autopilot -- --ticks 10 --requeue-limit 10
```

Empty about/media/quality/autopilot ticks mean the catalogue is settled — grow with FIND, never
invent venues. SSOT: https://sovereigncontent.messmass.com/jobs

Dense-US ClassScout twin (keep forever Find; adopt SC orchestration — do not merge engines):
[`classscout-sovereign-twin.md`](classscout-sovereign-twin.md).

## Closed loop (detect → fix)

Gate / `toReachPublish` → hygiene → media-curate → about-curate / quality-loop → re-gate.
Override insights suggest pack changes; humans accept — never silent blocker mutation.

## Anti-patterns

Do not ship: `autonomyThreshold`, equal 25% image/geo/schedule/description dials, detect-only agents
without remediation jobs, Google/FB/IG as portable defaults.

## Related SSOT routes (after deploy)

- `/doctrine` — non-negotiables
- `/anti-patterns`
- `/activity-completeness` — decision table + pack fragments
- `/migration/confidence-threshold` — remap guide + sovereign-ready checklist
- `/adopting` — day-one jobs + acceptance list
