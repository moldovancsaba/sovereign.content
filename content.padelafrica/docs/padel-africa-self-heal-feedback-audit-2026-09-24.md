# Self-heal feedback audit — 2026-09-24

> **Historical snapshot** of collectors vs consumers. Written **before**
> `catalog:self-heal --digest` + HiTL delivery shipped. Gap #1 below is **partially closed** by
> `--digest` / [`padel-africa-self-heal-hitl.md`](padel-africa-self-heal-hitl.md). Remaining open:
> unused `preferredTacticOrder` apply, unwired `media_thin` / `geo_weak`, sibling-close of research
> debt, FIND source-yield memory. Live how-to: [`padel-africa-self-heal.md`](padel-africa-self-heal.md).

**Scope:** padel-africa management self-heal / quality / FIND feedback loop, and how it
relates to sovereign.content process recommendations. Live status sampled 2026-09-24.

**Verdict (at snapshot time):** About quality has a real detect→recommend→apply→encode loop
(cron + CLI). FIND has attempt memory and About-debt defer. **Update after digest ship:**
`catalog:self-heal --digest` + HiTL classes now turn feedback into actionable items; remaining
gaps are Phase 1 (tactic order apply, media_thin/geo_weak openers, sibling-close honesty).

---

## 1. Job inventory & effectiveness

| Job | Role | Effectiveness (live / evidence) |
| --- | --- | --- |
| `catalog:self-heal` | Status, research brief, contact debt intake, process-lesson append | Orchestration only — does **not** auto-apply. Live: openAbout=0, openResearch=0, openOperatorFeedback=0 |
| `catalog:quality-loop` | Score → open recs → improve About → encode lessons | **Works** when debt exists. Live ticks: `alreadyGood=100`, 2 encoded lessons historically (`curated_about` avgΔ+10). Daily cron `listing-quality-loop` |
| `catalog:about-curate` | Grounded About drafts → Mongo curated + description | Primary About fixer when soft debt appears; often `considered=0` when settled |
| `catalog:contact-enrich` / self-heal `--ingest-contact` | Evidence-only contact fill; `no_evidence` → debt recs | Real intake; false-positive guard when contact already present. Hygiene tick applied 2 websites (2026-09-24) |
| `catalog:find --until-found` | Agent WebSearch briefs; seed or honest zero-result | **Works** with evidence. Attempts file: **36** (9 seeded / 27 zero-result). Defers when open About ≥3 |
| `catalog:media-curate` | Fill empty media → R2/ImgBB | Productive for media bytes; **does not** open `media_thin` debt (helper unwired) |
| `catalog:hygiene` + `serving:reconcile` | Geo/contact drains; card projection | Complementary; not self-heal core |
| SSOT `recommendations/inbox/` | Process contracts for agents | Human/agent files — management never polls |

---

## 2. What feedback is collected

| Feedback | Producer | Store | How opened |
| --- | --- | --- | --- |
| About defects | quality-score | Mongo `listing_quality_recommendations` | Auto on score tick |
| Operator card notes | `/stats` → `card_feedback` | Bridged to `operator_feedback` recs | Score pass (card + instruction\|negative only) |
| Contact evidence wall | contact-enrich | `contact_gap` + `research_needed` | `--ingest-contact` / enrich |
| Media thin | `recommendationsFromMediaCurate` helper | Would be `media_thin` | **Unwired** — media-curate never calls it |
| Geo weak | Kind declared | Would be `geo_weak` | **No opener** |
| Research brief | self-heal `--brief` | stdout JSON | Agent executes |
| Encoded About lessons | quality-encode | Mongo `listing_quality_lessons` | After applied About with δ>0 or score≥75 |
| Process lessons | `--record-process`, enrich, FIND defer | `scripts/data/padel-africa-process-lessons.json` | Append-only (6 lessons live) |
| FIND attempts | agent `--record-attempt` | `scripts/data/padel-africa-find-attempts.json` | seeded \| zero-result \| skipped |
| FIND source checklists | static `FIND_SOURCES` | Embedded in briefs | **Not** an outcome log |
| SSOT recommendations | agents / Issues | sovereign.content inbox MD | Manual |

