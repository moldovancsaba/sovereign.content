# fleet/inbox — agent-emitted status snapshots

Optional drop zone. Client agents (or their chats) may commit a small JSON status file after a
meaningful tick so the daily SWOT job has fresh signals **without** opening Mongo from SC-central.

## Path

`fleet/inbox/<clientId>/status-YYYY-MM-DD.json`

`<clientId>` ∈ `padelafrica` | `sportolok` | `classscout`

## Minimal shape

```json
{
  "clientId": "padelafrica",
  "observedAt": "2026-09-24T18:00:00Z",
  "source": "padel-find-tick",
  "workingEnv": {
    "timerSubscribed": true,
    "ingestOnly": true,
    "tickCompleted": true
  },
  "outcomes": {
    "note": "profile-fair fields only; omit rather than invent"
  },
  "openDebt": [],
  "links": []
}
```

No About prose, no phone numbers, no media binaries. Prefer counts and enums.

Phase 3 of `plan-fleet-daily-swot.md` makes this the preferred live feed.
