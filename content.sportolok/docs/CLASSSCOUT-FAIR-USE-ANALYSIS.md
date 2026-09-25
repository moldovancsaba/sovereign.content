# ClassScout Fair-Use Sourcing Analysis for Sportolok

**Date:** 2026-09-25  
**Source:** `content.classscout/scripts/rqk-fair-use/` analysis  
**Purpose:** Evaluate how ClassScout's multi-source discovery can help Sportolok find new sport listings

---

## Executive Summary

ClassScout uses a **polite, fair-use multi-source research feeder** that walks 29+ classified/directory sites to discover new family program listings. This system could be adapted for Sportolok to discover sport venues, gyms, classes, and facilities from Hungarian sport directories and classified sites.

**Key takeaway:** Automated, ethical discovery pipeline that respects rate limits and attribution.

---

## How ClassScout Fair-Use Works

### Core Principles (Binding Operating Rules)

1. **One page per source per pass** — Never more than one HTTP request to a source in the same pass
2. **45-second delay between sources** — Polite crawling (configurable via `FAIR_USE_INTER_SOURCE_SEC`)
3. **5-minute delay between full passes** — Default 300 sec cooldown (configurable via `FAIR_USE_PASS_SLEEP_SEC`)
4. **Per-source cooldown** — Each source has its own cooldown (300-1200 sec) to prevent over-fetching
5. **User-Agent disclosure** — `ClassScoutCatalogResearch/1.0 (+https://getyourfield.com; fair-use one-lead research)`
6. **Attribution required** — Every seed records `researchSources: ["https://..."]` citing the discovery page
7. **Official site preferred** — Set `website` to the official provider URL, not the directory
8. **No URL in descriptions** — Extract facts only, never paste directory URLs into descriptions
9. **Confirm before trust** — Verify contacts on official site during Find before marking verified
10. **Stop on robots change** — Respect robots.txt changes, don't bypass challenges

### Architecture

```
┌─────────────────────────────────────┐
│  Fair-Use Multi-Source Feeder       │
│  (one-pass.cjs)                     │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Walk ALL 29 sources                │
│  - One page each                    │
│  - 45 sec between sources           │
│  - Respect per-source cooldown      │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Extract Facts (genericExtract.cjs) │
│  - Name, address, phone, website    │
│  - Activity type                    │
│  - Age range, price hints           │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Build Seed (seedBuilder.cjs)       │
│  - Official website as target       │
│  - Citation to discovery page       │
│  - Initial facts only               │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Write to find-seeds.json           │
│  Queue for deep enrichment          │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Find Cycle (find-cycle.cjs)        │
│  - Fetch official site              │
│  - Deep multi-page enrich           │
│  - Upload images via ImgBB          │
│  - POST /api/ingest                 │
└─────────────────────────────────────┘
```

### ClassScout's 29 Sources

**New York Family/Activity Directories:**
- RaisingQueensKids.com
- MommyPoppins.com
- SproutNYC.com
- KidClick.com
- ActivityHero.com
- TimeOut NY Kids
- Tinyout.com
- Beakid.com
- AmazinKids.com
- NewYorkLovesKids.com
- NewYorkFamily.com
- MacaroniKid Brooklyn NW
- UptownFamilyCalendar.com
- BeyondCamps.com
- ClassCub.com
- KidsOutAndAbout Queens
- BrooklynArbor.org
- BrooklynBridgeParents.com
- ParkSlopeParents.com

**Official Program Providers:**
- DiscoverDYCD (NYC youth programs)
- YMCA NYC
- NYC Parks & Recreation
- GrowingUpNYC (city programs)
- Goldfish Swim School
- The Little Gym
- Soccer Stars NYC
- JCC Manhattan
- Asphalt Green

---

## How This Could Help Sportolok

### Hungarian Sport Directory Sources

Potential sources for Hungarian sport venue discovery:

**National Sport Directories:**
- Magyar Olimpiai Bizottság (MOB) - olympic.hu
- Nemzeti Sport Szövetségek (federations)
- SportOrvos.hu (sport medicine directory)
- Sportletesitmeny.hu
- Edzoterem.hu
- Uszoda.info

