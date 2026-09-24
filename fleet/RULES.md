# Fleet rules — rigid (binding for all content agents)

**Repo:** `moldovancsaba/sovereign.content` @ `main` only  
**Owner:** SC-central agent  
**Audience:** every `content.*` agent chat + anyone writing cross-client comparisons

If a local doc conflicts with this file, **this file wins**. Fix the local doc the same day.

---

## 1. Dual-repo delivery (where content may live)

| Content type | Allowed home | Forbidden |
| --- | --- | --- |
| Portable doctrine / Jobs / comparisons / fleet digests | `sovereign.content` **`main`** | management `release/*`, classscout product branches as SSOT |
| Per-client agent playbooks, timers, ingest helpers, runners | `sovereign.content/content.<client>/` on **`main`** | Other clients’ folders; inventing a second SSOT branch |
| Engine / vertical pack / product CLI fixes | PR → management **`main`** (then FF release) | Committing agent runtimes onto `release/padel-africa` or `release/sportolok` |
| ClassScout product UI / ingest validation | `moldovancsaba/classscout` | Putting ClassScout product into management |
| Live catalogue prose, Mongo dumps, media binaries | Product DB / object storage only | Anywhere in `sovereign.content` docs tree |
| Cross-client audits / SWOT / maturity scorecards | **`fleet/`** only | Root scatter; management release branches; inside one `content.*` as if it were global SSOT |
| SC ↔ client next-step back-and-forth | **`fleet/coordination/<client>.md`** on `main` | Slack-only truth; release-branch chore threads; parallel unofficial trackers |

**Hard rule:** Never publish a “system comparison” or “SSOT compliance %” under `management/release/*`. Those branches are product pointers, not the content-agent knowledge base.

---

## 2. Canonical comparison (one truth)

| Doc | Role |
| --- | --- |
| **[`CLIENT-COMPARISON.md`](./CLIENT-COMPARISON.md)** | **Only** maturity + workflow comparison SSOT |
| [`profiles/*.json`](./profiles/) | Fair KPI / unfair-comparison bindings for scores |
| [`digests/`](./digests/) | Dated fleet SWOT outputs (growing knowledge) |
| Root `CLIENT-FOLDER-COMPARISON.md` | **Stub → redirects here** (do not extend) |
| Old workflow note under `fleet/CONTENT-CLIENTS-WORKFLOW-COMPARISON.md` | **Stub → redirects here** (do not extend) |

When you write a new comparison: **edit `CLIENT-COMPARISON.md`** (or add a dated section), commit to `main`. Do not invent a fourth file in a fifth location.

---

## 3. Scoring honesty (no vanity %)

1. **Never** publish a single “SSOT compliance %” across heterogeneous clients.
2. Use **two scorecards** only (same as `fleet:daily-swot`):
   - **A — Working environment** (Cursor / dual-repo / ingest-only / timer / docs honesty)
   - **B — Content outcomes** (profile-fair KPIs only; else `insufficient_signal`)
3. Load [`profiles/<client>.json`](./profiles/) before ranking. Respect `unfairComparisons`.
4. Quarantine / migration debt **lowers** environment fitness — documenting quarantine is not “migration complete.”
5. “API-only in AGENTS.md” ≠ “API-only in running scripts.” Report **doctrine vs reality** as separate columns.
6. Do not crown winners by raw publish volume, forever-loop rate, or script file count alone.

---

## 4. Intentional product diffs (never collapse)

| Keep different | ClassScout | Padel Africa | Sportolok |
| --- | --- | --- | --- |
| Growth | forever Find+Improve (+ fair-use) | sparse `--until-found` | evaluate/delivery → ingest cutover |
| Media | `generated_art_only` | OG → R2 / ImgBB | product pipeline until ingest rewrite |
| Schedule | `daysOfWeek` Monday…Sunday | `RecurringSlot` singular `weekday` | same as padel |
| Product home | `classscout` repo | management `release/padel-africa` | management `release/sportolok` (diverged — await core) |

Do **not** merge ClassScout forever-Find with padel until-found engines.  
Do **not** force-push `release/sportolok`.  
Do **not** send management `weekdays[]` shapes to any management client.

---

## 5. Writes

1. Agent writes to live apps **only** via documented `POST /api/ingest` (+ ClassScout upload).
2. Quarantined Mongo executors under `content.sportolok/src/` must **not** be re-enabled against shared DB.
3. Management `catalog:*` CLIs are **product surfaces** — padel Cloud Agent may run them as operator tools; that does **not** make Mongo-from-agent doctrine-compliant. Track the gap honestly; prefer ingest + `fleet/inbox` snapshots over pretending the gap is closed.
4. Never invent phones, emails, ages, court counts, or venues.

---

## 6. Timers

| Timer | Owner chat | Cadence |
| --- | --- | --- |
| Client catalog orchestrator (`content.*/timers/`) | That client’s chat | ~hourly / forever as documented |
| `fleet-daily-swot` | **SC-central only** | 06:00 UTC |

Do not steal another chat’s timer. Do not chain timers.

---

## 7. Correction duty

If you find a doc that:

- lives on `release/*` but describes agent SSOT, **or**
- claims migration complete while quarantine/Mongo scripts remain, **or**
- invents a new comparison file outside `fleet/CLIENT-COMPARISON.md`,

then: write the fix on `sovereign.content` `main`, link this rules file, and tell the operator which forbidden path to delete on reconcile.

---

## 8. SC ↔ client coordination threads

Shared editable files (both sides read/write on `main`):

| Client | Thread |
| --- | --- |
| Padel | [`coordination/padelafrica.md`](./coordination/padelafrica.md) |
| Sportolok | [`coordination/sportolok.md`](./coordination/sportolok.md) |
| ClassScout | [`coordination/classscout.md`](./coordination/classscout.md) |

Protocol: [`coordination/README.md`](./coordination/README.md). Append dated turns; check off open items; do not fork a second tracker. After catalog ticks: machine JSON in `fleet/inbox/` **and** a short human turn in the coordination thread when an ask is open.
