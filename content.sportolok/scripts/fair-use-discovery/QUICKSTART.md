# Quick Start Guide

**Hungarian sport facility discovery system**

## Prerequisites

- Node.js 20+
- `INGEST_API_KEY` configured in environment
- Repository: `sovereign.content/content.sportolok/`

## Step 1: Activate Sources

Edit `sources.json` and change source status from `"planned"` to `"active"`:

```json
{
  "id": "uszoda-info",
  "name": "Uszoda.info",
  "url": "https://uszoda.info",
  "status": "active"  // ← Change from "planned"
}
```

Start with 1-2 sources to test before activating all.

## Step 2: Run Discovery (One Pass)

```bash
cd content.sportolok
npm run fair-use:one-pass
```

**What happens:**
- Fetches ONE page from each active source
- Extracts structured facts (name, address, phone, activity type)
- Builds candidate seeds
- Saves to `data/find-seeds.json`
- Updates `data/source-state.json` (cooldown tracking)

**Output:**
```
🚀 Sportolok Fair-Use Discovery - One Pass
   Mode: LIVE

📋 Loaded 3 sources
   Inter-source delay: 45s
   Pass cooldown: 300s

✅ 2 sources ready (1 on cooldown)

[1/2] Uszoda.info
🔍 Processing source: Uszoda.info (uszoda-info)
   ✓ Fetched 45231 bytes
   ✓ Extracted 2 candidate(s)

⏸️  Sleeping 45s between sources...

[2/2] Edzoterem.hu
   ...

💾 Saved state and 5 candidate(s) to find-seeds

📊 Pass Summary:
   Sources processed: 2
   New candidates: 5
   Pending seeds: 5

⏰ Next pass cooldown: 300s
```

**Timing:** ~45s per source + 45s delays = ~90s for 2 sources

## Step 3: Inspect Seeds

```bash
cat scripts/fair-use-discovery/data/find-seeds.json | jq .
```

**Example seed:**
```json
{
  "seed-hun-a3b4c5d6": {
    "seedId": "seed-hun-a3b4c5d6",
    "discoveryDate": "2026-09-25",
    "researchSources": [
      {
        "sourceId": "uszoda-info",
        "url": "https://uszoda.info/listing/123",
        "discoveredAt": "2026-09-25T04:30:00Z"
      }
    ],
    "territory": "HUN",
    "activityType": "swimming",
    "initialFacts": {
      "name": "Császár Komjádi Uszoda",
      "address": "1027 Budapest, Árpád fejedelem útja 8",
      "contact": {
        "phone": "+36 1 212 2750"
      }
    },
    "confidence": "high",
    "status": "pending"
  }
}
```

## Step 4: Test Enrichment (Dry Run)

```bash
npm run fair-use:enrich:dry -- --limit=3
```

**What happens:**
- Reads `find-seeds.json` (status: "pending")
- Performs quality checks (name, address, confidence)
- Generates About descriptions (I am the LLM)
- Shows what would be ingested (DRY RUN - no API calls)
- Shows which seeds would be rejected

**Output:**
```
🌱 Sportolok Fair-Use Enrichment Agent
   Mode: DRY RUN
   Limit: 3 seeds per run

📊 Seeds status:
   Total seeds: 5
   Pending: 5

🎯 Processing 3 seeds...

🔬 Enriching: seed-hun-a3b4c5d6
   Name: Császár Komjádi Uszoda
   Territory: HUN
   Activity: swimming
   Confidence: high
   Sources: 1
   📝 About: Császár Komjádi Uszoda is a swimming pool facility...
   [DRY RUN] Would ingest: {...}

📊 Enrichment Summary:
   Ingested: 2
   Rejected: 1
   Errors: 0
   Remaining pending: 2
```

## Step 5: Live Enrichment

**⚠️ This calls the ingest API and creates real listings**

```bash
# Set API key
export INGEST_API_KEY="..."

# Run enrichment (limit to small batches first)
npm run fair-use:enrich -- --limit=5
```

**What happens:**
- Reads `find-seeds.json` (status: "pending")
- Quality checks (rejects low-quality seeds)
- Generates About (I am the LLM)
- Calls `POST /api/ingest` via `ingestSourceText`
- Marks seeds: "ingested" | "rejected"
- Saves updated `find-seeds.json`

