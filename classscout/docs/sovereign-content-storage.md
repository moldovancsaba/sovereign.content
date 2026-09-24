# Sovereign Content storage — where ClassScout agent code and docs live

**Status: BINDING** (owner adoption of the management-core separation directive, 2026-09-24).  
**Companion:** [`sovereign-content-alignment.md`](sovereign-content-alignment.md) (job aliases + how we run) ·  
[`reports/sovereign-content-classscout-migration.md`](reports/sovereign-content-classscout-migration.md) (move inventory + DoD) ·  
business-rules.md rule **454**.

Cross-vertical site: [https://sovereigncontent.messmass.com](https://sovereigncontent.messmass.com) ·  
Repo: [`moldovancsaba/sovereign.content`](https://github.com/moldovancsaba/sovereign.content) ·  
Client-folder recommendation: [sovereign.content#27](https://github.com/moldovancsaba/sovereign.content/issues/27).

---

## Naming (this vertical)

| Prompt / other verticals say… | ClassScout means… |
| --- | --- |
| `sportolok/` (management client) | Sibling client — **not us** |
| `padel-africa/` | Sibling client on management packs — **not us** |
| Product / “management app” | **`moldovancsaba/classscout`** — the Your Field / ClassScout product |
| Agent / “sovereign agent” | Catalog Find→Improve→self-heal forever (`catalog:*` / `catalog-loop:*`) |
| Client folder in `sovereign.content` | **`classscout/`** (folder id = GitHub product repo name) |
| Public write API | ClassScout **`POST /api/ingest`** (+ upload) with `INGEST_API_KEY` |
| Content data contract | ClassScout validated provider/meetup ingest path (`validateProviderDocument`, types in `src/types/provider.ts`, `docs/data-model.md`) — **not** management’s content-data-contract doc |

---

## Three places — one job each

```
moldovancsaba/classscout          → PRODUCT (app, admin, public UI, validated ingest, Mongo SSOT)
moldovancsaba/sovereign.content
  /                               → PROCESS SSOT site (doctrine, jobs, adopting) — shared
  /classscout/                    → THIS VERTICAL’S AGENT (runners, agent docs, plans) — TARGET HOME
archive/classscout/content/       → Optional JSON fact stamps on the product branch (never binaries)
```

| Lives in… | May contain | Must not contain |
| --- | --- | --- |
| **`classscout` product repo** | Next.js app, admin, public APIs, ingest validation, Lite product integration, product `docs/*` (business-rules, architecture, API contracts), board #44 | Cross-client agent engines; other verticals’ folders; parking agent-only forever-loop as if it were product code long-term |
| **`sovereign.content/classscout/`** | Find/Improve/self-heal runners, forever/sparse-timer, fair-use feeder, agent ops docs, migration reports, client-local config | Product UI; other clients’ imports; catalog row content; media binaries |
| **`sovereign.content` site root** | Portable `catalog:*` contracts, Cursor/adopting playbooks | Client-specific runners; listing content |

**No client folder may import from or depend on another.** `classscout/` never imports `padel-africa/` or `sportolok/`.

---

## How the agent may talk to the product

Once the agent runs from `sovereign.content/classscout/` (or from this repo during migration), it may touch live ClassScout **only** through:

1. **`POST /api/ingest`** / **`POST /api/ingest/upload`** with a scoped ingest key — the **validated** write path.
2. Documented public/admin APIs that already exist for ops (e.g. catalog-loop stats ingest), still authenticated.

It must **never**:

- add routes or libraries to `moldovancsaba/management` (we are not that engine),
- add agent autonomy routes inside ClassScout that bypass ingest validation,
- write schedule / provider fields by raw Mongo `updateOne` that skip `validateProviderDocument`,
- invent a schedule shape that is not ClassScout’s contract.

### Schedule shape (ClassScout — do not confuse with management)

Management’s sportolok outage used a wrong `schedule.recurring` shape (`weekdays[]` on one object).  
**ClassScout does not use that contract.** Recurring programs here are:

- `provider.recurringPrograms[]` with **`daysOfWeek: RecurringProgramDay[]`** (and structured day twins) — see `src/types/provider.ts`.
- Writes must go through ingest validation. Free-text “Monday 10:00–11:00” strings are **evidence for extractors**, not the stored listing field.

If an extractor produces free-text schedule lines, convert them to ClassScout’s `RecurringProgram` shape **before** upsert — same lesson as management’s `RecurringSlot` rule, different field names.

---

## What is true today vs target

| Asset | Today (transitional) | Target |
| --- | --- | --- |
| Forever / Find / Improve / self-heal | `scripts/catalog-loop/` in **this** repo | `sovereign.content/classscout/` |
| SC job aliases (`catalog:*`) | `package.json` in this repo | Agent package.json under `sovereign.content/classscout/` (product may keep thin wrappers that shell out or document the external runner) |
| Agent ops docs (`catalog-find-improve-loop.md`, error playbook, quality plan, self-heal plans) | `docs/` in this repo | Prefer `sovereign.content/classscout/docs/`; product keeps a **pointer** only |
| Product docs (business-rules, architecture, API, DoD) | `docs/` here | **Stay here forever** |
| Process doctrine / portable jobs | sovereigncontent.messmass.com | **Stay** at site root (not under `classscout/`) |
| Live listings | Mongo via product | **Stay** in Mongo; archive JSON optional under `archive/classscout/content/` |

During transition, `scripts/catalog-loop/` remains the runnable home so production forever does not break. Every agent change must keep the **ingest-only write rule** and the inventory in the migration report current.

---

## What we never do

1. **Commit ClassScout agent work into `moldovancsaba/management`** (any branch, including `release/*`).
2. **Put listing content or media binaries into `sovereign.content`.**
3. **Cross-import client folders** inside `sovereign.content`.
4. **Rewrite or force-push another product’s release branch** — management owns reconciling `release/sportolok`; we do not touch it.
5. **Treat “direct Mongo repair” as the steady-state write path** — repairs that must stamp fields go through ingest or an explicitly audited product script that uses the same validators.

---

## Agent checklist (copy into session briefs)

```
## Sovereign storage (ClassScout)
- Product code/docs: moldovancsaba/classscout
- Agent TARGET: moldovancsaba/sovereign.content/classscout/
- Process SSOT site: https://sovereigncontent.messmass.com
- Writes: POST /api/ingest (+ upload) only — match ClassScout provider contract
- Never: management release branches; other clients’ folders; invent schedule shapes
- Pointers: docs/sovereign-content-storage.md · docs/sovereign-content-alignment.md
```
