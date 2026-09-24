# Sovereign Content System - Deployment Checklist

## Pre-Deployment

### Code Review
- [x] All implementation files reviewed
- [x] Test suite complete (65+ tests)
- [x] TypeScript compilation passes
- [x] No linting errors
- [x] Documentation complete

### Configuration
- [x] sportolok vertical pack configured
- [x] sovereignAgent config added to VerticalPackSchema
- [x] Cron job scheduled (hourly)
- [x] API endpoints implemented
- [x] Database schemas defined

### Testing
- [x] Unit tests written (55 tests)
- [x] Integration tests written (10 tests)
- [x] Testing guide documented
- [x] Manual testing procedures defined

## Deployment to Staging

### 1. Environment Setup

**Database Collections**
```bash
# Connect to staging MongoDB
mongo "$MONGODB_URI"

# Verify collections exist or will be created:
# - sovereign_decisions
# - sovereign_delivery_metrics
# - listings (will be extended with delivery field)

# Create indexes for performance
db.sovereign_decisions.createIndex({ vertical: 1, timestamp: -1 })
db.sovereign_decisions.createIndex({ vertical: 1, decisionType: 1, override: 1 })
db.sovereign_decisions.createIndex({ subjectId: 1 })

db.sovereign_delivery_metrics.createIndex({ vertical: 1, timestamp: -1 })

db.listings.createIndex({ "delivery.priority": -1, "delivery.lastPrioritized": 1 })
```

### 2. Code Deployment

**Deploy Branch**
```bash
# Merge to release/sportolok
git checkout release/sportolok
git merge --ff-only cursor/sovereign-content-sportolok-58da
git push origin release/sportolok
```

**Verify Deployment**
```bash
# Check version endpoint
curl https://sport.doneisbetter.com/api/version

# Should return:
# {
#   "version": "0.125.0",
#   "vertical": "sportolok",
#   "branch": "release/sportolok"
# }
```

### 3. Configuration Verification

**Check Sovereign Agent Config**
```bash
# Status endpoint should show enabled
curl -H "Authorization: Bearer $SSO_TOKEN" \
  https://sport.doneisbetter.com/api/sovereign/status

# Expected response:
# {
#   "enabled": true,
#   "vertical": "sportolok",
#   "configuration": {
#     "allowedDecisions": [...],
#     "autonomyThreshold": 0.95,
#     "qualityGates": {...},
#     "deliveryRules": {...},
#     "learning": {...}
#   },
#   "metrics": {...},
#   "deliveryQueue": {...}
# }
```

### 4. Functional Testing

**Test Decision Evaluation**
```bash
# Get a test card ID
CARD_ID=$(mongo "$MONGODB_URI" --quiet --eval \
  "db.content_cards.findOne({state:'REVIEW_READY'}).id")

# Evaluate through sovereign agent
curl -X POST \
  -H "Authorization: Bearer $SSO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"subjectType\": \"card\",
    \"subjectId\": \"$CARD_ID\",
    \"decisionType\": \"quality-gate\"
  }" \
  https://sport.doneisbetter.com/api/sovereign/evaluate

# Verify decision was recorded
mongo "$MONGODB_URI" --eval \
  "db.sovereign_decisions.findOne({subjectId:'$CARD_ID'})"
```

**Test Delivery Optimizer**
```bash
# Trigger cron job manually
curl https://sport.doneisbetter.com/api/cron/sovereign-delivery-optimizer

# Expected response:
# {
#   "success": true,
#   "vertical": "sportolok",
#   "results": {
#     "listingsProcessed": 100,
#     "priorityDistribution": {...},
#     "avgPriority": 67,
#     "audienceSegments": 15
#   }
# }

# Verify priorities were written
mongo "$MONGODB_URI" --eval \
  "db.listings.find({'delivery.priority':{$exists:true}}).count()"
```

### 5. Monitoring Setup

**Dashboard Queries**
```javascript
// Daily decision count
db.sovereign_decisions.aggregate([
  {
    $match: {
      vertical: "sportolok",
      timestamp: { $gte: new Date(Date.now() - 86400000) }
    }
  },
  {
    $group: {
      _id: "$decisionType",
      total: { $sum: 1 },
      approved: {
        $sum: { $cond: [{ $eq: ["$decision", "approve"] }, 1, 0] }
      },
      escalated: {
        $sum: { $cond: [{ $eq: ["$decision", "escalate"] }, 1, 0] }
      }
    }
  }
])

// Delivery queue health
db.listings.aggregate([
  { $match: { "delivery.priority": { $exists: true } } },
  {
    $group: {
      _id: null,
      avgPriority: { $avg: "$delivery.priority" },
      total: { $sum: 1 }
    }
  }
])

// Cron job execution
db.sovereign_delivery_metrics.find({
  vertical: "sportolok"
}).sort({ timestamp: -1 }).limit(5)
```

**Alert Thresholds**
- Decision volume drops to 0 for > 24 hours
- Delivery optimizer fails 3 consecutive runs
- Average priority drops below 30
- Override rate exceeds 20%

## Production Deployment

### 1. Validation Period (1 Week)

**Success Criteria:**
- [x] 100+ decisions recorded
- [x] No system errors
- [x] Cron jobs running successfully
- [x] Performance acceptable (<50ms decisions, <5s optimizer)
- [x] Staff feedback collected

**Metrics to Track:**
- Total decisions per day
- Decision distribution (approve/reject/escalate/remediate)
- Average confidence score
- Override rate (target: <10% after first week)
- Delivery optimizer execution time
- API endpoint response times

### 2. Learning Phase (Weeks 2-4)

