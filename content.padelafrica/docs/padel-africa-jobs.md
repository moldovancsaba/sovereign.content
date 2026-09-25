# Padel Africa jobs — worked examples for other agents

**Copy the contracts, not the padel domain data.** This page shows how a mature vertical
runs its `catalog:*` loop. Portable contracts live on the process SSOT
([Jobs](https://sovereigncontent.messmass.com/jobs)); script flags live in
[`operations.md`](operations.md). Dual-repo rules:
[`dual-repo-workflow.md`](dual-repo-workflow.md).

## Mental model

| Layer | Role |
| --- | --- |
| **Mongo** (`padel-africa`) | Live catalogue — agents must not open it; management engine owns it |
| **management** repo | Engine UI, pack, public `/api/ingest`, operator `catalog:*` CLIs |
| **sovereign.content/`content.padelafrica/`** | **Only agent folder this chat may edit** — timers, ingest, FIND/self-heal playbooks |
| **sovereign.content site / fleet / other `content.*`** | **SC-central** — out of scope for the padel chat |
| **GDS / vertical pack** | UI + serving projection only |

**Padel Africa only.** Rid of sovereign-direct / multi-client ownership from this chat — see
https://github.com/moldovancsaba/sovereign.content/blob/main/content.padelafrica/AGENTS.md

**Agent writes** go through `POST /api/ingest` from `sovereign.content/content.padelafrica/ingest/`.
Schedule patches must use singular `weekday` RecurringSlots (see that folder’s content-data-contract).
Operator Cloud Agents may still run management `catalog:*` CLIs as product tools — do not add new
management routes/crons for agent features.

## Reference tick order (heal → fill → find)

Run in this order when debt is hot or a Cloud Agent timer fires a multi-job pass:

```bash
# 0) Optional: self-heal status (binds FIND when debt is clear)
npm run catalog:self-heal -- --status

# 1) About — Mongo curated + listings.description
npm run catalog:about-curate -- --limit 15

# 2) Quality — score → improve → encode (Mongo only; no GDS)
npm run catalog:quality-loop -- --score-limit 100 --improve-limit 40

# 3) Media — R2 primary, ImgBB backup, else https passthrough
npm run catalog:media-curate -- --limit 25

# 4) Hygiene — Nominatim geo + contact enrich (no Google key, no AI Gateway)
npm run catalog:hygiene

# 5) Public cards — after About/media writes
npm run serving:reconcile -- --limit 200

# 6) Growth — FIND until one evidence-grade seed (or budget exhausted)
npm run catalog:find -- --until-found --max-cells 8
# …agent executes firstBrief cells; see FIND example below…

# 7) Card queue only (no-op when content_cards empty)
npm run catalog:autopilot -- --ticks 10 --requeue-limit 10
```

**Empty-tick lesson:** `about-curate considered=0`, `quality-loop alreadyGood=100`,
`media-curate scanned=0`, `autopilot ranTicks=0` means the catalogue is settled — use
**FIND** (`--until-found`) for growth, not inventing venues.

---

## Example: `catalog:quality-loop`

**Contract:** score published About → open recommendations → apply safe upgrades → encode
lessons. Never invents venues or amenities.

```bash
npm run catalog:quality-loop -- --score-limit 100 --improve-limit 40
```

**Healthy summary (settled catalogue):**

```json
{
  "score": { "scanned": 100, "openWritten": 0, "alreadyGood": 100 },
  "improve": { "considered": 0, "applied": 0, "skipped": 0, "failed": 0 },
  "encode": { "encoded": 0, "skipped": 2 }
}
```

**Rules agents must keep:**

- No `--with-serving`. No pack / GDS load on this tick.
- Improve prefers Mongo `listing_curated_abouts`, then fact composer.
- After About writes elsewhere, run `serving:reconcile` separately.
- Guide: [`listing-quality-loop.md`](listing-quality-loop.md).

---

## Example: `catalog:about-curate`

**Contract:** same skill as fixing one provider About by hand. Draft → upsert
`listing_curated_abouts` → apply `listings.description`.

```bash
npm run catalog:about-curate -- --limit 15
# Explicit draft:
npm run catalog:about-curate -- --listing-id research-nga-ven-007 --about "…"
```

**Settled tick:** `{ "considered": 0, "applied": 0 }`.  
**Writing tick:** non-zero `applied`; then `serving:reconcile`.

No AI Gateway. No repo content files for live Abouts.

---

## Example: `catalog:media-curate`

**Contract:** fill empty / low-quality `listings.media`. Prefer website imagery, else listing
page Open Graph snapshot. Rehost: **R2 primary → ImgBB backup → https passthrough**.

```bash
npm run catalog:media-curate -- --limit 25
npm run catalog:media-curate -- --listing-id research-nga-ven-006
```

**Env (script loads `.env.local` / `.env`):**

| Var | Role |
| --- | --- |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` | Primary CDN |
| `IMGBB_API_KEY` | Backup host |
| `PUBLIC_SITE_ORIGIN` | Optional page-snapshot origin |

**Proven R2 apply (PadelBay):**

```json
{
  "host": { "r2": true, "imgbb": true, "primary": "r2" },
  "results": [{
    "listingId": "research-nga-ven-006",
    "status": "applied",
    "source": "website",
    "host": "r2",
    "url": "https://pub-….r2.dev/listings/research-nga-ven-006/website-….png"
  }]
}
```

Policy: `--policy allow_og_scrape` (padel default) or `generated_art_only` (coverage only; no venue photos).

---

## Example: `catalog:hygiene` + `serving:reconcile`

```bash
npm run catalog:hygiene
# detail: geo=…/… price=…/… contact=…/…  written=N  errors={}

npm run serving:reconcile -- --limit 200
# rebuilt / deleted / failures
```

Hygiene uses Nominatim (sets a default `GEOCODER_USER_AGENT`). Contact pass never invents
phones/emails — only card `sourceText` headers or promotable `sourceUrl`. Always exits via
`finally` (close Mongo). Twin of the catalog-backfill cron.

---

## Example: `catalog:self-heal` (binds FIND)

```bash
npm run catalog:self-heal -- --status
npm run catalog:self-heal -- --brief          # agent research brief when debt is open
npm run catalog:self-heal -- --record-process --job=catalog:find --kind=success --message="…"
```

When **open About debt ≥ 3**, `--until-found` **defers** and prints heal-first instructions.
Research / contact gaps do **not** block FIND — work them in parallel via
`catalog:self-heal --brief`. Guide: [`padel-africa-self-heal.md`](padel-africa-self-heal.md).

---

## Example: `catalog:find --until-found` (do-until-seed)

**Contract:** CLI plans and seeds; the **agent** must WebSearch, verify evidence, write fixtures.
Never invent phones, emails, ages, or court counts.

```bash
npm run catalog:find -- --until-found --max-cells 8
# Read campaign.cells + firstBrief.searchQueries / evidenceBar / excludeNames
```

**Agent loop (one campaign):**

1. Take cells in order (yield bias: deepen/high-directory first).
2. Run each `searchQueries` entry (WebSearch). Open official / directory pages from `sourcesToCheck`.
3. **Seed path:** evidence bar clears + name not in `excludeNames` → append fixture row →
   `--fixture=… --dry-run` → apply → `--record-attempt --outcome=seeded` → **STOP**.
4. **Zero path:** no evidence-grade venue → `--record-attempt --outcome=zero-result` → next cell.
5. All cells dry → report `budget_exhausted` (never invent a venue to satisfy the goal).

**Worked seed (2026-09-24):** NG Ibadan → Padel Pro Club Ibadan (`NGA-VEN-007`) from Padel Lands
+ PadelRevive + Nominatim Magazine Road pin. Apply:

```bash
npm run catalog:find -- --fixture=scripts/data/nigeria-padel-verified.json --dry-run
npm run catalog:find -- --fixture=scripts/data/nigeria-padel-verified.json
npm run catalog:find -- --record-attempt --cc=NG --city=Ibadan --outcome=seeded
```

Continent plan: [`padel-africa-find-continent-plan.md`](padel-africa-find-continent-plan.md).

### Fair-use seed replenish (same tick, when queue empty)

When there is no pending verified fixture / apply-queue row, run **one** polite directory pass
(ClassScout fair-use rules, Africa sources — not NYC forever):

```bash
npm run fair-use:status
npm run fair-use:one-pass
# Review needs_verify candidates → confirm evidence bar → append *-padel-verified.json → ingest
```

SSOT: [`scripts/fair-use/README.md`](../scripts/fair-use/README.md). Soft-skip CF/403; never invent contacts.

**Report shape for timer ticks:**

```json
{
  "cellsTried": [{ "cc": "NG", "city": "Ibadan", "outcome": "seeded" }],
  "outcome": "seeded",
  "listingIds": ["research-nga-ven-007"]
}
```

---

## Example: `catalog:autopilot`

```bash
npm run catalog:autopilot -- --ticks 10 --requeue-limit 10
```

Structured `Name:` / `CountryCode:` / lat-lng headers only — **no AI Gateway** required.
Empty `content_cards` → `{ "requeued": 0, "ranTicks": 0 }` is a normal zero-cost tick.
Autopilot does **not** discover new venues; that is FIND.

---

## Media host setup (R2 primary / ImgBB backup)

| Host | Env | Notes |
| --- | --- | --- |
| Cloudflare R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` | S3-compatible PutObject. From a CF API token: Access Key ID = token `id`; Secret = SHA-256 hex of token value ([CF R2 auth](https://developers.cloudflare.com/r2/api/tokens/)). |
| ImgBB | `IMGBB_API_KEY` | Backup when R2 fails or is unset |

Set on Vercel **and** the Cloud Agent environment so timer ticks rehost, not passthrough.

---

## Cursor timer orchestration (padel reference)

### Prefer one timer, not a chain

`subscribe_timer` only **enqueues a prompt** when the agent is free. It does **not** start
another timer, wait for a CLI exit code, or hand off to a sibling job. There is no native
“job finishes → launch next timer” API.

| Approach | Works? | Notes |
| --- | --- | --- |
| **One orchestrator timer** whose prompt runs jobs **in order in the same turn** | **Yes — preferred** | One subscription, one wake, sequential CLIs + FIND execute + digest. Survives MCP caps on *new* timer names. |
| Many timers (one job each) | Yes, but costly | Five parallel wakes contend for the same agent; new names can be rejected while existing ones remain. |
| Timer A’s last step `subscribe_timer`s Timer B (chain) | Fragile — avoid | Needs a free subscription slot each hop; `once` links race with recurring ticks; dedupe-by-name keeps stale prompts unless you `unsubscribe` first. |

**Rewrite a live timer:** `unsubscribe` that `subscriptionId`, then `subscribe_timer` again with the
**same `name`** and the new prompt/`delaySeconds`. Deduping by name silently keeps the old
config if you skip unsubscribe.

### Single orchestrator (recommended)

One recurring timer (~3600s), prompt order:

1. `catalog:about-curate -- --limit 15`
2. `catalog:quality-loop -- --score-limit 100 --improve-limit 40`
3. `catalog:media-curate -- --limit 25`
4. `catalog:autopilot -- --ticks 10 --requeue-limit 10`
5. `catalog:hygiene` then `serving:reconcile -- --limit 200`
6. FIND: `catalog:find -- --until-found --max-cells 8` + evidence-only cell execute (stop on first seed)
7. `catalog:self-heal -- --digest` — smart report; run `auto` / `agent_execute`; queue `hitl_review`

Leave **that one timer** subscribed. Report one combined summary (not five separate wakes).
No AI Gateway / Ollama on these ticks.

Reference name used on this agent: `padel-find-tick` (orchestrator prompt; not FIND-only).

### Job sketches (same commands as above)

| Step | Command sketch |
| --- | --- |
| about + quality | `about-curate --limit 15` then `quality-loop --score-limit 100 --improve-limit 40` |
| media | `media-curate --limit 25` |
| autopilot | `catalog:autopilot --ticks 10 --requeue-limit 10` |
| hygiene + reconcile | `catalog:hygiene` then `serving:reconcile --limit 200` |
| FIND | `catalog:find --until-found --max-cells 8` + agent execute |
| self-improve | `catalog:self-heal -- --digest` (+ HiTL classes) |

---

## What not to copy from padel

- Country research fixture contents and invented contact rows
- ClassScout **NYC** fair-use source registry / dense `forever.sh` thrash (Africa fair-use one-pass is local here)
- Putting live About / media binaries into git
- Treating GDS pack-load warnings as content failures
- Using AI Gateway / Ollama on these Cloud Agent catalog ticks

## Dense-US twin (ClassScout)

Full twin knowledge (intentional diffs, adopt list, results lens):
[`classscout-sovereign-twin.md`](classscout-sovereign-twin.md).

ClassScout keeps forever Find + `generated_art_only` media. Thin SC job aliases live in ClassScout
[`docs/sovereign-content-alignment.md`](https://github.com/moldovancsaba/classscout/blob/main/docs/sovereign-content-alignment.md).
Portable contracts (#6–#21) are on [SC Jobs](https://sovereigncontent.messmass.com/jobs). Do not
merge engines — export SC orchestration (self-heal, until-found, archive, twin check, reconcile)
into ClassScout where forever thrashing hurts; keep ClassScout borough / fair-use strengths local.

**Self-heal note:** `catalog:self-heal --status` reports `openOperatorFeedback` and instructs
`catalog:quality-loop` when `/stats` card notes are open — never paste the note into About.
Feedback audit (collectors vs consumers vs gaps):
[`padel-africa-self-heal-feedback-audit-2026-09-24.md`](padel-africa-self-heal-feedback-audit-2026-09-24.md).
SSOT self-improve plan: `plan-sovereign-self-improve-loop.md`.

## Related

- SSOT Jobs: https://sovereigncontent.messmass.com/jobs
- SSOT Cursor: https://sovereigncontent.messmass.com/environments/cursor
- SSOT Adopting: https://sovereigncontent.messmass.com/adopting
- ClassScout twin: [`classscout-sovereign-twin.md`](classscout-sovereign-twin.md)
- Self-heal: [`padel-africa-self-heal.md`](padel-africa-self-heal.md)
- FIND continent: [`padel-africa-find-continent-plan.md`](padel-africa-find-continent-plan.md)
- Quality loop: [`listing-quality-loop.md`](listing-quality-loop.md)
- Operations scripts: [`operations.md`](operations.md)
