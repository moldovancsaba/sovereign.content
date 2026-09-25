# Fair-Use Discovery System

**Hungarian sport facility multi-source discovery feeder**

Based on `content.classscout/scripts/rqk-fair-use` proven pattern.

## Architecture

### Operating Principles

1. **One page per source per pass** - Never crawl deeply
2. **Polite rate limits**:
   - 45s inter-source delay
   - 300s pass cooldown
   - 600–1200s per-source cooldown
3. **User-Agent disclosure** - Transparent bot identification
4. **Fair-use extraction** - Extract structured facts, never verbatim copy
5. **Source attribution** - All discoveries cite `researchSources: [...]`

### Data Flow

```
sources.json (registry)
    ↓
one-pass.ts (crawler)
    ↓ extract facts
lib/hungarianExtract.ts
    ↓ build seeds
lib/seedBuilder.ts
    ↓
data/find-seeds.json (queue)
    ↓ [future: enrichment agent]
ingest API → sport.doneisbetter.com
```

## Files

- **`sources.json`** - Source registry with cooldowns and territories
- **`one-pass.ts`** - Main crawler (one page per source per pass)
- **`lib/common.ts`** - Shared types, polite HTTP, rate-limit helpers
- **`lib/hungarianExtract.ts`** - Hungarian-specific fact extraction
- **`lib/seedBuilder.ts`** - Transform candidates → find-seeds.json
- **`lib/sources/genericDirectory.ts`** - Generic directory processor
- **`data/source-state.json`** - Last-fetch timestamps (auto-created)
- **`data/find-seeds.json`** - Pending enrichment queue (auto-created)

## Usage

### Dry Run (No Network)

```bash
npm run fair-use:one-pass:dry
```

### Live Pass

```bash
npm run fair-use:one-pass
```

Processes all ready sources (cooldown elapsed), respects rate limits.

### Adding Sources

Edit `sources.json`:

```json
{
  "id": "new-directory",
  "name": "New Hungarian Sport Directory",
  "url": "https://example.hu/sport",
  "cooldownSec": 600,
  "territory": "HUN",
  "activityTypes": ["fitness", "swimming"],
  "status": "planned"
}
```

Set `status: "active"` when ready to crawl.

## Enrichment Pipeline

**Current state**: Discovery → `find-seeds.json`

**Future**: Add enrichment agent that:
1. Reads `find-seeds.json` (status: "pending")
2. Performs deep research (web search, maps, etc.)
3. Scores and drafts About
4. Calls `ingestSourceText` or `ingestPatch`
5. Marks seed status: "ingested" | "rejected"

## Rate Limits

| Limit | Default | Purpose |
|-------|---------|---------|
| Inter-source | 45s | Between sources in one pass |
| Pass cooldown | 300s | Between complete passes |
| Source cooldown | 600–1200s | Per-source (configured in registry) |

## Fair-Use Compliance

✅ Extract structured facts (address, phone, activity type)  
✅ Cite discovery URL in `researchSources`  
✅ Polite User-Agent disclosure  
✅ Rate-limited crawling  
✅ Never copy descriptions or verbatim content  
❌ Never scrape URLs into descriptions  
❌ Never deep-crawl sites

## Source Attribution

Every ingested listing carries:

```json
{
  "researchSources": [
    {
      "sourceId": "uszoda-info",
      "url": "https://uszoda.info/listing/123",
      "discoveredAt": "2026-09-25T04:30:00Z"
    }
  ]
}
```

## Example Output

After one pass:

```
🚀 Sportolok Fair-Use Discovery - One Pass
   Mode: LIVE

📋 Loaded 3 sources
   Inter-source delay: 45s
   Pass cooldown: 300s

✅ 3 sources ready (0 on cooldown)

[1/3] Uszoda.info
🔍 Processing source: Uszoda.info (uszoda-info)
   ✓ Fetched 45231 bytes
   ✓ Extracted 2 candidate(s)

⏸️  Sleeping 45s between sources...

[2/3] Edzoterem.hu
...

💾 Saved state and 5 candidate(s) to find-seeds

📊 Pass Summary:
   Sources processed: 3
   New candidates: 5
   Pending seeds: 5

⏰ Next pass cooldown: 300s
```

## Status

- ✅ **Core infrastructure complete**
- ✅ **Hungarian extractor ready**
- ✅ **Source registry initialized**
- 🔄 **First live sources pending** (planned status)
- 🔜 **Enrichment agent** (future work)
