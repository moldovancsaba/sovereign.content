# Sovereign Agentic Content Delivery and Management System

## Overview

The **Sovereign Content System** is an AI-powered autonomous content management platform for the management engine. It provides intelligent, adaptive content evaluation, publication decisioning, and delivery optimization with full auditability and continuous learning.

**First Deployment:** sportolok (Hungarian sport directory) — September 2026

## What Makes It "Sovereign"

1. **Self-Governing**: Makes autonomous decisions within configured boundaries without human intervention
2. **Transparent**: Every decision logged with full reasoning and evidence trail
3. **Adaptive**: Learns from operator overrides to improve decision accuracy over time
4. **Safety-First**: Starts in assisted mode, earns autonomy only after proving 95%+ agreement with staff

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Vertical Pack                             │
│              (sovereignAgent config)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼─────────┐      ┌───────▼──────────┐
│  Sovereign      │      │  Delivery        │
│  Agent          │      │  Optimizer       │
│  (agent.ts)     │      │  (delivery.ts)   │
└────────┬────────┘      └──────────┬───────┘
         │                          │
         │    ┌─────────────────────┘
         │    │
    ┌────▼────▼─────────────────────────────────┐
    │         MongoDB Collections               │
    ├───────────────────────────────────────────┤
    │  • sovereign_decisions                    │
    │  • sovereign_delivery_metrics             │
    │  • listings (delivery metadata)           │
    └───────────────────────────────────────────┘
         │
         │
    ┌────▼──────────────────────────────────────┐
    │  API Endpoints                            │
    ├───────────────────────────────────────────┤
    │  • GET  /api/sovereign/status             │
    │  • POST /api/sovereign/evaluate           │
    │  • GET  /api/cron/sovereign-delivery-...  │
    └───────────────────────────────────────────┘
```

### Decision Types

The sovereign agent can make ten types of autonomous decisions:

1. **publish-approval** — Should this content be published to users?
2. **quality-gate** — Does this meet minimum quality standards?
3. **content-enrichment** — What improvements does this need?
4. **delivery-priority** — How urgently should this be shown?
5. **audience-targeting** — Which user segments should see this?
6. **image-selection** — Which photo best represents this listing?
7. **description-quality** — Is this description adequate?
8. **pricing-completeness** — Is pricing information sufficient?
9. **schedule-validation** — Are schedule details correct?
10. **geo-accuracy** — Is location data accurate enough?

Each decision type has its own learning history and can be autonomized independently.

## Configuration

### In a Vertical Pack

```typescript
// verticals/sportolok/index.ts
const sportolok = {
  // ... other pack config ...
  
  sovereignAgent: {
    enabled: true,
    
    allowedDecisions: [
      "quality-gate",
      "content-enrichment",
      "delivery-priority",
      "description-quality",
      "schedule-validation",
      "geo-accuracy",
    ],
    
    autonomyThreshold: 0.95, // 95% confidence required
    
    qualityGates: {
      minDescriptionLength: 150,
      minImageCount: 1,
      requiresSchedule: true,
      requiresPricing: false,
      requiresGeocode: true,
    },
    
    deliveryRules: {
      priorityFactors: [
        { factor: "coverage-gap", weight: 0.45 },
        { factor: "completeness", weight: 0.25 },
        { factor: "demand", weight: 0.20 },
        { factor: "newness", weight: 0.10 },
      ],
      maxPublishRate: 40, // per hour
    },
    
    learning: {
      enabled: true,
      minSampleSize: 100,
      retrainingFrequency: "weekly",
    },
  },
};
```

## Decision Flow

### 1. Evaluation Phase

When content enters the system (via pipeline or admin interface):

```typescript
import { evaluateCard, recordDecision } from "@/lib/sovereign/agent";

const decision = evaluateCard(card, sovereignConfig);
// Returns: { decision, confidence, reasoning, evidence }

await recordDecision(db, decision);
```

**Possible Outcomes:**
- `approve` — Confidence >= threshold, proceed autonomously
- `reject` — Confidence < 0.5 hard floor, do not publish
- `remediate` — Fixable issues detected, attempt auto-repair
- `escalate` — Needs human review (confidence between 0.5-0.95)

### 2. Staff Override

When an operator disagrees with an agent decision:

```typescript
import { recordOverride } from "@/lib/sovereign/agent";

await recordOverride(db, decisionId, {
  staffEmail: "operator@example.com",
  overrideDecision: "approve",
  overrideReason: "Description is adequate for this category",
  overrideTimestamp: new Date(),
});
```

This override becomes **training data** for the learning system.

### 3. Learning Phase

Weekly retraining job analyzes historical decisions:

```typescript
import { calculateAccuracy } from "@/lib/sovereign/agent";

const metrics = await calculateAccuracy(
  db,
  "sportolok",
  "quality-gate",
  100, // min samples
);

