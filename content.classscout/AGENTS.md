# content.classscout — sovereign content agent

**Owner:** content-agent team  
**Repo:** `moldovancsaba/sovereign.content` → this folder  
**Live product:** [getyourfield.com](https://getyourfield.com) / [classscout.ai](https://classscout.ai)  
(`moldovancsaba/classscout` — **not** `moldovancsaba/management`)

## Rules (non-negotiable)

1. **This folder is the home** for ClassScout Find→Improve→self-heal forever, fair-use feeder,
   agent docs, timer prompts, and ingest-side automation.
2. **Do not** add agent routes, libs, or crons to `moldovancsaba/classscout` for new autonomy —
   product keeps validated ingest + UI. **Do not** put ClassScout agent code in
   `moldovancsaba/management` either.
3. **Do not** write the product Mongo database from this agent as the steady-state path. Use
   `POST /api/ingest` and `POST /api/ingest/upload` with `INGEST_API_KEY` (Bearer).
4. **Do not** import from `../sportolok/` or `../content.padelafrica/`.
5. Schedule / listing fields must match [`ingest/content-data-contract.md`](./ingest/content-data-contract.md)
   — ClassScout `recurringPrograms[].daysOfWeek` (full English day names), **not** management’s
   `RecurringSlot` / `weekday` / `weekdays[]` shapes.

## Layout

| Path | Purpose |
| --- | --- |
| `docs/` | Storage SSOT, job aliases, forever loop, error playbook, migration |
| `timers/` | Cursor timer orchestrator prompt |
| `ingest/` | Ingest client + schedule conversion + content contract |
| `scripts/` | Catalog-loop runners (forever, Find, Improve, self-heal, fair-use) |

## Product vs agent

| Concern | Where |
| --- | --- |
| Next.js app, admin, public UI, ingest validation, Lite product | `moldovancsaba/classscout` |
| Find/Improve/self-heal forever, fair-use, agent playbooks | **here** |
| Portable process contracts | site root `/jobs`, `/implement`, … |

Product repo still may hold transitional wrappers until cutover; **edit agent how-to here first**.