**Regional/City Directories:**
- Budapest Sport (city programs)
- Kerületi sport programok (district programs)
- Veszprém Sport
- Győr Sport
- Debrecen Sport
- Szeged Sport

**Activity-Specific:**
- Magyar Úszó Szövetség (swimming)
- Magyar Labdarúgó Szövetség (football)
- Magyar Kézilabda Szövetség (handball)
- Magyar Kosárlabda Szövetség (basketball)
- Fitness Hungary
- Jóga Magyarország

**Classified/Review Sites:**
- Jófogás sport section
- Vatera sport listings
- Facebook sport groups/pages
- Google Maps sport venues
- TripAdvisor sport activities

---

## Adaptation for Sportolok

### 1. Source Registry (`sources.json`)

```json
{
  "updatedAt": "2026-09-25",
  "defaultInterSourceSec": 45,
  "defaultPassSleepSec": 300,
  "sources": [
    {
      "id": "uszoda-info",
      "url": "https://uszoda.info",
      "cooldownSec": 600,
      "territory": "HUN"
    },
    {
      "id": "edzoterem-hu",
      "url": "https://edzoterem.hu",
      "cooldownSec": 600,
      "territory": "HUN"
    },
    {
      "id": "budapest-sport",
      "url": "https://budapest.hu/sport",
      "cooldownSec": 900,
      "territory": "HUN-BUD"
    }
    // ... more sources
  ]
}
```

### 2. Per-Source Adapters

Each source gets an adapter in `lib/sources/`:

```javascript
// lib/sources/uszoda-info.cjs
module.exports = {
  sourceId: 'uszoda-info',
  
  async harvest(state) {
    // Fetch one discovery page
    const page = await politeF fetch(...);
    return { leads: [...], nextCursor: ... };
  },
  
  async extract(html, url) {
    // Extract: name, address, phone, website, activity
    return {
      name: "...",
      address: "...",
      website: "https://official-site.hu",
      phone: "...",
      activityTypes: ["swimming"],
      researchSources: [url]
    };
  }
};
```

### 3. Fair-Use Operating Rules for Sportolok

**Adapted from ClassScout:**

1. ✅ One page per source per pass
2. ✅ 45-second inter-source delay
3. ✅ 5-minute pass cooldown
4. ✅ Per-source cooldown (300-1200 sec)
5. ✅ User-Agent: `SportolokCatalogResearch/1.0 (+https://sport.doneisbetter.com; fair-use discovery)`
6. ✅ Attribution: `researchSources: ["https://..."]`
7. ✅ Official site preferred (not directory URL)
8. ✅ No URLs in descriptions
9. ✅ Verify on official site before trust
10. ✅ Respect robots.txt

**Additional for Hungarian context:**
11. ✅ Support Hungarian language extraction
12. ✅ Handle Hungarian address formats
13. ✅ Parse Hungarian phone numbers (+36 format)
14. ✅ Map Hungarian activity names to sportolok taxonomy

### 4. Integration with Sportolok Ingest

```javascript
// Fair-use discovers seed
const seed = {
  id: "seed-uszoda-veszprem-001",
  name: "Veszprém Sportuszoda",
  website: "https://veszpremuszoda.hu",
  address: "Külső-Kádártai út 1/1, Veszprém",
  phone: "+36 88 123 456",
  activityTypes: ["swimming", "water-polo"],
  researchSources: ["https://uszoda.info/veszprem"]
};

// Write to find-seeds.json
appendSeed(seed);

// Find cycle picks it up
// → Fetch official site
// → Deep enrich (hours, prices, facilities)
// → Upload images
// → POST /api/ingest with validated data
```

---

## Key Benefits for Sportolok

### 1. Automated Discovery

- **Current:** Manual entry or sporadic research
- **With fair-use:** Continuous, automated discovery from 10-20 Hungarian sources
- **Rate:** ~4-8 new leads per hour (ClassScout rate with 29 sources)

### 2. Ethical & Legal