// Returns:
// {
//   sampleSize: 247,
//   agreementRate: 0.96,
//   falsePositiveRate: 0.02,
//   falseNegativeRate: 0.02,
//   canAutonomize: true
// }
```

When `agreementRate >= 0.95` and `sampleSize >= minSampleSize`, that decision type earns full autonomy.

## Delivery Optimization

### Priority Scoring

Every published listing gets a priority score (0-100):

```typescript
import { calculateDeliveryPriority } from "@/lib/sovereign/delivery";

const priority = calculateDeliveryPriority(listing, {
  config: sovereignConfig,
  coverageGaps: new Map([
    ["tanfolyam", 0.8],  // 80% gap (only 2 listings)
    ["edzoterem", 0.3],  // 30% gap (7 listings)
  ]),
  demandSignals: new Map([
    ["tanfolyam", 0.9],  // high search volume
  ]),
  publishedAt: listing.createdAt,
});

// Returns priority score 0-100 with factor breakdown
```

**Priority Factors:**
- **Coverage Gap** (45% weight) — Fill empty spots first
- **Completeness** (25% weight) — Quality content earns priority
- **Demand** (20% weight) — User interest matters
- **Newness** (10% weight) — Fresh content bonus

### Delivery Windows

High-priority content gets immediate delivery, lower priority content waits for peak hours:

```typescript
import { planDeliveryWindows } from "@/lib/sovereign/delivery";

const windows = planDeliveryWindows(listing, priority);

// Returns:
// {
//   listingId: "l-...",
//   windows: [
//     {
//       start: Date(8:00),
//       end: Date(10:00),
//       priority: "high",
//       audienceSegment: ["ovodas", "also-tagozat"]
//     }
//   ]
// }
```

### Audience Targeting

Content automatically routed to relevant user segments:

```typescript
import { deriveAudienceSegments } from "@/lib/sovereign/delivery";

const segments = deriveAudienceSegments(listings, pack);

// Returns segments like:
// [
//   {
//     id: "age-ovodas",
//     name: "Óvodás, 3–6 év",
//     criteria: { ageBands: ["ovodas"] },
//     size: 840  // estimated users
//   },
//   {
//     id: "category-tanfolyam",
//     name: "Tanfolyamok",
//     criteria: { categories: ["tanfolyam"] },
//     size: 680
//   }
// ]
```

## API Usage

### Check System Status

```bash
curl -H "Authorization: Bearer $SSO_TOKEN" \
  https://sport.doneisbetter.com/api/sovereign/status
```

**Response:**
```json
{
  "enabled": true,
  "vertical": "sportolok",
  "configuration": {
    "allowedDecisions": ["quality-gate", "..."],
    "autonomyThreshold": 0.95,
    "qualityGates": {...},
    "deliveryRules": {...}
  },
  "metrics": {
    "totalDecisions": 1247,
    "overrideRate": 0.08,
    "accuracyByType": {
      "quality-gate": {
        "sampleSize": 247,
        "agreementRate": 0.96,
        "canAutonomize": true
      }
    }
  },
  "deliveryQueue": {
    "itemsQueued": 342,
    "avgPriority": 67,
    "priorityRange": { "min": 12, "max": 98 }
  }
}
```

### Evaluate Content

```bash
curl -X POST \
  -H "Authorization: Bearer $SSO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectType": "card",
    "subjectId": "card-abc123",
    "decisionType": "quality-gate"
  }' \
  https://sport.doneisbetter.com/api/sovereign/evaluate
