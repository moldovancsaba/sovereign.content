# Content data contract (ClassScout agent mirror)

**Product:** `moldovancsaba/classscout` (Your Field / ClassScout)  
**Not management.** Do not use management’s `RecurringSlot` / singular `weekday` / `weekdays[]`
shapes here — that contract caused the sportolok outage on a **different** app.

Canonical types: `classscout` → `src/types/provider.ts` (`RecurringProgram`, `RecurringProgramDay`).  
Validation: product ingest `validateProviderDocument` / curator schemas.

---

## Schedule — `recurringPrograms[]` (ClassScout)

**Correct** — full English day names on the program; optional structured `schedule`:

```json
{
  "recurringPrograms": [
    {
      "id": "prog-morning-soccer",
      "title": "Morning soccer",
      "daysOfWeek": ["Monday", "Wednesday"],
      "timeText": "Mon/Wed 10:00–11:00",
      "schedule": {
        "byDay": ["Monday", "Wednesday"],
        "startTime": "10:00",
        "endTime": "11:00",
        "timezone": "America/New_York",
        "precision": "exact"
      }
    }
  ]
}
```

**Forbidden (management sportolok outage shape — never send to ClassScout):**

```json
{
  "schedule": {
    "recurring": [
      {
        "weekdays": ["monday", "tuesday"],
        "startTime": "18:00",
        "endTime": "19:00"
      }
    ]
  }
}
```

Also forbidden as the **only** stored schedule: free-text arrays like
`["Monday 10:00-11:00", "Wednesday 15:00-16:00"]` with no `recurringPrograms`. Convert with
`scheduleToRecurringPrograms.ts` before upsert/patch.

### Day vocabulary

Only: `Monday` | `Tuesday` | `Wednesday` | `Thursday` | `Friday` | `Saturday` | `Sunday`  
Times when present: local wall-clock `HH:MM` in the program timezone.  
`schedule.precision`: `exact` | `day_only` | `vague` | `unknown` — only `exact` may drive time filters.

---

## Ingest API (writes)

Base: `https://getyourfield.com` (or preview / classscout.ai as configured).

### Auth

`Authorization: Bearer <INGEST_API_KEY>`

### Discovery

`GET /api/ingest` → resources and limits.

### Batch writes

`POST /api/ingest`

```json
{
  "operations": [
    { "resource": "provider", "action": "upsert", "document": { "...": "..." } },
    { "resource": "provider", "action": "patch", "id": "prov-…", "patch": { "...": "..." } }
  ]
}
```

Also accepts a single operation object. Max 100 ops per request. All listing mutations go through
product validation — bad schedule shapes fail closed.

### Upload

`POST /api/ingest/upload` — multipart field `file` → hosted HTTPS URL (R2 preferred when configured).

Use [`client.ts`](./client.ts) from this folder only. Never import `../sportolok/ingest` or
`../content.padelafrica/ingest`.