**Output:**
```
🌱 Sportolok Fair-Use Enrichment Agent
   Mode: LIVE
   Limit: 5 seeds per run

📊 Seeds status:
   Total seeds: 5
   Pending: 5

🎯 Processing 5 seeds...

🔬 Enriching: seed-hun-a3b4c5d6
   ...
   ✅ Ingested successfully

💾 Saved updated find-seeds.json

📊 Enrichment Summary:
   Ingested: 4
   Rejected: 1
   Errors: 0
   Remaining pending: 0
```

## Step 6: Schedule Regular Runs

**Option A: Manual scheduling**

Run discovery + enrichment periodically:

```bash
# Every 5 minutes (respects cooldowns)
npm run fair-use:one-pass && npm run fair-use:enrich -- --limit=10
```

**Option B: Cron/Scheduler**

```cron
# Every 10 minutes
*/10 * * * * cd /path/to/sovereign.content/content.sportolok && npm run fair-use:one-pass && npm run fair-use:enrich -- --limit=10
```

**Option C: Timer in orchestrator**

Add to `content.sportolok/timers/orchestrator.md`:

```markdown
## Fair-Use Discovery

**Schedule:** Every 10 minutes
**Jobs:**
1. Run `npm run fair-use:one-pass`
2. Run `npm run fair-use:enrich -- --limit=10`
```

## Monitoring

**Check source state:**
```bash
cat scripts/fair-use-discovery/data/source-state.json | jq .
```

**Check seed queue:**
```bash
cat scripts/fair-use-discovery/data/find-seeds.json | jq 'to_entries | map({id: .key, status: .value.status, confidence: .value.confidence})'
```

**Count by status:**
```bash
cat scripts/fair-use-discovery/data/find-seeds.json | jq '[.[] | .status] | group_by(.) | map({status: .[0], count: length})'
```

## Troubleshooting

**No candidates extracted:**
- Check HTML structure of source URL
- Verify extraction patterns in `lib/hungarianExtract.ts`
- Add source-specific extractor in `lib/sources/`

**Seeds rejected during enrichment:**
- Check quality rules in `enrich-seeds.ts`
- Low confidence seeds are rejected by default
- Missing address or short name = rejected

**Ingest API errors:**
- Verify `INGEST_API_KEY` is set
- Check API endpoint availability
- Review ingest API logs

**Cooldown preventing sources:**
- Sources respect cooldown timers
- Check `source-state.json` for last fetch times
- Wait for cooldown to elapse or adjust `cooldownSec` in `sources.json`

## Rate Limits

| Limit | Default | Adjustable |
|-------|---------|------------|
| Inter-source delay | 45s | `sources.json` → `defaultInterSourceSec` |
| Pass cooldown | 300s | `sources.json` → `defaultPassSleepSec` |
| Source cooldown | 600-1200s | Per-source in `sources.json` → `cooldownSec` |

**To adjust:**
Edit `sources.json`:
```json
{
  "defaultInterSourceSec": 60,
  "defaultPassSleepSec": 600,
  "sources": [
    {
      "id": "uszoda-info",
      "cooldownSec": 900
    }
  ]
}
```

## Adding New Sources

1. Add to `sources.json`:
```json
{
  "id": "new-source",
  "name": "New Hungarian Directory",
  "url": "https://example.hu",
  "cooldownSec": 600,
  "territory": "HUN",
  "activityTypes": ["swimming", "fitness"],
  "status": "planned"
}
```

2. Test extraction:
```bash
npm run fair-use:one-pass:dry
```

3. If extraction fails, create custom extractor:
- Add `lib/sources/newSourceExtractor.ts`
- Update `one-pass.ts` to use it for that source ID

4. Activate:
```json
"status": "active"
```

## Success Metrics

**Good discovery pass:**
- 2-5 candidates per source
- High confidence: 30-50%
- Medium confidence: 40-60%
- Low confidence: 10-20%

**Good enrichment pass:**
- Ingested: 60-80%
- Rejected: 20-40%
- Errors: <5%

**Healthy pipeline:**
- Regular new discoveries (5-20 per day)
- Low error rate (<5%)
- Source cooldowns respected
- Seeds processed within 24 hours

## Next Steps

1. Start with 1-2 sources active
2. Monitor for 1 hour
3. Review ingested listings on sport.doneisbetter.com
4. Add more sources gradually
5. Tune extraction patterns as needed
6. Schedule automated runs