```

**Response:**
```json
{
  "decisionId": "sovereign-card-abc123-1234567890",
  "decision": "escalate",
  "confidence": 0.78,
  "reasoning": [
    "Description 98 chars, below 150 minimum",
    "Confidence 0.78 below threshold, needs staff review"
  ],
  "evidence": {
    "factorScores": {
      "descriptionLength": 0.65,
      "imageCount": 1.0,
      "schedule": 1.0,
      "geocode": 0.0
    },
    "thresholds": {
      "autonomy": 0.95,
      "hardFloor": 0.5
    },
    "flags": ["short-description", "missing-geocode"]
  },
  "shouldAutonomize": false
}
```

## Database Schema

### `sovereign_decisions` Collection

```typescript
{
  id: "sovereign-card-abc123-1234567890",
  timestamp: ISODate("2026-09-23T11:30:00Z"),
  vertical: "sportolok",
  decisionType: "quality-gate",
  
  subjectId: "card-abc123",
  subjectType: "card",
  
  decision: "escalate",
  confidence: 0.78,
  reasoning: ["Description too short", "..."],
  
  evidence: {
    factorScores: { descriptionLength: 0.65, ... },
    thresholds: { autonomy: 0.95, hardFloor: 0.5 },
    flags: ["short-description"]
  },
  
  override?: {
    staffEmail: "operator@example.com",
    overrideDecision: "approve",
    overrideReason: "Adequate for this category",
    overrideTimestamp: ISODate("2026-09-23T12:00:00Z")
  },
  
  outcome?: {
    wasCorrect: false,
    feedbackTimestamp: ISODate("2026-09-23T12:00:00Z"),
    feedbackSource: "staff-override"
  },
  
  _createdAt: ISODate("2026-09-23T11:30:00Z")
}
```

### `listings` Collection — Delivery Metadata

Added fields:
```typescript
{
  // ... existing listing fields ...
  
  delivery: {
    priority: 67,  // 0-100
    factors: {
      coverageGap: 0.8,
      completeness: 0.9,
      demand: 0.5,
      newness: 0.3,
      engagement: 0.5
    },
    lastPrioritized: ISODate("2026-09-23T11:00:00Z"),
    priorityExpiresAt: ISODate("2026-09-23T12:00:00Z")
  }
}
```

### `sovereign_delivery_metrics` Collection

```typescript
{
  vertical: "sportolok",
  timestamp: ISODate("2026-09-23T11:00:00Z"),
  executionTimeMs: 3421,
  listingsProcessed: 100,
  priorityDistribution: {
    high: 23,
    medium: 54,
    low: 23
  },
  avgPriority: 62,
  maxPriority: 98,
  minPriority: 12,
  audienceSegments: 15,
  config: {
    batchSize: 100,
    maxPublishRate: 40
  }
}
```

## Monitoring

### Key Metrics

1. **Agreement Rate** — How often agent and staff agree (target: >= 95%)
2. **Override Rate** — How often staff overrides agent (lower is better, expect 5-10% early)
3. **False Positive Rate** — Agent approves, staff rejects (target: < 5%)
4. **False Negative Rate** — Agent rejects, staff approves (target: < 5%)
5. **Delivery Queue Health** — Avg priority, items queued, processing rate

### Observability

All decisions logged to MongoDB with full audit trail:
- What decision was made
- Why (reasoning + evidence)
- Confidence level
- Staff override (if any)
- Outcome (correct/incorrect)

Query decision history:
```javascript
db.sovereign_decisions.find({
  vertical: "sportolok",
  decisionType: "quality-gate",
  "override": { $exists: true }
}).sort({ timestamp: -1 })
```

## Safety Guardrails

1. **Autonomy Threshold** — Agent must be 95%+ confident to act autonomously
2. **Hard Floor** — Confidence < 0.5 always rejects, never escalates
3. **Minimum Sample Size** — Need 100+ decisions before autonomizing a decision type
4. **Staff Override Priority** — Human always wins; override immediately updates behavior
5. **Rate Limiting** — `maxPublishRate` prevents content flood
6. **Audit Trail** — Every decision logged, nothing happens in secret
7. **Escalation** — Uncertain decisions always go to staff

## Learning System

### Training Loop

1. **Collect** — Every decision + staff override becomes training data
2. **Analyze** — Weekly job calculates accuracy metrics per decision type
3. **Evaluate** — Check if `agreementRate >= 0.95` and `sampleSize >= 100`
4. **Autonomize** — Grant full autonomy to decision types that qualify
5. **Monitor** — Continue tracking to detect drift or degradation

### Drift Detection

If agreement rate drops below 90% after autonomization:
- Automatic downgrade to assisted mode
- Alert sent to operators
- Requires manual review before re-autonomizing

## Roadmap

### Phase 1: sportolok Launch (Current)
- ✅ Core decision framework
- ✅ Quality gate evaluation
- ✅ Delivery optimization
- ✅ Audit trail and learning
- ✅ API endpoints
- 🔄 Integration with pipeline

### Phase 2: Advanced Learning (Q4 2026)
- ML model training from historical decisions
- Predictive quality scoring
- Real-time demand detection
- A/B testing of delivery strategies

### Phase 3: Multi-Vertical Expansion (Q1 2027)
- Deploy to padel-africa
- Deploy to classscout (on-premise compatible)
- Cross-vertical learning (transfer learning)
- Federated decision-making

### Phase 4: Advanced Autonomy (Q2 2027)
- Auto-remediation (fix issues automatically)
- Content generation suggestions
- Proactive coverage gap filling
- Autonomous negotiation with external feeders

## Credits

**Designed and implemented:** September 2026  
**First deployment:** sportolok (Hungarian sport directory)  
**Architecture:** Sovereign agentic decision-making with transparency and learning  
**Status:** Production-ready, learning mode enabled  

---

## Related Documentation

- `docs/platform-architecture.md` — Where vertical packs fit in the system
- `docs/architecture.md` — Content lifecycle and pipeline
- `src/lib/sovereign/agent.ts` — Decision framework implementation
- `src/lib/sovereign/delivery.ts` — Delivery optimization implementation
- `verticals/sportolok/index.ts` — First sovereign agent configuration