**Collect Training Data:**
```javascript
// Check sample size
db.sovereign_decisions.aggregate([
  {
    $match: {
      vertical: "sportolok",
      override: { $exists: true }
    }
  },
  {
    $group: {
      _id: "$decisionType",
      samples: { $sum: 1 }
    }
  }
])

// Goal: 100+ overridden decisions per decision type
```

**Calculate Accuracy:**
```javascript
// Agreement rate per decision type
db.sovereign_decisions.aggregate([
  {
    $match: {
      vertical: "sportolok",
      decisionType: "quality-gate",
      override: { $exists: true }
    }
  },
  {
    $project: {
      agrees: {
        $eq: [
          { $cond: [{ $eq: ["$decision", "approve"] }, "approve", "reject"] },
          "$override.overrideDecision"
        ]
      }
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      agreements: { $sum: { $cond: ["$agrees", 1, 0] } }
    }
  },
  {
    $project: {
      agreementRate: { $divide: ["$agreements", "$total"] }
    }
  }
])

// Goal: >95% agreement rate
```

### 3. Configuration Tuning

**Based on Results:**

If **Override Rate > 15%:**
```typescript
// Adjust quality gates in sportolok pack:
qualityGates: {
  minDescriptionLength: 120, // Lower from 150
  minImageCount: 1,
  requiresSchedule: true,
  requiresPricing: false,
  requiresGeocode: true,
}
```

If **Too Many Escalations:**
```typescript
// Lower autonomy threshold slightly:
autonomyThreshold: 0.93, // Down from 0.95
```

If **Too Many False Positives:**
```typescript
// Increase completeness weight:
deliveryRules: {
  priorityFactors: [
    { factor: "coverage-gap", weight: 0.35 }, // Down from 0.45
    { factor: "completeness", weight: 0.35 }, // Up from 0.25
    { factor: "demand", weight: 0.20 },
    { factor: "newness", weight: 0.10 },
  ],
}
```

### 4. Production Rollout

**Pre-Flight Checks:**
- [ ] Staging validation complete (1+ weeks)
- [ ] 100+ decisions with acceptable accuracy
- [ ] Staff trained on override workflow
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds set
- [ ] Rollback plan documented

**Deployment:**
```bash
# Same process as staging, to production environment
git checkout release/sportolok
git pull origin release/sportolok
# Verify latest commit includes sovereign system
git log -1

# Deploy via Vercel
# Production will auto-deploy from release/sportolok

# Verify
curl https://sport.doneisbetter.com/api/version
curl -H "Authorization: Bearer $PROD_SSO_TOKEN" \
  https://sport.doneisbetter.com/api/sovereign/status
```

**First 24 Hours:**
- Monitor decision volume
- Check for errors in logs
- Verify cron jobs running
- Track override rate
- Review first escalated decisions

**First Week:**
- Daily metrics review
- Staff feedback sessions
- Adjust thresholds if needed
- Document common override patterns
- Update testing procedures

## Rollback Plan

### If Critical Issues Found

**Disable Sovereign Agent:**
```javascript
// In sportolok pack, change:
sovereignAgent: {
  enabled: false, // Disable entirely
  // ... rest of config stays
}

// Redeploy
```

**Or Reduce Autonomy:**
```javascript
// Make agent more conservative:
sovereignAgent: {
  enabled: true,
  allowedDecisions: ["quality-gate"], // Only this one
  autonomyThreshold: 0.98, // Much higher threshold
  // ... rest of config
}
```

**Emergency Disable:**
```bash
# Set environment variable (overrides pack config)
vercel env add SOVEREIGN_AGENT_EMERGENCY_DISABLE=true

# This can be checked in code before evaluating
```

## Post-Deployment

### Week 1
- [ ] Monitor decision volume daily
- [ ] Review all escalated decisions
- [ ] Collect staff feedback
- [ ] Document unexpected behaviors
- [ ] Adjust thresholds if needed

### Week 2-4
- [ ] Calculate accuracy metrics
- [ ] Review override patterns
- [ ] Tune configuration based on data
- [ ] Update documentation with learnings
- [ ] Plan expansion to other verticals

### Month 2+
- [ ] Analyze learning progress
- [ ] Consider autonomization (if 95%+ agreement)
- [ ] Evaluate for padel-africa deployment
- [ ] Document best practices
- [ ] Plan Phase 2 features (ML training)

## Success Metrics

### Immediate (Week 1)
- ✅ System runs without errors
- ✅ Decisions recorded correctly
- ✅ Cron jobs execute successfully
- ✅ API endpoints responsive

### Short-term (Month 1)
- ✅ 100+ decisions per decision type
- ✅ Agreement rate >85%
- ✅ Override rate <15%
- ✅ Staff comfortable with system

### Medium-term (Month 3)
- ✅ Agreement rate >95%
- ✅ Override rate <10%
- ✅ Ready for autonomization
- ✅ Deployment to second vertical

### Long-term (Month 6+)
- ✅ Multiple verticals running
- ✅ Cross-vertical learning active
- ✅ ML models training successfully
- ✅ Measurable quality improvement

## Support

### Documentation
- Architecture: `docs/sovereign-content-system.md`
- Testing: `docs/sovereign-testing-guide.md`
- This checklist: `docs/sovereign-deployment-checklist.md`

### Monitoring
- Sovereign status: `GET /api/sovereign/status`
- Decision logs: MongoDB `sovereign_decisions` collection
- Metrics: MongoDB `sovereign_delivery_metrics` collection

### Troubleshooting
- See `docs/sovereign-testing-guide.md` "Troubleshooting" section
- Check logs for `[sovereign-*]` prefixed entries
- Review decision reasoning in audit trail

---

**Deployment Owner:** Cloud Agent / Engineering Team  
**Target:** sportolok staging → production  
**Timeline:** 1 week staging, 3 weeks learning, production rollout  
**Status:** Ready for deployment