**Live snapshot (2026-09-24):**
- Recommendations: 0 open About / research / operator; byStatus `skipped=55`, `applied=2`
- Lessons: 2 encoded; tacticSteer prefers `curated_about`
- Process lessons: 6 (FIND seeds, contact evidence_wall, historical defer)
- FIND attempts: 36 (9 seeded / 27 zero-result)

---

## 3. What consumes the feedback today

| Feedback | Consumer | Action |
| --- | --- | --- |
| Open About / `operator_feedback` | `quality-improve` (+ cron) | Strip chrome / curated / compose; mark applied |
| Open research (`contact_gap`, …) | Improve counts as deferred; `--brief` | **Agent-only** apply (WebSearch) |
| Encoded lessons | `preferredTacticOrder` | Reported on improve summary + self-heal status — **does not change apply order** (still chrome → curated-if-present → compose) |
| Process lessons | `catalog:self-heal --status` | Display only (last 20) |
| FIND attempts | FIND planner | 14-day zero-result cooldown + yield bias |
| Open About count | FIND `--until-found` | Defer when ≥3; print healFirst |
| SSOT inbox | Humans / other agents | Implement page — **no auto import** |

### Is there a “new feedback → fix” job?

**No.** Closest automated consumer is daily `listing-quality-loop` (About only). Self-heal is
status / brief / intake / record. Nothing digests process lessons, FIND source yields, or SSOT
inbox into patches or new portable contracts.

---

## 4. Gaps (closed loop broken)

1. **~~No feedback digest / self-improve job~~ (partially closed)** — use `catalog:self-heal --digest`
   (report label `catalog:self-improve` is not an npm script). Remaining: Phase 1 orphans / SSOT draft emit.
2. **`preferredTacticOrder` unused for apply** — lessons are observational.
3. **Process lessons write-mostly** — kinds `tactic_bias`, `zero_result_pattern` unused.
4. **`media_thin` / `geo_weak` kinds orphaned** — helper exists for media; geo never opened.
5. **Sibling close on About apply** — improve marks *all* open siblings for that listing `skipped`, including research debt (`improve.ts`), contradicting “research stays open for briefs.”
6. **Operator feedback incomplete** — global / positive notes never become recommendations; live usage ≈0.
7. **FIND sources have no yield memory** — which directory actually seeded a cell is not logged.
8. **SSOT recommendations are off-band** — no vertical timer checks inbox / Issues for new process contracts.

### Loop coverage

| Stage | About | Contact / media / geo | Process / SSOT | FIND growth |
| --- | --- | --- | --- | --- |
| Detect | Yes | Contact only | Manual | Plan + attempts |
| Recommend | Yes | Partial | Inbox MD | Briefs |
| Apply | Yes (auto) | Agent only | Manual | Agent seed |
| Encode | Yes | No | File append | Attempts file |
| Steer next | FIND defer | Brief | Status display | Cooldown + yield bias |

---

## 5. Related

- Implementation: `src/lib/catalogSelfHeal/`, `src/lib/listingQuality/`, `src/lib/catalogFind/`
- Guide: [`padel-africa-self-heal.md`](padel-africa-self-heal.md)
- Jobs examples: [`padel-africa-jobs.md`](padel-africa-jobs.md)
- Prior audits: [`padel-africa-quality-jobs-audit-2026-09-24.md`](padel-africa-quality-jobs-audit-2026-09-24.md), [`padel-africa-find-hour-watch-2026-09-24.md`](padel-africa-find-hour-watch-2026-09-24.md)
- **Improvement plan (SSOT):** https://sovereigncontent.messmass.com/recommendations — inbox `plan-sovereign-self-improve-loop.md`
