# Padel Africa — FIND hour-watch report (2026-09-24)

> **Historical snapshot** of a one-hour observation window. **Not a runbook.** Timed growth ticks
> prefer `catalog:find -- --until-found --max-cells 8` (see [`padel-africa-jobs.md`](padel-africa-jobs.md)
> and [`padel-africa-find-continent-plan.md`](padel-africa-find-continent-plan.md)). The “timer must
> execute `--next`” line below is superseded.

Observation window: **10:01–11:00 UTC** (~59 minutes).  
Branch: `cursor/pa-catalog-unstarve-9e3d`. Live catalogue at end: **160 PUBLISHED / 42 countries**.

## 1. How FIND works (end-to-end)

```text
Mongo PUBLISHED counts by country/city
        ↓
catalog:find --plan / --until-found (preferred) / --next (single-cell)
        ↓
Agent-required brief (queries + sources + evidence bar + excludeNames)
        ↓
Cloud Agent WebSearch / open directories
        ↓
    ┌─── evidence clears bar ──→ append fixture → dry-run → apply → record-attempt seeded
    └─── no evidence ──────────→ record-attempt zero-result (14-day cooldown) → plan rotates
```

| Layer | Role |
| --- | --- |
| **Planner** (`src/lib/catalogFind/plan.ts`) | City-scoped queue: missing → sparse_n1 → sparse_n2 → deepen_city → deepen_large |
| **Brief** (`brief.ts` + `sources.ts`) | Encodes *where* and *how* the agent must research; CLI does not invent venues |
| **Attempts** (`padel-africa-find-attempts.json`) | Cooldown so cooled cells do not block the continent queue |
| **Seeder** (`seed-research-padel-africa.standalone.mjs`) | Evidence-only upsert after agent writes a fixture |
| **Timer (superseded note)** | Prefer `--until-found` inside the single orchestrator; `--next` is single-cell only |

## 2. What happened each ~15 minutes

| Tick | Cell | Priority | Outcome | Notes |
| --- | --- | --- | --- | --- |
| **T+0** | BJ / Porto-Novo | sparse_n1 | zero-result | Only excluded Cotonou Padel Club |
| **T+0** (extra deepen) | GH / Kumasi | deepen_large | zero-result | Turbo Gamez = arcade, not padel (false positive rejected) |
| **T+15** | GN / Kindia | sparse_n1 | zero-result | Only Riviera (live); Kindia hits = football |
| **T+30** | MR / Nouadhibou | sparse_n1 | zero-result | Only Sahara in Nouakchott; no Nouadhibou club |
| **T+45** | BI / Gitega | sparse_n1 | zero-result | Only Bujumbura club; Gitega = tennis |
| **T+60** | DJ / Djibouti City | sparse_n1 | zero-result | CSA Défense lists padel among many sports — thin public booking; not seeded |

**Seeds during this window:** none (sparse secondary-city pass was dry).  
**Earlier same day (before watch):** Mombasa deepen seeded `research-ken-ven-005`/`006` — proves the seeded path when evidence exists.

Catalogue stayed **160 / 42** for the full hour (expected when sparse cells have no second venue).

## 3. Sibling jobs during the same hour

| Job | Behavior observed | Relation to FIND |
| --- | --- | --- |
| **about-curate** | Applied Smash Zone About 60→75 once; later 0/0 | Downstream of FIND seeds |
| **quality-loop** | `alreadyGood=100` every tick | Scores Abouts; does not discover venues |
| **media-curate** | Filled Kenya/Mombasa earlier; then scanned 0 | Downstream of FIND websites |
| **autopilot** | `requeued 0 / ranTicks 0` | Empty `content_cards` — **cannot** grow catalogue; FIND is the discovery path |
| **hygiene** | contact `applied 0`, 40 `no_evidence` | Enrichment only |
| **serving:reconcile** | rebuilt 8 | Projection catch-up |

## 4. Plan / cooldown / brief interaction

- After each zero-result, `--next` **rotated** (BJ → GN → MR → BI → DJ → …).
- Cooled missings (prior zero-result countries) stayed **below** sparse_n1 in the queue — correct.
- Sparse_n1 cells preferred **secondary cities** when the capital already has the only club — correct continent logic; those cities often have no second venue yet.
- Evidence bar correctly rejected: arcade “gamesz”, football stadia, tennis clubs, military multi-sport listings without clear bookable padel identity.

## 5. Recommendations / process fixes — do jobs record them?

| Store | Written by | Purpose |
| --- | --- | --- |
| `listing_quality_recommendations` | **quality-loop only** | About improvement debt |
| `listing_quality_lessons` | quality-loop encode | What worked (+δ) |
| `padel-africa-find-attempts.json` | **FIND** `--record-attempt` | Seeded / zero-result cells |
| Tick JSON | All jobs | Operational summary only |

**Live quality store (end of hour):** 0 open, 25 historical skipped, 2 applied (`curated_about`); 2 lessons (+15, +5).

**Process fixes** (how jobs should change) are **not** auto-recorded by jobs. They come from audits / hour-watch / agent work (e.g. continent FIND briefs, encode gate, R2 ops gap).

## 6. Verdict

| Question | Answer |
| --- | --- |
| Does FIND work as designed? | **Yes** — plan → agent brief → WebSearch → seed or cool → rotate |
| Does the system invent venues when empty? | **No** — hour of sparse ticks = honest zero-results |
| Can FIND grow the catalogue? | **Yes when evidence exists** (Mombasa same day); sparse secondary cities often dry |
| Are sibling jobs healthy? | **Yes** — mostly zero-cost when caught up; About/media chase FIND seeds |
| Gap vs process learning? | Jobs do **not** write process-recommendation rows; FIND attempts + quality lessons are the machine-readable trails |

### Keep doing

1. Hourly (or denser) FIND ticks that **execute** `--next`.
2. Prefer deepen_large / sparse cells with known directory density (Playtomic coasts, BalleJaune markets) when sparse inland secondary cities keep zero-resulting.
3. about-curate + media after every successful seed.

### Optional follow-ups (not blockers)

1. Persist FIND attempts in Mongo (today file-backed) if multiple agents share state.
2. Add a lightweight `catalog_find_outcomes` summary for dashboards.
3. Provision R2/ImgBB so media ticks rehost instead of passthrough.
4. Operator `/stats` feedback → `operator_feedback` recs (still unused).

## Reproduce

```bash
npm run catalog:find -- --status
npm run catalog:find -- --plan --limit 10
npm run catalog:find -- --next
# then WebSearch brief.searchQueries; seed or:
npm run catalog:find -- --record-attempt --cc=DJ --city="Djibouti City" --outcome=zero-result
```

Raw watch log: agent store `find-hour-watch/log.md` (session-local).
