# content.classscout — ClassScout / Your Field agent home

**Folder:** `content.classscout/` only  
**Owner chat:** ClassScout Cloud Agent  
**Repo touch surface:** `moldovancsaba/sovereign.content` → **`content.classscout/`** + **`fleet/inbox/classscout/`**  
**Live app:** getyourfield.com / classscout.ai (`moldovancsaba/classscout`)

**Fleet SSOT (read-only):** [`fleet/RULES.md`](../fleet/RULES.md) · [`fleet/CLIENT-COMPARISON.md`](../fleet/CLIENT-COMPARISON.md)

## Visibility first (2026-09-28)

Three silent SC days (2026-09-26…27, until 28) taught the standing rule:

1. **Subscribe** `classscout-find-tick` (~hourly) and **emit** `fleet/inbox/classscout/status-YYYY-MM-DD.json` every tick (Padel discipline).
2. **Cutover is deferred.** Forever on the product tree is fine while the fleet can see KPIs.
3. Missing day inbox = defect. Do not wait for SC script cutover to report.

## Scope (binding)

| In scope | Out of scope |
| --- | --- |
| Agent playbooks, timer prompt, inbox snapshots, cutover honesty | Owning `fleet:daily-swot` or sibling `content.*` |
| Product forever/Find/Improve ops via product repo runners | Merging forever-Find with padel until-found |
| Slim fair-KPI inbox JSON | Inventing phones / About prose / Mongo KPIs beyond rollup |

## Rules (non-negotiable)

1. **This folder is the agent home** for ClassScout docs + timer prompts (+ SC script copies when cutover lands).
2. **Every `classscout-find-tick`:** refresh `fleet/inbox/classscout/status-YYYY-MM-DD.json`.
3. Schedule: `recurringPrograms[].daysOfWeek` only — never management `RecurringSlot` / `weekdays[]`.
4. Media: `generated_art_only`.
5. Do not steal `fleet-daily-swot` or sibling catalog timers.

## Layout

| Path | Purpose |
| --- | --- |
| `docs/` | Forever loop, cutover status, alignment |
| `docs/cutover-status.md` | Honest forever PID location — cutover deferred for visibility |
| `timers/orchestrator.md` | `classscout-find-tick` prompt |
| `ingest/` | Ingest client + content-data-contract |
| `scripts/` | Ported runners (not live PID until cutover) |

## Product vs agent

| Concern | Where |
| --- | --- |
| Live forever / Find / Improve / watchdog | `moldovancsaba/classscout` `scripts/catalog-loop/` (current) |
| Timer prompt + inbox discipline + cutover honesty | **here** |
| Fleet SWOT | SC-central only |
