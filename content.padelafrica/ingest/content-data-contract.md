# Content data contract (agent mirror)

> Management core asked agents to follow `docs/content-data-contract.md` in
> `moldovancsaba/management`. That file was **not present on `main`** at migration time
> (2026-09-24). This mirror tracks the live TypeScript contract in
> `management/src/lib/schedule/schedule.ts` and the ingest route
> `management/src/app/api/ingest/route.ts`. When core publishes the atomic doc, replace this
> file with a link or verbatim copy.

## Schedule — `RecurringSlot` (required shape)

**Correct** — one object per weekday, singular field:

```json
{
  "timezone": "Africa/Nairobi",
  "recurring": [
    { "weekday": "mon", "startTime": "18:00", "endTime": "19:00" },
    { "weekday": "tue", "startTime": "18:00", "endTime": "19:00" }
  ],
  "sessions": []
}
```

**Forbidden** (caused the sportolok `/browse` outage):

```json
{
  "recurring": [
    {
      "weekdays": ["monday", "tuesday"],
      "startTime": "18:00",
      "endTime": "19:00"
    }
  ]
}
```

Also forbidden as the stored listing schedule: free-text string arrays like
`["Monday 10:00-11:00", "Wednesday 15:00-16:00"]`. Convert with
`scheduleToRecurringSlots()` in this folder before any ingest `patch`.

### Weekday codes

Only: `mon` | `tue` | `wed` | `thu` | `fri` | `sat` | `sun`  
Times: `HH:MM` 24h (`/^([01]\d|2[0-3]):[0-5]\d$/`).

Optional per slot: `from` / `until` as `YYYY-MM-DD` in the schedule timezone.

## Ingest API (writes)

`POST https://<instance>/api/ingest`

Auth: `x-api-key: <INGEST_API_KEY>` or scoped SSO machine token.

Body (one of):

- `{ "id", "sourceText", "sourcePool?", "reprocess?" }` — creates/reprocesses a **card** (pipeline earns publish)
- `{ "id", "patch": { … } }` — deep-merge patch on an **already PUBLISHED** listing only

Never set `sectionVisibility`, `lifecycleState`, or `id` inside `patch`.

Use [`client.ts`](./client.ts) helpers from this client folder only.
