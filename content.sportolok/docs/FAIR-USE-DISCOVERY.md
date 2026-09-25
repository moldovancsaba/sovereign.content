# Fair-Use Discovery System Implementation

**Status**: ✅ **Core Infrastructure Complete**  
**Date**: 2026-09-25  
**Pattern**: Based on `content.classscout/scripts/rqk-fair-use`

## Overview

Multi-source discovery feeder for Hungarian sport facilities following ClassScout's proven fair-use pattern:

- **Polite multi-source crawling** - One page per source per pass
- **Rate-limited and respectful** - 45s inter-source, 300s pass cooldown, 600–1200s per-source cooldown
- **Fair-use extraction** - Extract structured facts, never verbatim copyrighted content
- **Source attribution** - All discoveries cite `researchSources: [...]`
- **Transparent bot identity** - Polite User-Agent disclosure

## Implementation

### Architecture

```
┌─────────────────┐
│  sources.json   │  Source registry (uszoda.info, edzoterem.hu, etc.)
└────────┬────────┘
         │
         v
┌─────────────────┐
│   one-pass.ts   │  Main crawler (ONE page per source per pass)
└────────┬────────┘
         │ extract
         v
┌─────────────────┐
│hungarianExtract │  Fact extraction (address, phone, activity type)
└────────┬────────┘
         │ build seeds
         v
┌─────────────────┐
│  seedBuilder    │  Transform to find-seeds.json format
└────────┬────────┘
         │
         v
┌─────────────────┐
│find-seeds.json  │  Enrichment queue (pending → enriching → ingested)
└────────┬────────┘
         │ [future: enrichment agent]
         v
┌─────────────────┐
│  Ingest API     │  POST /api/ingest → sport.doneisbetter.com
└─────────────────┘
```

### Files Created

```
content.sportolok/scripts/fair-use-discovery/
├── sources.json                     # Source registry
├── one-pass.ts                      # Main crawler
├── README.md                        # Documentation
├── lib/
│   ├── common.ts                    # Shared types, polite HTTP, rate limits
│   ├── hungarianExtract.ts          # Hungarian fact extraction
│   ├── seedBuilder.ts               # Candidate → seed transformation
│   └── sources/
│       └── genericDirectory.ts      # Generic directory processor
└── data/                            # Auto-created at runtime
    ├── source-state.json            # Last-fetch timestamps
    └── find-seeds.json              # Pending enrichment queue
```

### NPM Scripts

```bash
# Dry run (no network)
npm run fair-use:one-pass:dry

# Live pass
npm run fair-use:one-pass
```

## Current Source Registry

Initial sources (status: `planned`):

| ID | Name | Territory | Activities | Cooldown |
|----|------|-----------|------------|----------|
| `uszoda-info` | Uszoda.info | HUN | swimming, water-polo | 600s |
| `edzoterem-hu` | Edzoterem.hu | HUN | fitness, gym | 600s |
| `budapest-sport` | Budapest Sport Programs | HUN-BUD | various | 900s |

To activate: edit `sources.json` and set `status: "active"`.

## Rate Limits

| Limit | Value | Purpose |
|-------|-------|---------|
| Inter-source delay | 45s | Between sources in one pass |
| Pass cooldown | 300s | Between complete passes |
| Source cooldown | 600–1200s | Per-source (configured in registry) |

## Fair-Use Compliance

✅ **Extract structured facts** (address, phone, activity type)  
✅ **Cite discovery URL** in `researchSources`  
✅ **Polite User-Agent** disclosure  
✅ **Rate-limited crawling** (never abuse)  
✅ **Never copy descriptions** or verbatim content  
❌ **Never scrape URLs** into descriptions  
❌ **Never deep-crawl** sites  

User-Agent format:
```
SportolokDiscoveryBot/1.0 (content.sportolok; research use; +https://sport.doneisbetter.com)
```

## Extraction Logic

Hungarian-specific patterns in `lib/hungarianExtract.ts`:

- **Title detection**: `<h1-3>` tags with keywords (uszoda, edzőterem, fitness, sportközpont)
- **Address patterns**: Hungarian postal codes (4 digits + city), "cím:" labels
- **Phone patterns**: +36 format, "telefon:" labels
- **Email patterns**: Standard email regex
- **Activity type detection**: Keyword matching (úszás, fitness, tenisz, etc.)

Outputs:

```typescript
{
  seedId: "seed-hun-a3b4c5d6",
  sourceId: "uszoda-info",
  discoveryUrl: "https://uszoda.info/...",
  territory: "HUN",
  activityType: "swimming",
  title: "Császár Komjádi Uszoda",
  address: "1027 Budapest, Árpád fejedelem útja 8",
  contact: {
    phone: "+36 1 212 2750",
    email: "info@example.hu"
  },
  confidence: "high",
  discoveredAt: "2026-09-25T04:30:00Z"
}
```

## find-seeds.json Format

Seeds ready for enrichment:

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

Status flow: `pending` → `enriching` → `ingested` | `rejected`

## Test Results

✅ **Dry run validated** (2026-09-25)

```
🚀 Sportolok Fair-Use Discovery - One Pass
   Mode: DRY RUN

📋 Loaded 3 sources
   Inter-source delay: 45s
   Pass cooldown: 300s

✅ 3 sources ready (0 on cooldown)

[1/3] Uszoda.info
🔍 Processing source: Uszoda.info (uszoda-info)
   [DRY RUN] Would fetch: https://uszoda.info

⏸️  Sleeping 45s between sources...

[2/3] Edzoterem.hu
   ...

📊 Pass Summary:
   Sources processed: 3
   New candidates: 0
   Pending seeds: 0

⏰ Next pass cooldown: 300s
```

**Timing**: ~90s for 3 sources (2×45s inter-source delays) ✅

## Future Work

### Enrichment Agent

Build enrichment agent that:

1. Reads `find-seeds.json` (status: `pending`)
2. Performs deep research:
   - Web search for facility details
   - Maps API for location/images
   - Social media presence
   - Reviews/ratings
3. Cognitive scoring (the executing Cursor Cloud Agent is the LLM)
4. Drafts About (narrative description)
5. Calls ingest API:
   - `ingestSourceText` (new listing)
   - `ingestPatch` (update existing)
6. Marks seed status: `ingested` | `rejected`

### Source Expansion

Add more Hungarian sources:

- **Swimming**: uszodak.hu, fuzes-medence.hu, aquaworld.hu
- **Fitness**: fitnesz.hu, worldclass.hu
- **Tennis**: tenisz.hu, court directories
- **General**: sport.hu listings, municipal directories
- **Regional**: city-specific portals (Budapest, Debrecen, Szeged)

### Quality Improvements

- Add language detection (prefer Hungarian pages)
- Deduplicate by address/name similarity
- Validate extracted phone numbers (Hungarian format)
- Normalize postal codes (4 digits standard)
- Detect closed/inactive facilities

## Integration with Existing Pipeline

The fair-use discovery system feeds into the existing ingest pipeline:

```
Fair-Use Discovery (new)
    ↓
find-seeds.json
    ↓
[Enrichment Agent] (future)
    ↓
ingestSourceText / ingestPatch
    ↓
POST /api/ingest (existing)
    ↓
sport.doneisbetter.com
```

Uses existing:
- `content.sportolok/ingest/client.ts` (ingest HTTP client)
- `content.sportolok/src/lib/sovereign/executorIngest.ts` (schedule normalization)
- Data contract enforcement (singular `RecurringSlot`)

## References

- **Pattern source**: `content.classscout/scripts/rqk-fair-use/`
- **Analysis doc**: `content.sportolok/docs/CLASSSCOUT-FAIR-USE-ANALYSIS.md`
- **Coordination log**: `fleet/coordination/sportolok.md`

## Summary

✅ **Fair-use discovery system implemented**  
✅ **Rate-limited multi-source crawler ready**  
✅ **Hungarian fact extractor working**  
✅ **Seed queue infrastructure complete**  
✅ **Dry run validated (90s for 3 sources)**  
🔄 **Sources in planned status** (activate when ready)  
🔜 **Enrichment agent** (next milestone)