- **Respects robots.txt**
- **Rate-limited** (won't DDoS sources)
- **Attribution** (cites discovery page)
- **Facts only** (no content copying)
- **Official site** as canonical source

### 3. Quality Gates

- **Lead quality filter** (reject junk, one-off events, guides)
- **Address verification** (skip if no usable street address)
- **Official site confirmation** (deep enrich before publish)
- **Duplicate detection** (check existing Mongo)

### 4. Operator Feedback Loop

- **Events log** (JSONL) — every attempt, skip, success
- **Hourly quality scorecard** — success rate, top skip reasons
- **Weekly digest** — summary of discoveries and issues
- **Tier A auto-pause** — stop bad sources automatically

---

## Implementation Plan

### Phase 1: Research Hungarian Sources (Week 1)

1. ✅ Identify 10-15 Hungarian sport directory sites
2. ✅ Check robots.txt for each
3. ✅ Document structure (list pages, detail pages)
4. ✅ Map activity taxonomies to sportolok

### Phase 2: Build Fair-Use Infrastructure (Week 2)

1. ✅ Port `one-pass.cjs` framework
2. ✅ Create `sources.json` registry
3. ✅ Build generic Hungarian extractor
4. ✅ Create per-source adapters (3-5 sources)

### Phase 3: Test & Validate (Week 3)

1. ✅ Dry run against test sources
2. ✅ Validate seed quality
3. ✅ Test ingest integration
4. ✅ Operator review first 20 seeds

### Phase 4: Production Rollout (Week 4)

1. ✅ Enable 3 sources in production
2. ✅ Monitor hourly scorecards
3. ✅ Add more sources gradually
4. ✅ Weekly digest review

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Directory sites block us | Respect robots.txt, use polite delays, proper User-Agent |
| Bad data quality | Lead quality filters, official site verification |
| Duplicate listings | Check Mongo before insert, track done IDs |
| Hungarian language parsing | Use Hungarian NLP, manual validation first 100 |
| Address format issues | Hungarian address parser, manual review |
| Phone number formats | E.164 normalization (+36), validation |

---

## Comparison: ClassScout vs Sportolok

| Aspect | ClassScout | Sportolok (Proposed) |
|--------|------------|----------------------|
| Sources | 29 (NYC family/activity) | 10-15 (Hungarian sport) |
| Territory | NYC boroughs | Hungary (Budapest, regions) |
| Language | English | Hungarian |
| Activity focus | Kids classes/camps | Sport venues/classes/facilities |
| Rate | ~4-8 leads/hour | ~2-4 leads/hour (fewer sources) |
| Integration | POST /api/ingest | POST /api/ingest (same pattern) |
| Quality gates | Lead filters, address verify | Same + Hungarian validation |

---

## Recommendation

**✅ ADOPT** ClassScout's fair-use multi-source feeder pattern for Sportolok.

**Why:**
1. ✅ **Proven** — Running in production for ClassScout
2. ✅ **Ethical** — Respects rate limits, robots.txt, attribution
3. ✅ **Scalable** — Add sources incrementally
4. ✅ **Integrated** — Uses same POST /api/ingest path
5. ✅ **Observable** — Events log, scorecards, digests

**Start with:**
- 3 Hungarian sources (uszoda.info, edzoterem.hu, budapest.hu/sport)
- 5-minute pass sleep
- Manual review first 50 seeds
- Gradual rollout

**This could discover 500-1000 new Hungarian sport listings per month** with minimal operator effort.

---

## Files to Review

**In ClassScout:**
- `scripts/rqk-fair-use/README.md` — Operating rules
- `scripts/rqk-fair-use/one-pass.cjs` — Main walker
- `scripts/rqk-fair-use/sources.json` — Source registry
- `scripts/rqk-fair-use/lib/sources/` — Per-source adapters
- `scripts/rqk-fair-use/lib/genericExtract.cjs` — Shared extractors
- `scripts/rqk-fair-use/lib/seedBuilder.cjs` — Seed builder
- `scripts/rqk-fair-use/lib/leadQuality.cjs` — Quality filters

**For Sportolok (create):**
- `scripts/fair-use-discovery/README.md`
- `scripts/fair-use-discovery/sources.json`
- `scripts/fair-use-discovery/one-pass.cjs`
- `scripts/fair-use-discovery/lib/sources/`
- `scripts/fair-use-discovery/lib/hungarianExtract.cjs`
- Integration with existing `executorIngest.ts`

---

**Status:** Analysis complete, ready for planning.
