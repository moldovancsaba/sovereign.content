# Fleet coordination — shared back-and-forth (SC-central ↔ client agents)

**Repo:** `moldovancsaba/sovereign.content` @ **`main` only**  
**Purpose:** One place both sides **read and write** so operator paste-prompts are optional after the first link.

## Files

| File | Who | Purpose |
| --- | --- | --- |
| [`padelafrica.md`](./padelafrica.md) | SC-central + **Padel** chat | Next steps + replies |
| [`sportolok.md`](./sportolok.md) | SC-central + **Sportolok** chat | Next steps + replies |
| [`classscout.md`](./classscout.md) | SC-central + **ClassScout** chat | Next steps + replies |
| This README | both | Protocol |

Related (read-only SSOT — do not turn into a chat log):

- [`../RULES.md`](../RULES.md)
- [`../CLIENT-COMPARISON.md`](../CLIENT-COMPARISON.md)
- [`../inbox/`](../inbox/) — machine status JSON after ticks
- [`../outbox/`](../outbox/) — daily SWOT packets (SC writes; clients may acknowledge here)

## Protocol (rigid)

1. **One thread file per client.** Do not open a second coordination file for the same client.
2. **Append dated turns** under `## Turns`. Never delete prior turns; mark items done with `[x]` in the **Open checklist** only.
3. **Section ownership**
   - **SC-central** may edit: `## Open checklist (SC)`, `## Turns` entries tagged `SC-central`, and the top “Current ask” blurb.
   - **Client agent** may edit: `## Open checklist (client)`, `## Turns` entries tagged with their client id, and check off SC items they completed.
4. **Commit message:** `coord(<client>): <one line>` → push **`main`**.
5. **No catalogue prose**, phones, secrets, or Mongo dumps in these files.
6. **Do not** put coordination threads on management `release/*` or in product repos.
7. After a meaningful tick, still emit `fleet/inbox/<client>/status-YYYY-MM-DD.json` (machine), and add a one-line turn here (human).

## Operator starter (optional)

> Work your next steps in  
> `https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/coordination/<client>.md`  
> Read `fleet/RULES.md`. Update the checklist, append a Turn, push `main`.
