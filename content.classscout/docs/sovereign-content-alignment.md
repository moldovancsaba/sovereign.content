# Sovereign Content alignment (ClassScout)

**Storage (BINDING):** [`sovereign-content-storage.md`](sovereign-content-storage.md) — product vs
`sovereign.content/content.classscout/` agent home · migration inventory
[`reports/sovereign-content-classscout-migration.md`](reports/sovereign-content-classscout-migration.md) ·
rule **454**.

**Cross-vertical SSOT:** [https://sovereigncontent.messmass.com](https://sovereigncontent.messmass.com)  
**Jobs / Cursor / Adopting / Implement:**
[Jobs](https://sovereigncontent.messmass.com/jobs) ·
[Cursor](https://sovereigncontent.messmass.com/environments/cursor) ·
[Adopting](https://sovereigncontent.messmass.com/adopting) ·
[Implement](https://sovereigncontent.messmass.com/implement)  
**This vertical’s runner SSOT:** [`catalog-find-improve-loop.md`](catalog-find-improve-loop.md)  
**Business rules:** [`business-rules.md`](business-rules.md) rule **450** (self-heal / About bar / archive) · **452** (orchestration gaps) · **453** (smart delivery) · **454** (agent storage) · aliases live in this doc (not rule 434)

ClassScout keeps its battle-tested Find/Improve forever loop. Sovereign Content supplies the
portable job vocabulary and adoption playbook used across verticals (Padel Africa / management
first). **Agent runners are migrating to `sovereign.content/content.classscout/`** (client-folder model);
today they still run from `scripts/catalog-loop/` in this product repo (transitional). This doc is
the **alias map + how we run the SC job names here** — not a second doctrine.
Copy contracts from padel job examples; do **not** copy padel fixtures or switch media to OG scrape.

## Intentional product diffs (keep)

| Diff | ClassScout | Padel / SC default |
| --- | --- | --- |
| Growth runtime | **forever** Find+Improve (dense US fair-use) | Sparse `subscribe_timer` ticks |
| Media | **`generated_art_only`** — no venue-photo scrape | `allow_og_scrape` → R2 → ImgBB |
| Geography | Bidirectional city/borough + multi-city Find | Continent / pack territory ladder |
| Sparse growth | `catalog:find --until-found` **complements** forever | Primary FIND path |

## Job alias map

| Sovereign Content job | ClassScout implementation | npm |
| --- | --- | --- |
| `catalog:quality-loop` | `recommend-improve` → `improve-cycle` → `encode-lessons` | `npm run catalog:quality-loop` |
| `catalog:about-curate` | `repair-weak-descriptions` + `repair-meta-description-chrome` | `npm run catalog:about-curate` |
| `catalog:autopilot` | `find-cycle` (bounded `CATALOG_FIND_BATCH` / `--ticks`) | `npm run catalog:autopilot` |
| `catalog:hygiene` | geo / price / venue-model / clientFeedback / **contact** | `npm run catalog:hygiene` |
| `catalog:contact-enrich` | Evidence-only phone/website/email; `no_evidence` → research debt | `npm run catalog:contact-enrich` |
| `catalog:media-curate` | Coverage report; `--policy generated_art_only` (default) | `npm run catalog:media-curate` |
| `catalog:self-heal` | About + priority + operator feedback + contact debt; **defer Find** when hot | `npm run catalog:self-heal` |
| `catalog:find --until-found` | Scarcity briefs + one-seed stop; agent WebSearch path | `npm run catalog:find -- --until-found` |
| `catalog:archive-snapshot` | Dated JSON facts under `archive/classscout/content/` | `npm run catalog:archive-snapshot` |
| `serving:reconcile` | Sparse-timer after about/quality/hygiene (auto unless `--no-serving-reconcile`) | `npm run serving:reconcile` |
| Continuous Find+Improve | `forever.sh` (self-heal → improve → Find-or-defer) | `npm run catalog-loop:forever` |
| Sparse timer ticks | `sparse-timer.sh` | `npm run catalog-loop:sparse-timer` |
| Cron ↔ CLI twins | `check:cron-cli-twins` in the delivery gauntlet | `npm run check:cron-cli-twins` |

Legacy `catalog-loop:*` names remain the primary day-to-day aliases. SC names are thin twins so
agents reading the Sovereign Content site call the same scripts.

## Dry-run first (SC adopting rule)

```bash
npm run catalog:about-curate -- --dry-run --limit 10
npm run catalog:quality-loop -- --dry-run
npm run catalog:hygiene -- --dry-run --limit 10
npm run catalog:hygiene -- --dry-run --passes contact --limit 10
npm run catalog:media-curate -- --dry-run --policy generated_art_only
npm run catalog:self-heal -- --status
npm run catalog:self-heal -- --brief --scan-mongo
npm run catalog:find -- --status
npm run catalog:archive-snapshot -- --dry-run --limit 5
npm run check:cron-cli-twins
# after dry-runs look sane: drop --dry-run, then sparse-timer with reconcile
npm run catalog-loop:sparse-timer -- --with-about-curate --with-self-heal --with-hygiene --dry-run
```

`--dry-run` (or `CATALOG_LOOP_DRY_RUN=1`) composes / selects candidates without ingest writes.
Find dry-run skips upload/upsert/smoke persistence and does not advance seed state.

## Self-heal before Find (rules 450 / 452 / 453)

```bash
npm run catalog:self-heal -- --status
npm run catalog:self-heal -- --brief --scan-mongo
npm run catalog:self-heal -- --report          # reasoned auto vs HitL plan (latest.md)
npm run catalog:self-heal -- --apply-auto --dry-run
npm run catalog:self-heal -- --apply-auto      # auto lane only; HitL stays in review-packet
```

Debt that **defers Find** (heal-first):

- Weak About / soft About below target 75 (`CATALOG_SELF_HEAL_WEAK_ABOUT_THRESHOLD`, default 25)
- Priority open recommendations (`CATALOG_SELF_HEAL_PRIORITY_THRESHOLD`, default 40)
- Contact / research debt (`CATALOG_SELF_HEAL_CONTACT_THRESHOLD`, default 30)
- Pending operator feedback files or open `operator_feedback` recs (threshold default 1)

Override: `CATALOG_SELF_HEAL_FORCE_FIND=1` or `CATALOG_SELF_HEAL_DEFER_FIND=0`.

**Smart delivery (rule 453 — Human-on-the-loop):**

| Lane | Examples | Who decides |
| --- | --- | --- |
| **Auto** | chrome strip, About compose from facts, contact from official page, evidence Improve, seed Tier A pause, defer Find | forever / `--apply-auto` |
| **HitL (owner review)** | hide/quarantine, duplicate twin hide, invent address/contact, exhausted address decision, until-found publish, media policy change, operator note → About | review-packet checklist |

Reports live under `scripts/catalog-loop/data/self-heal-reports/` (`latest.md` + `review-packet-latest.json`).
They are reasoned write-ups (verdict, samples, owner questions) — not mechanical KPI dumps.

**Operator `/stats` feedback:** intake opens improve recommendations and lessons. The note is stored
on the recommendation / event log only — **never pasted into About**.

About quality bar: `CATALOG_ABOUT_QUALITY_TARGET` (default **75**). Locality name-drop is capped;
chrome / inventory boilerplate never passes.

## Sparse Find `--until-found` (complement forever)

```bash
npm run catalog:find -- --status          # print firstBrief for the agent
npm run catalog:find -- --until-found --max-cells 8 --dry-run
npm run catalog:find -- --record-attempt --outcome=seeded
```

Use when the seed queue idles, boroughs are thin, or a new city needs evidence-only growth.
Forever remains the default for dense NYC fair-use. On `seeded`, stop the campaign.

## Sparse timer vs forever

| Runtime | Use when |
| --- | --- |
| `catalog-loop:forever` | Dense Find/Improve in this environment (default) |
| `catalog-loop:sparse-timer` | Cursor `subscribe_timer` / cron; add `--with-digest`, `--with-about-curate`, `--with-hygiene`, `--with-quality-loop`, `--with-self-heal` as needed |

About / quality / hygiene ticks **auto-run** `serving:reconcile` afterward (dry-run unless
`CATALOG_SERVING_RECONCILE_APPLY=1`). Pass `--no-serving-reconcile` to skip.

## Archive-backup (vertical branch only)

```bash
npm run catalog:archive-snapshot -- --dry-run --limit 5
npm run catalog:archive-snapshot
```

Mongo remains live SSOT. Snapshots hold listing facts + media URLs — never binaries.
**Agent code TARGET** is `sovereign.content/content.classscout/` (rule 454); process doctrine stays on the
SC site root. Do not park listing About/media in `sovereign.content`.

## Cron ↔ CLI twins

Every `vercel.json` HTTP cron must have an `npm run` twin agents can call without `CRON_SECRET`.
Enforced by `npm run check:cron-cli-twins` (gauntlet). Prefer `catalog:*` / `serving:*` / `cron:*`
names; legacy runners stay as day-to-day aliases.

## Media policy note

Sovereign Content’s media-curate prefers website OG → R2 → ImgBB → https passthrough. ClassScout
parents see **generated listing art** by default; Find already attaches a generated placeholder via
`/api/ingest/upload` (R2 preferred, ImgBB fallback — rule 424). `catalog:media-curate --policy
generated_art_only` reports coverage and refuses to scrape venue photographs until product enables
own-photo mode. `--policy allow_og_scrape` is accepted for SC parity but does not scrape here.

## Feeding process findings back to Sovereign Content

File process (not catalog) recommendations so other verticals inherit them — especially Padel Africa.

1. Prefer [https://sovereigncontent.messmass.com/recommendations](https://sovereigncontent.messmass.com/recommendations)
2. Open a GitHub Issue on `moldovancsaba/sovereign.content` with label `agent-recommendation`
3. One idea per issue; include evidence (env, job, counts, sample ids) and a concrete SSOT/CLI edit
4. Do **not** put listing About or media into that repo

**Filed 2026-09-23** — see
[`reports/sovereign-content-recommendation-draft.md`](reports/sovereign-content-recommendation-draft.md)
(#6–#21).

**Filed 2026-09-24** — #22 city/borough · #23 chatbot About · #24 self-heal/archive twins ·
[#25 until-found / contact enrich / cron-cli-twins](https://github.com/moldovancsaba/sovereign.content/issues/25) ·
[#27 client folders (`content.classscout/` / `sportolok/` / `content.padelafrica/`)](https://github.com/moldovancsaba/sovereign.content/issues/27)
(storage model; #26 was an accidental probe).

## Agent pointers

- **Where code/docs live (BINDING):** [`sovereign-content-storage.md`](sovereign-content-storage.md)
- Cross-vertical doctrine / jobs / Cursor playbook: `https://sovereigncontent.messmass.com`
- ClassScout loop ops: this file + [`catalog-find-improve-loop.md`](catalog-find-improve-loop.md)
- Migration inventory: [`reports/sovereign-content-classscout-migration.md`](reports/sovereign-content-classscout-migration.md)
- Self-heal / feedback effectiveness audit + build plan:
  [`reports/self-heal-feedback-audit-plan.md`](reports/self-heal-feedback-audit-plan.md)
- ClassScout system map: [`INDEX.md`](INDEX.md)
