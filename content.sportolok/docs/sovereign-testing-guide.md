# Sovereign Content System Testing Guide

## Overview

This document provides comprehensive testing procedures for the Sovereign Agentic Content Delivery and Management System.

## Test Files

Three test suites have been created:

1. **`src/lib/sovereign/agent.test.ts`** — Core agent decision framework (350+ lines, 30+ tests)
2. **`src/lib/sovereign/delivery.test.ts`** — Delivery optimization (300+ lines, 25+ tests)
3. **`src/app/api/sovereign/status/route.test.ts`** — API endpoint integration (150+ lines, 10+ tests)

## Running Tests

### Unit Tests

```bash
# Run all sovereign agent tests
npm test -- src/lib/sovereign/agent.test.ts

# Run delivery optimizer tests
npm test -- src/lib/sovereign/delivery.test.ts

# Run API integration tests
npm test -- src/app/api/sovereign/status/route.test.ts

# Run all sovereign tests
npm test -- src/lib/sovereign/ src/app/api/sovereign/
```

### TypeScript Compilation

```bash
# Check TypeScript without emitting files
npx typescript --noEmit
```

### Linting

```bash
# Lint and fix sovereign agent code
npm run lint -- --fix src/lib/sovereign/
npm run lint -- --fix src/app/api/sovereign/
```

## Manual Testing Checklist

### 1. Agent Decision Framework

**Test evaluateCard()**
```typescript
import { evaluateCard, DEFAULT_SOVEREIGN_CONFIG } from "@/lib/sovereign/agent";

const mockCard = {
  id: "test-card",
  state: "REVIEW_READY",
  sourcePool: "test",
  lastReason: "extracted",
  updatedAt: new Date(),
  extractedText: {
    description: "Test description with adequate length for quality evaluation.",
    schedule: ["Monday 10:00-11:00"],
  },
  extractedImages: [{ url: "test.jpg", altText: "test" }],
  venue: { geocode: { lat: 47.4979, lng: 19.0402 } },
};

const decision = evaluateCard(mockCard, DEFAULT_SOVEREIGN_CONFIG);

// ✓ Decision should be "approve" with confidence >= 0.95
// ✓ Should include reasoning array
// ✓ Should have evidence with factorScores
// ✓ Should have unique ID starting with "sovereign-"
```

**Test evaluateListing()**
```typescript
import { evaluateListing } from "@/lib/sovereign/agent";

const mockListing = {
  id: "l-test",
  name: "Test Listing",
  description: "Adequate description",
  lifecycleState: "PUBLISHED",
  activityTypes: ["tanfolyam"],
  images: [{ url: "test.jpg", altText: "test" }],
  schedule: [{ dayOfWeek: "monday", startTime: "10:00", endTime: "11:00", timezone: "Europe/Budapest" }],
  venue: { geocode: { lat: 47.4979, lng: 19.0402 }, locality: { settlement: "Budapest" } },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const decision = evaluateListing(mockListing, DEFAULT_SOVEREIGN_CONFIG);

// ✓ Complete listing should approve
// ✓ Incomplete listing should remediate or escalate
// ✓ Missing geocode should escalate (critical)
```

### 2. Delivery Optimization

**Test calculateDeliveryPriority()**
```typescript
import { calculateDeliveryPriority } from "@/lib/sovereign/delivery";

const priority = calculateDeliveryPriority(mockListing, {
  config: DEFAULT_SOVEREIGN_CONFIG,
  coverageGaps: new Map([["tanfolyam", 0.8]]),
  demandSignals: new Map([["tanfolyam", 0.9]]),
  publishedAt: new Date(),
});

// ✓ Score should be 0-100
// ✓ High coverage gap should increase priority
// ✓ Should include all factor scores
// ✓ Should have expiration timestamp
```

**Test planDeliveryWindows()**
```typescript
import { planDeliveryWindows } from "@/lib/sovereign/delivery";

const windows = planDeliveryWindows(mockListing, priority);

// ✓ High priority (75+) should get immediate window
// ✓ Medium priority (50-75) should get peak hours
// ✓ Low priority (<50) should get off-peak
// ✓ Should target age band audiences
```

**Test DeliveryRateLimiter**
```typescript
import { DeliveryRateLimiter } from "@/lib/sovereign/delivery";

const limiter = new DeliveryRateLimiter(10);

// ✓ Should allow publishing within limit
limiter.recordPublish();
// ✓ getRemaining() should decrease
// ✓ canPublish() should return false at limit
// ✓ Should reset after 1 hour
```

### 3. API Endpoints

