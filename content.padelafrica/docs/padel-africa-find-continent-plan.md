# Padel Africa — continent FIND plan

How and where Cloud Agents find **new** padel listings across Africa.

## The gap this fixes

`catalog:find` used to be **status + seed only**. Successful discovers (SN, TZ, ZM, LY, GQ)
happened when a human asked the Cloud Agent to research as a **one-off task**. That research
capability was **not** encoded in the job — so timed ticks and `--status` alone never grew the
catalogue across 54 countries × many cities.

**Fix:** the job now emits an **agent-required brief** (`--next` / `--brief`) with city-scoped
search queries, directory sources, evidence bar, exclude-list, and apply commands. The CLI still
never invents venues; the **Cloud Agent must execute the brief** with WebSearch.

**Self-heal bind:** `--until-found` reads open **About** quality debt. When About debt ≥3,
it **defers** (`deferred: true`) and asks the agent to heal first. Contact/research gaps are
cleared in parallel via [`padel-africa-self-heal.md`](padel-africa-self-heal.md) briefs — they
do not block continent FIND.

## Commands

```bash
npm run catalog:find -- --status          # live counts + planNext + untilFoundNext
npm run catalog:find -- --plan            # prioritized continent queue (city cells)
npm run catalog:find -- --until-found     # do-until-seed campaign (yield-biased, max 8)
npm run catalog:find -- --next            # brief for the highest-priority cell (coverage order)
npm run catalog:find -- --brief --cc=KE --city=Mombasa
npm run catalog:find -- --fixture=scripts/data/…-padel-verified.json --dry-run
npm run catalog:find -- --fixture=scripts/data/…-padel-verified.json
npm run catalog:find -- --record-attempt --cc=ST --city="São Tomé" --outcome=zero-result
```

## Where to look (source playbook)

| Source | Role |
| --- | --- |
| **Padel Lands** | Country / club directory (strong LY, GQ) |
| **AnalistasPadel** | Expansion coverage (GQ) |
| **Padel Without Borders** | Country overviews |
| **BalleJaune** | Francophone booking cards (SN) |
| **Playtomic / Matchpoint** | Bookable clubs where the network operates |
| **First-party club sites** | Phone / hours / address after WebSearch hits |
| **OSM** | Corroboration only — still need contact or booking URL for a research seed |

Every `--brief` expands these into concrete URLs + 8 search queries for the target city.

## How to traverse a continent (priority)

City-scoped cells, not one pass per country:

1. **missing** — countries with 0 PUBLISHED → open the **capital**
2. **sparse_n1** — only 1 listing → second venue (capital or first secondary city)
3. **sparse_n2** — only 2 listings → third venue / uncovered secondary city
4. **deepen_city** — 3–4 listings but secondary cities uncovered
5. **deepen_large** — mid/large markets still capital-heavy (e.g. KE Nairobi-only → Mombasa)

Secondary cities live in `src/lib/catalogFind/africaCells.ts` (capitals + deepen list for all 54).

**Zero-result cooldown (14 days):** `--record-attempt --outcome=zero-result` writes
`scripts/data/padel-africa-find-attempts.json` so the planner rotates instead of hammering CF/TD/…

## Evidence bar (never invent)

- Named operating venue
- Street or locality pin in-country
- Contact channel **or** first-party / booking URL
- Prefer two independent sources
- About ≥120 chars without URL/phone chrome
- No invented court counts, ages, emails, phones

## Do-until-find (`--until-found`)

One-cell `--next` can burn a tick on a dry sparse inland city. **`--until-found`** emits a
**campaign**: up to `--max-cells` (default 8) ordered with **yield bias** (deepen_large / high-directory
markets first). The Cloud Agent must:

1. Execute `firstBrief` (WebSearch → evidence bar)
2. On **seeded** → STOP (goal met)
3. On **zero-result** → record-attempt, continue to the next cell (or re-run `--until-found`)
4. If the budget is exhausted → stop honestly (`budget_exhausted`) — **never invent**

```bash
npm run catalog:find -- --until-found --max-cells 8
```

Proved 2026-09-24: campaign opened EG/Giza → seeded `research-egy-ven-005` (Pro Padel Egypt Le Jardin).

Timed ticks should prefer `--until-found` over a single `--next`.

## Code

| Piece | Path |
| --- | --- |
| Cells (54 × cities) | `src/lib/catalogFind/africaCells.ts` |
| Sources + queries | `src/lib/catalogFind/sources.ts` |
| Planner | `src/lib/catalogFind/plan.ts` |
| Agent brief | `src/lib/catalogFind/brief.ts` |
| Attempt log | `src/lib/catalogFind/attempts.ts` → `scripts/data/padel-africa-find-attempts.json` |
| CLI | `scripts/catalog-find-research.ts` |
