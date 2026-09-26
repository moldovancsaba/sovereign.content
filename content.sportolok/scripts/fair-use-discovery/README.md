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
directories/local-governments.json   ← what gov sites to search (BP 23 + MJV 25)
directories/school-authorities.json  ← KIR / SZIR / KK tankerületek (60)
    ↓ expand-directories.ts
sources.json (crawl registry)
    ↓
one-pass.ts (crawler)
    ↓ extract facts
lib/hungarianExtract.ts
    ↓ build seeds
lib/seedBuilder.ts
    ↓
data/find-seeds.json (queue)
    ↓ enrich-seeds.ts
ingest API → sport.doneisbetter.com
```

## Directories (SSOT for “what to search”)

| File | Contents | Job use |
| --- | --- | --- |
| `directories/local-governments.json` | 23 Budapest kerületek + 25 megyei jogú város — official website, path hints, `verifiedPages` | Expand → sport/school sources |
| `directories/school-authorities.json` | KIR + SZIR registry bookmarks + 60 KK tankerületi központ URLs | Expand → planned school sources; agents use KIR XLSX when reachable |

Authoritative school registries (not invented lists):
- **KIR** — `https://kir.oktatas.hu/kirint.search` + public XLSX at `https://dari.oktatas.hu/kirpub/index`
- **SZIR** — vocational schools: `https://szir.nive.hu/publikus/intezmeny-kereso`
- **KK tankerületek** — `https://kk.gov.hu/tankeruletek`

## Files

- **`directories/*.json`** - Local-government + school-authority directories
- **`expand-directories.ts`** - Directory → `sources.json` merger (`--probe` optional)
- **`sources.json`** - Source registry with cooldowns and territories
- **`one-pass.ts`** - Main crawler (one page per source per pass)
- **`lib/common.ts`** - Shared types, polite HTTP, rate-limit helpers
- **`lib/hungarianExtract.ts`** - Hungarian-specific fact extraction
- **`lib/seedBuilder.ts`** - Transform candidates → find-seeds.json
- **`lib/sources/genericDirectory.ts`** - Generic directory processor
- **`data/source-state.json`** - Last-fetch timestamps (auto-created)
- **`data/find-seeds.json`** - Pending enrichment queue (auto-created)
- **`data/directory-expansion.json`** - Last expand report

## Usage

### Expand directories into sources

```bash
# Merge verifiedPages + tankerületek into sources.json (no network)
npm run fair-use:expand-directories:dry
npm run fair-use:expand-directories

# Optionally probe path hints on official websites (polite, limited)
npm run fair-use:expand-directories -- --probe --limit=20
```

### Dry Run (No Network)

```bash
npm run fair-use:one-pass:dry
```

### Live Pass

```bash
npm run fair-use:one-pass
```

Processes all ready sources (cooldown elapsed), respects rate limits.

### Enrichment (Process Seeds)

```bash
# Dry run (test with find-seeds.json)
npm run fair-use:enrich:dry

# Dry run with limit
npm run fair-use:enrich:dry -- --limit=5

# Live enrichment (calls ingest API)
npm run fair-use:enrich

# Live with limit
npm run fair-use:enrich -- --limit=10
```

Enrichment agent (I am the LLM):
- Reads `find-seeds.json` (status: "pending")
- Performs quality checks (name, address, confidence)
- Generates About descriptions (cognitive task)
- Calls `ingestSourceText` with research sources
- Marks seeds: "ingested" | "rejected"

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

**Current state**: Discovery → `find-seeds.json` → Enrichment → Ingest API

**✅ Enrichment agent implemented** (`enrich-seeds.ts`):
1. Reads `find-seeds.json` (status: "pending")
2. Performs quality checks (name, address, confidence)
3. Generates About descriptions (I am the LLM)
4. Calls `ingestSourceText` with research sources
5. Marks seed status: "ingested" | "rejected"

**Quality checks:**
- Name >= 5 characters
- Address must be present
- Confidence must be medium or high
- Rejects low-confidence seeds

**About generation:**
- Facility description with location
- Territory context (Budapest, Hungary)
- Contact information when available
- Confidence attribution

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
- ✅ **Enrichment agent implemented**
- ✅ **End-to-end pipeline validated** (dry run)
- 🔄 **First live sources pending** (planned status)
- 🔜 **Production activation** (activate sources when ready)