**Test GET /api/sovereign/status**
```bash
# Requires SSO token with management:catalog.read scope
curl -H "Authorization: Bearer $SSO_TOKEN" \
  https://sport.doneisbetter.com/api/sovereign/status

# Expected response (enabled):
# {
#   "enabled": true,
#   "vertical": "sportolok",
#   "configuration": {...},
#   "metrics": {
#     "totalDecisions": 247,
#     "overrideRate": 0.08,
#     "accuracyByType": {...}
#   },
#   "deliveryQueue": {...}
# }

# Expected response (disabled):
# {
#   "enabled": false,
#   "vertical": "padel-africa",
#   "message": "Sovereign agent not configured for this vertical"
# }
```

**Test POST /api/sovereign/evaluate**
```bash
# Requires SSO token with management:ingest.write scope
curl -X POST \
  -H "Authorization: Bearer $SSO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectType": "card",
    "subjectId": "card-test-123",
    "decisionType": "quality-gate"
  }' \
  https://sport.doneisbetter.com/api/sovereign/evaluate

# Expected response:
# {
#   "decisionId": "sovereign-card-test-123-...",
#   "decision": "approve|reject|escalate|remediate",
#   "confidence": 0.96,
#   "reasoning": ["..."],
#   "evidence": {...},
#   "shouldAutonomize": true|false
# }
```

**Test GET /api/cron/sovereign-delivery-optimizer**
```bash
# Cron job endpoint (scheduled hourly)
curl https://sport.doneisbetter.com/api/cron/sovereign-delivery-optimizer

# Expected response:
# {
#   "success": true,
#   "vertical": "sportolok",
#   "executionTimeMs": 3421,
#   "results": {
#     "listingsProcessed": 100,
#     "priorityDistribution": {
#       "high": 23,
#       "medium": 54,
#       "low": 23
#     },
#     "avgPriority": 67,
#     "audienceSegments": 15,
#     "coverageGaps": {...}
#   }
# }
```

### 4. Database Verification

**Check Decision Audit Trail**
```javascript
// Connect to MongoDB and run:
db.sovereign_decisions.find({
  vertical: "sportolok"
}).sort({ timestamp: -1 }).limit(10)

// ✓ Should have decision records
// ✓ Each should have: id, timestamp, decision, confidence, reasoning, evidence
// ✓ Overridden decisions should have override field
```

**Check Delivery Metadata**
```javascript
// Check listings have delivery priorities:
db.listings.find({
  lifecycleState: "PUBLISHED",
  "delivery.priority": { $exists: true }
}).limit(10)

// ✓ Should have delivery.priority (0-100)
// ✓ Should have delivery.factors object
// ✓ Should have delivery.lastPrioritized timestamp
```

**Check Delivery Metrics**
```javascript
// Check delivery optimization runs:
db.sovereign_delivery_metrics.find({
  vertical: "sportolok"
}).sort({ timestamp: -1 }).limit(5)

// ✓ Should have hourly execution records
// ✓ Should track listingsProcessed, priorityDistribution, avgPriority
// ✓ Should include config snapshot
```

### 5. Integration Testing

**Test with Real sportolok Data**

1. **Evaluate a Real Card**
   ```bash
   # Get a recent card ID from content_cards collection
   CARD_ID=$(mongo --eval "db.content_cards.findOne({state:'REVIEW_READY'}).id")
   
   # Evaluate it
   curl -X POST \
     -H "Authorization: Bearer $SSO_TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"subjectType\":\"card\",\"subjectId\":\"$CARD_ID\",\"decisionType\":\"quality-gate\"}" \
     https://sport.doneisbetter.com/api/sovereign/evaluate
   ```

2. **Check Decision Was Recorded**
   ```javascript
   db.sovereign_decisions.findOne({
     subjectId: CARD_ID
   })
   // ✓ Should exist
   // ✓ Should have all required fields
   ```

3. **Simulate Staff Override**
   ```javascript
   db.sovereign_decisions.updateOne(
     { subjectId: CARD_ID },
     {
       $set: {
         override: {
           staffEmail: "test@example.com",
           overrideDecision: "approve",
           overrideReason: "Test override",
           overrideTimestamp: new Date()
         }
       }
     }
   )
   ```

4. **Check Accuracy Calculation**
   ```javascript
   // After 100+ decisions with overrides:
   db.sovereign_decisions.aggregate([
     { $match: { vertical: "sportolok", decisionType: "quality-gate", override: { $exists: true } } },
     { $group: {
       _id: null,
       total: { $sum: 1 },
       agreements: {
         $sum: {
           $cond: [
             { $eq: [
               "$decision",
               { $cond: [{ $eq: ["$override.overrideDecision", "approve"] }, "approve", "reject"] }
             ]},
             1,
             0
           ]
         }
       }
     }},
     { $project: { agreementRate: { $divide: ["$agreements", "$total"] } } }
   ])
   ```

