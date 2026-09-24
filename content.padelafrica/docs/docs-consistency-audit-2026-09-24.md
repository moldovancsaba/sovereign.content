# Docs consistency audit — padel-africa + sovereign.content (2026-09-24)

Deep pass to remove **deprecated / wrong how-to** that agents would follow. Cross-checked against
`package.json` `catalog:*` scripts, `scripts/catalog-*.ts`, `src/lib/catalogSelfHeal/**`,
`src/lib/listingQuality/**`, `src/lib/media/imageHost.ts`, live timer subscriptions, and
sovereign.content `main`.

## Agent entry map (canonical — use these)

| Order | Doc | Role |
| --- | --- | --- |
| 1 | [`INDEX.md`](INDEX.md) | Repo map |
| 2 | [`padel-africa-jobs.md`](padel-africa-jobs.md) | Worked CLI examples + **single orchestrator timer** |
| 3 | [`dual-repo-workflow.md`](dual-repo-workflow.md) | management feature branch vs SSOT `main` |
| 4 | [`padel-africa-self-heal.md`](padel-africa-self-heal.md) + [`padel-africa-self-heal-hitl.md`](padel-africa-self-heal-hitl.md) | Debt, digest, HiTL |
| 5 | [`padel-africa-find-continent-plan.md`](padel-africa-find-continent-plan.md) | FIND until-found |
| 6 | [`listing-quality-loop.md`](listing-quality-loop.md) | About score → improve |
| 7 | [`classscout-sovereign-twin.md`](classscout-sovereign-twin.md) | Dense-US twin (do not merge engines) |
| 8 | [`operations.md`](operations.md) | Every npm script |
| 9 | https://sovereigncontent.messmass.com/implement → Jobs → Cursor → Adopting | Portable contracts |

**Historical snapshots** (metrics / one-day reports — not runbooks):
`padel-africa-*-2026-09-24.md` dated audits, `documentation-audit-report.md` (2026-08-21),
`HANDOVER.md` ClassScout-transition narrative (catalogue emptiness section superseded).

## Live truths agents must not contradict

1. **One Cloud Agent timer** runs all catalog jobs in one turn (`padel-find-tick` orchestrator).
   No timer chaining; do not recreate five job-class timers.
2. **FIND defer** = open About ≥ 3 only (not `openTotal` / all research debt).
3. **Growth ticks** prefer `catalog:find -- --until-found --max-cells N` (not `--next` as default).
4. **Digest** = `npm run catalog:self-heal -- --digest`. Report JSON may say
   `"job":"catalog:self-improve"` — that is **not** an npm script.
5. **HiTL classes:** `auto` | `agent_execute` | `hitl_review`.
6. **Media:** R2 primary → ImgBB backup → https passthrough.
7. **Content ticks:** Mongo-only for About/media; no AI Gateway / Ollama on these ticks.
8. **ClassScout:** forever Find + `generated_art_only`; SC until-found is the sparse complement.
9. **Catalogue size (2026-09-24):** ~158–161 PUBLISHED / 42 countries — not the 2026-09-15 empty cluster.

## Findings closed in this pass (management)

| ID | Was wrong | Fix |
| --- | --- | --- |
| M1 | jobs: FIND defers on `openTotal` | About ≥ 3 only |
| M2 | operations: no `--digest` / HiTL | Documented |
| M3 | operations: FIND “self-heal debt hot” | About ≥ 3 |
| M4 | operations: `LISTING_QUALITY_LOOP=true` required | On by default; `false` refuses |
| M5 | hour-watch: timer must execute `--next` | Historical banner + until-found |
| M6 | HANDOVER: catalogue gone / 3 pilots | Superseded live state + catalog entry links |
| M7 | INDEX: dated audits look canonical | Labeled historical; entry map |
| M8 | dual-repo: hardcoded PR branch | Session-specific |
| M9 | self-heal: lesson steer overclaim | Observational until Phase 1 |
| M10 | listing-quality: media_thin/geo as opened | Unwired honesty |
| M11 | digest settled brief: plural timers | Single orchestrator |
| M12 | improve.ts header: research stays open | Documents sibling-close gap |

## Findings closed / in flight (sovereign.content `main`)

See SSOT commit on same date: single orchestrator on Jobs/Cursor/Adopting; digest shipped wording;
no fake `catalog:self-improve` npm command; FIND as recurring until-found; Jobs `Link` import;
doctrine/implement prove sequence includes self-heal + FIND + digest.

## Still open (code, not docs)

- Wire `preferredTacticOrder` into improve apply
- Open / consume `media_thin` and `geo_weak`
- Stop sibling-close from skipping research debt on About apply
- FIND source-yield memory

## Related

- Prior engine ISO baseline (obsolete counts): [`documentation-audit-report.md`](documentation-audit-report.md)
- Feedback gaps detail: [`padel-africa-self-heal-feedback-audit-2026-09-24.md`](padel-africa-self-heal-feedback-audit-2026-09-24.md)