### 6. Performance Testing

**Measure Decision Latency**
```javascript
const start = Date.now();
const decision = evaluateCard(mockCard, config);
const latency = Date.now() - start;

// ✓ Should complete in < 50ms
console.log(`Decision latency: ${latency}ms`);
```

**Measure Delivery Optimization Throughput**
```bash
time curl https://sport.doneisbetter.com/api/cron/sovereign-delivery-optimizer

# ✓ Should process 100 listings in < 5 seconds
# ✓ Should not exceed memory limits
```

**Load Test Rate Limiter**
```typescript
const limiter = new DeliveryRateLimiter(40);
const results = [];

for (let i = 0; i < 50; i++) {
  results.push(limiter.canPublish());
  if (limiter.canPublish()) {
    limiter.recordPublish();
  }
}

// ✓ First 40 should be true
// ✓ Last 10 should be false
```

## Test Coverage Goals

- **Unit Test Coverage:** >80% for core logic
- **Integration Test Coverage:** All API endpoints
- **E2E Test Coverage:** Full decision → override → learning flow

## Test Data

### Mock Cards
Use `src/lib/sovereign/agent.test.ts` mock data:
- Complete card (all fields present)
- Incomplete card (missing description/images)
- Critical issues card (missing geocode)

### Mock Listings
Use `src/lib/sovereign/delivery.test.ts` mock data:
- Published listing (complete)
- Draft listing (incomplete)
- Multiple listings for audience segmentation

### Real sportolok Data
- Query production `content_cards` for REVIEW_READY cards
- Query production `listings` for PUBLISHED listings
- Use actual taxonomy slugs and age bands from sportolok pack

## Regression Testing

After any changes to sovereign system:

1. ✓ Run all unit tests
2. ✓ Verify TypeScript compilation
3. ✓ Test API endpoints manually
4. ✓ Check database schemas
5. ✓ Verify sportolok configuration still valid
6. ✓ Monitor decision accuracy metrics

## Known Limitations

1. **No ML Training Yet** — Learning system logs data but doesn't train models (Phase 2)
2. **Accuracy Requires History** — Need 100+ decisions before autonomization
3. **Single Vertical** — Only sportolok configured initially
4. **Manual Deployment** — Requires environment setup on target servers

## Next Steps

1. Deploy to sportolok staging environment
2. Run with real data for 1 week
3. Collect 100+ decisions with staff reviews
4. Analyze accuracy metrics
5. Adjust thresholds based on results
6. Deploy to production with monitoring

## Monitoring in Production

### Key Metrics to Watch

```javascript
// Daily accuracy check
db.sovereign_decisions.aggregate([
  { $match: { 
    vertical: "sportolok",
    timestamp: { $gte: new Date(Date.now() - 86400000) }
  }},
  { $group: {
    _id: "$decisionType",
    total: { $sum: 1 },
    approved: { $sum: { $cond: [{ $eq: ["$decision", "approve"] }, 1, 0] } },
    overridden: { $sum: { $cond: [{ $exists: "$override" }, 1, 0] } }
  }}
])

// Delivery queue health
db.listings.aggregate([
  { $match: { "delivery.priority": { $exists: true } } },
  { $group: {
    _id: null,
    avgPriority: { $avg: "$delivery.priority" },
    highPriority: { $sum: { $cond: [{ $gte: ["$delivery.priority", 75] }, 1, 0] } },
    medPriority: { $sum: { $cond: [
      { $and: [
        { $gte: ["$delivery.priority", 50] },
        { $lt: ["$delivery.priority", 75] }
      ]},
      1,
      0
    ]}},
    lowPriority: { $sum: { $cond: [{ $lt: ["$delivery.priority", 50] }, 1, 0] } }
  }}
])
```

## Troubleshooting

### Agent Not Making Decisions
- Check `sovereignAgent.enabled` in sportolok pack
- Verify decision type in `allowedDecisions`
- Check autonomy threshold (default 0.95)

### Low Agreement Rate
- Review override reasons in database
- Adjust quality gate thresholds
- Refine factor weights

### Delivery Queue Issues
- Check `maxPublishRate` limit
- Verify coverage gaps calculation
- Review demand signals source

---

**Status:** Test suites ready, awaiting deployment to staging  
**Coverage:** 65+ test cases across unit, integration, and E2E  
**Next:** Deploy to sportolok staging and run with real data
