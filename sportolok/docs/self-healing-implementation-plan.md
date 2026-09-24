# Self-Healing System Implementation Plan

**Based on:** `docs/self-healing-audit-2026-09-24.md`  
**Enhanced by:** `docs/sovereign-intelligence-enhancement.md` (intelligent autonomy)  
**Goal:** Close the feedback loop → autonomous self-improvement with smart HiTL boundaries  
**Estimated effort:** 12-15 sessions

---

## Design Philosophy: Smart, Not Mechanical

**User requirement:**
> "I would like to have this sovereign improvement process smart as we use you to do this in the tasks so feedbacks and reports has to be not mechanical but fully well thought and broken down to details when report. In the other and at the self healing job I also want the smart delivery to decide what can you deliver without HiTL and what need to be reviewed by me."

**Key principles:**
1. **Cloud Agent executes tasks directly** (not just creates recommendations)
2. **Intelligent autonomy classification** (AUTO_SAFE, AUTO_REVIEWABLE, HUMAN_CONFIRM, HUMAN_DECIDE)
3. **Contextual, detailed reports** (not just mechanical counts)
4. **Smart HiTL boundaries** (system decides what needs human review)

**See:** `docs/sovereign-intelligence-enhancement.md` for full design.

---

## Phase 1: Foundation — Persist Feedback (Immediate — 1 Session)

**Goal:** Stop losing feedback to console logs. Create persistent storage for lessons and recommendations.

### 1.1 Create TypeScript Schemas

**File:** `src/lib/sovereign/lessons.ts` (new)

```typescript
/**
 * Quality lessons — learned patterns from quality-loop scoring.
 * SSOT contract: https://sovereigncontent.messmass.com/jobs#catalogquality-loop
 */

export interface QualityLesson {
  lessonId: string;
  createdAt: Date;
  vertical: string;
  
  lessonType: "description-pattern" | "media-pattern" | "geo-pattern" | "contact-pattern" | "schedule-pattern";
  
  pattern: {
    flag: string;          // e.g., "TOO_SHORT", "INLINE_URL", "ARCHITECTURE_FLUFF"
    occurrences: number;   // How many times seen
    samples: Array<{
      listingId: string;
      name: string;
      context: string;     // Snippet showing the issue
    }>;
  };
  
  recommendation: string;  // Human-readable (e.g., "Strip phone from description, move to venue.contact.phone")
  
  // Learning metrics
  appliedCount: number;    // How many times this lesson was used
  successCount: number;    // How many times it improved quality
  failureCount: number;    // How many times it made things worse
  successRate: number;     // successCount / appliedCount (0-1)
  
  // Status
  status: "learning" | "trusted" | "deprecated";
  promotedAt?: Date;       // When promoted to "trusted" (successRate > 0.8, appliedCount > 20)
  deprecatedAt?: Date;     // When marked "deprecated" (successRate < 0.3)
  deprecationReason?: string;
}

export interface QualityRecommendation {
  recommendationId: string;
  createdAt: Date;
  vertical: string;
  
  status: "open" | "in-progress" | "applied" | "rejected" | "expired";
  priority: "critical" | "high" | "medium" | "low";
  
  source: "operator-feedback" | "quality-loop" | "override-learning" | "error-pattern" | "source-discovery";
  sourceId?: string;       // Link to originating feedback/decision/error
  
  target: {
    type: "listing" | "card" | "config" | "global";
    ids?: string[];        // Specific listings/cards, or null for global
  };
  
  action: {
    type: "improve-description" | "update-config" | "retry-extraction" | "add-source" | "enrich-media" | "fix-geo";
    details: Record<string, unknown>;
    estimatedEffort: "low" | "medium" | "high";  // For prioritization
  };
  
  // Execution
  appliedAt?: Date;
  appliedBy?: "cloud-agent" | string;  // Staff email if manual
  outcome?: "success" | "failed" | "partial";
  outcomeDetail?: string;
  
  // Expiration
  expiresAt?: Date;        // Auto-expire if not applied within 30 days
}

export const QUALITY_LESSONS_COLLECTION = "quality_lessons";
export const QUALITY_RECOMMENDATIONS_COLLECTION = "quality_recommendations";
```

### 1.2 Update `catalog:quality-loop` — Phase 3 Encoding

**File:** `scripts/catalog-quality-loop.mts`

**Current Phase 3 (lines 110-136):** Logs patterns to console.

**New Phase 3:**

```typescript
// Phase 3: Encode lessons (write to MongoDB)
const lessonsCollection = db.collection(QUALITY_LESSONS_COLLECTION);

const lessonDocs: QualityLesson[] = [];
Object.entries(lessonPatterns).forEach(([flag, data]) => {
  lessonDocs.push({
    lessonId: `lesson-${Date.now()}-${flag.toLowerCase()}`,
    createdAt: new Date(),
    vertical: MONGODB_DB,
    lessonType: inferLessonType(flag),  // helper function
    pattern: {
      flag,
      occurrences: data.count,
      samples: data.samples.map((s) => ({
        listingId: s.id,
        name: s.name,
        context: s.reasons.join("; ")
      }))
    },
    recommendation: generateRecommendation(flag),  // helper function
    appliedCount: 0,
    successCount: 0,
    failureCount: 0,
    successRate: 0,
    status: "learning"
  });
});

if (lessonDocs.length > 0 && !dryRun) {
  await lessonsCollection.insertMany(lessonDocs);
  console.log(`✅ Encoded ${lessonDocs.length} quality lessons`);
}
```

**Helper functions:**

```typescript
function inferLessonType(flag: string): QualityLesson["lessonType"] {
  if (flag.includes("SHORT") || flag.includes("FLUFF") || flag.includes("CHROME")) {
    return "description-pattern";
  }
  if (flag.includes("MEDIA") || flag.includes("IMAGE")) {
    return "media-pattern";
  }
  if (flag.includes("GEO") || flag.includes("ADDRESS")) {
    return "geo-pattern";
  }
  if (flag.includes("CONTACT") || flag.includes("PHONE") || flag.includes("EMAIL")) {
    return "contact-pattern";
  }
  if (flag.includes("SCHEDULE") || flag.includes("HOURS")) {
    return "schedule-pattern";
  }
  return "description-pattern";  // default
}

function generateRecommendation(flag: string): string {
  const recommendations: Record<string, string> = {
    "TOO_SHORT": "Expand description to 100+ chars with visitor-focused details",
    "INLINE_URL": "Remove URLs from description; ensure website field is filled",
    "INLINE_PHONE": "Remove phone from description; move to venue.contact.phone",
    "ARCHITECTURE_FLUFF": "Replace architecture awards with visitor experience details",
    "CHROME": "Remove navigation/cookie/form chrome from description",
    // ... add more
  };
  return recommendations[flag] || `Review and fix ${flag} pattern`;
}
```

### 1.3 Update `catalog:self-heal` — Read Operator Feedback

**File:** `scripts/catalog-self-heal.mts`

**Add after line 17:**

```typescript
const cardFeedback = db.collection("card_feedback");

const [
  total,
  published,
  // ... existing queries ...
  unprocessedFeedback,  // NEW
] = await Promise.all([
  listings.countDocuments({}),
  // ... existing queries ...
  cardFeedback.countDocuments({ processedAt: { $exists: false } }),  // NEW
]);

// After existing report, add:
const latestFeedback = await cardFeedback
  .find({ processedAt: { $exists: false } })
  .sort({ createdAt: -1 })
  .limit(5)
  .toArray();

const report = {
  db: dbName,
  totals: {
    // ... existing ...
    unprocessedFeedback,  // NEW
  },
  openOperatorFeedback: latestFeedback.map((f) => ({
    feedbackId: f.feedbackId,
    scope: f.scope,
    sentiment: f.sentiment,
    message: f.message.slice(0, 100) + (f.message.length > 100 ? "..." : ""),
    cardId: f.cardId || null,
    createdAt: f.createdAt
  })),
  contentCards: { ... },
  nextWork: [ ... ]
};
```

**Output example:**

```json
{
  "totals": {
    "unprocessedFeedback": 3
  },
  "openOperatorFeedback": [
    {
      "feedbackId": "feedback-abc123",
      "scope": "global",
      "sentiment": "instruction",
      "message": "All pool descriptions should mention water temperature",
      "createdAt": "2026-09-24T10:30:00Z"
    }
  ]
}
```

---

## Phase 2: Feedback Processor (High Priority — 2 Sessions)

**Goal:** Turn stored operator feedback into actionable recommendations.

### 2.1 Create `catalog:feedback-processor`

**File:** `scripts/catalog-feedback-processor.mts` (new)

```typescript
#!/usr/bin/env node
/**
 * catalog:feedback-processor — Read operator feedback, create recommendations.
 *
 * SSOT contract: https://sovereigncontent.messmass.com/jobs (extension of catalog:self-heal)
 *
 * Usage:
 *   MONGODB_URI=... node scripts/catalog-feedback-processor.mjs --limit 20
 *   MONGODB_URI=... node scripts/catalog-feedback-processor.mjs --dry-run
 *
 * Flags:
 *   --limit N    Max feedback items to process (default: 20)
 *   --dry-run    Report only, no writes
 *
 * Exit codes:
 *   0 = success (including no unprocessed feedback)
 *   1 = error
 */

import { MongoClient } from "mongodb";
import type { CardFeedback } from "../src/lib/stats/cardStats.js";
import type { QualityRecommendation } from "../src/lib/sovereign/lessons.js";
import { QUALITY_RECOMMENDATIONS_COLLECTION } from "../src/lib/sovereign/lessons.js";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "sportolok";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
function getArg(name: string): string | null {
  const eqIdx = args.findIndex((a) => a.startsWith(`${name}=`));
  if (eqIdx !== -1) return args[eqIdx].split("=")[1];
  const spaceIdx = args.findIndex((a) => a === name);
  if (spaceIdx !== -1 && spaceIdx + 1 < args.length) return args[spaceIdx + 1];
  return null;
}

const limit = parseInt(getArg("--limit") || "20");
const dryRun = args.includes("--dry-run");

async function main() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log(`Feedback-processor ${dryRun ? "(DRY-RUN)" : ""}: db=${MONGODB_DB} limit=${limit}`);
    
    const feedbackCollection = db.collection("card_feedback");
    const recommendationsCollection = db.collection(QUALITY_RECOMMENDATIONS_COLLECTION);
    const listingsCollection = db.collection("listings");
    
    // Read unprocessed feedback
    const unprocessed = await feedbackCollection
      .find({ processedAt: { $exists: false } })
      .sort({ createdAt: 1 })  // oldest first
      .limit(limit)
      .toArray();
    
    if (unprocessed.length === 0) {
      console.log("✅ No unprocessed feedback");
      return;
    }
    
    console.log(`Processing ${unprocessed.length} feedback items...`);
    
    let recommendationsCreated = 0;
    const recommendations: QualityRecommendation[] = [];
    
    for (const feedback of unprocessed as unknown as CardFeedback[]) {
      console.log(`\n  Feedback: ${feedback.scope}/${feedback.sentiment} — ${feedback.message.slice(0, 60)}...`);
      
      // Create recommendation based on feedback type
      const rec: QualityRecommendation = {
        recommendationId: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date(),
        vertical: MONGODB_DB,
        status: "open",
        priority: determinePriority(feedback),
        source: "operator-feedback",
        sourceId: feedback.feedbackId,
        target: determineTarget(feedback, listingsCollection),
        action: determineAction(feedback),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // 30 days
      };
      
      recommendations.push(rec);
      recommendationsCreated++;
      
      console.log(`    → Recommendation: ${rec.action.type} (priority: ${rec.priority})`);
    }
    
    if (dryRun) {
      console.log(`\nDRY-RUN: Would create ${recommendationsCreated} recommendations`);
      console.log("Sample:", JSON.stringify(recommendations[0], null, 2));
      return;
    }
    
    // Write recommendations
    if (recommendations.length > 0) {
      await recommendationsCollection.insertMany(recommendations as any);
    }
    
    // Mark feedback as processed
    const feedbackIds = unprocessed.map((f: any) => f.feedbackId);
    await feedbackCollection.updateMany(
      { feedbackId: { $in: feedbackIds } },
      { $set: { processedAt: new Date() } }
    );
    
    console.log(`\n✅ Feedback-processor complete`);
    console.log(JSON.stringify({
      db: MONGODB_DB,
      processed: unprocessed.length,
      recommendationsCreated,
      dryRun
    }, null, 2));
    
  } finally {
    await client.close();
  }
}

function determinePriority(feedback: CardFeedback): QualityRecommendation["priority"] {
  if (feedback.sentiment === "instruction") return "high";
  if (feedback.sentiment === "negative") return "medium";
  return "low";
}

async function determineTarget(feedback: CardFeedback, listingsCollection: any): Promise<QualityRecommendation["target"]> {
  if (feedback.scope === "card" && feedback.cardId) {
    // Find associated listing
    const listing = await listingsCollection.findOne({ sourceCardId: feedback.cardId });
    return {
      type: "listing",
      ids: listing ? [listing.id] : []
    };
  }
  
  // Global feedback
  return {
    type: "global",
    ids: undefined
  };
}

function determineAction(feedback: CardFeedback): QualityRecommendation["action"] {
  const message = feedback.message.toLowerCase();
  
  // Pattern matching for action types
  if (message.includes("description") || message.includes("about")) {
    return {
      type: "improve-description",
      details: { instruction: feedback.message },
      estimatedEffort: "medium"
    };
  }
  
  if (message.includes("image") || message.includes("photo") || message.includes("media")) {
    return {
      type: "enrich-media",
      details: { instruction: feedback.message },
      estimatedEffort: "low"
    };
  }
  
  if (message.includes("location") || message.includes("address") || message.includes("geo")) {
    return {
      type: "fix-geo",
      details: { instruction: feedback.message },
      estimatedEffort: "medium"
    };
  }
  
  // Default: improve description
  return {
    type: "improve-description",
    details: { instruction: feedback.message },
    estimatedEffort: "medium"
  };
}

main().catch((err) => {
  console.error("Feedback-processor failed:", err);
  process.exit(1);
});
```

### 2.2 Update `package.json`

```json
{
  "scripts": {
    "catalog:feedback-processor": "npx tsx scripts/catalog-feedback-processor.mts"
  }
}
```

### 2.3 Test Flow

1. **Create test feedback:**
   ```bash
   curl -X POST https://sport.doneisbetter.com/api/stats/feedback \
     -H "Content-Type: application/json" \
     -d '{
       "scope": "global",
       "sentiment": "instruction",
       "message": "All pool listings should mention water temperature in the description"
     }'
   ```

2. **Run processor:**
   ```bash
   MONGODB_URI=... npm run catalog:feedback-processor -- --dry-run
   MONGODB_URI=... npm run catalog:feedback-processor
   ```

3. **Verify:**
   - Check `quality_recommendations` collection for new entry
   - Check `card_feedback` for `processedAt` timestamp

---

## Phase 3: Override Learner (Medium Priority — 2 Sessions)

**Goal:** Adjust sovereign agent thresholds based on staff overrides.

### 3.1 Create `catalog:override-learner`

**File:** `scripts/catalog-override-learner.mts` (new)

```typescript
#!/usr/bin/env node
/**
 * catalog:override-learner — Analyze sovereign_decisions overrides, suggest config changes.
 *
 * When staff consistently overrides the agent for a decision type, this suggests the
 * agent's thresholds are miscalibrated. This job detects those patterns and creates
 * recommendations for config updates.
 *
 * Usage:
 *   MONGODB_URI=... node scripts/catalog-override-learner.mjs --min-overrides 10
 *   MONGODB_URI=... node scripts/catalog-override-learner.mjs --dry-run
 *
 * Flags:
 *   --min-overrides N   Minimum overrides required to suggest config change (default: 10)
 *   --lookback-days N   Days of history to analyze (default: 30)
 *   --dry-run           Report only, no writes
 *
 * Exit codes:
 *   0 = success
 *   1 = error
 */

import { MongoClient } from "mongodb";
import type { QualityRecommendation } from "../src/lib/sovereign/lessons.js";
import { QUALITY_RECOMMENDATIONS_COLLECTION } from "../src/lib/sovereign/lessons.js";

// ... (implement similar to feedback-processor)
// Read sovereign_decisions, group by decisionType, calculate override rate,
// create config-update recommendations when override rate > 30%
```

---

## Phase 4: Error Remediation (Medium Priority — 2 Sessions)

**Goal:** Detect and remediate recurring cron failures.

### 4.1 Create `catalog:error-remediation`

**File:** `scripts/catalog-error-remediation.mts` (new)

```typescript
#!/usr/bin/env node
/**
 * catalog:error-remediation — Monitor cron_runs for chronic failures, auto-remediate.
 *
 * Detects:
 *   - Chronic failures (same job fails 3+ times in a row)
 *   - Systemic issues (same error across multiple jobs)
 *   - Resource exhaustion (timeouts)
 *
 * Auto-remediates:
 *   - Retry with exponential backoff
 *   - Reduce batch size for resource-exhausted jobs
 *
 * Escalates:
 *   - Systemic issues (e.g., MongoDB connection failures)
 *   - Unknown error patterns
 *
 * Usage:
 *   MONGODB_URI=... node scripts/catalog-error-remediation.mjs --lookback-hours 24
 *   MONGODB_URI=... node scripts/catalog-error-remediation.mjs --dry-run
 *
 * Exit codes:
 *   0 = success
 *   1 = error
 */

import { MongoClient } from "mongodb";
// ... (implement cron_runs analysis)
```

---

## Phase 5: Source Discovery (Low Priority — 3 Sessions)

**Goal:** Learn new sources for `catalog:find` from zero-results.

### 5.1 Create `catalog:source-discovery`

**File:** `scripts/catalog-source-discovery.mts` (new)

```typescript
#!/usr/bin/env node
/**
 * catalog:source-discovery — Mine find_attempts zero-results for new sources.
 *
 * When catalog:find returns zero-result for a city, this job:
 *   1. Re-runs WebSearch with broader queries
 *   2. Checks if new official sources exist (e.g., city sports authority sites)
 *   3. Creates recommendations to add those sources to next FIND campaign
 *
 * Usage:
 *   MONGODB_URI=... node scripts/catalog-source-discovery.mjs --analyze-zero-results
 *   MONGODB_URI=... node scripts/catalog-source-discovery.mjs --dry-run
 *
 * Exit codes:
 *   0 = success
 *   1 = error
 */

// ... (implement WebSearch + recommendation creation)
```

---

## Phase 6: Debt-Based Auto-Triggers (Low Priority — 1 Session)

**Goal:** Auto-trigger jobs based on `catalog:self-heal` thresholds.

### 6.1 Update `catalog:self-heal` — Add `--auto-trigger` Flag

**File:** `scripts/catalog-self-heal.mts`

**After report generation (line 107):**

```typescript
// Auto-trigger based on thresholds
const autoTrigger = args.includes("--auto-trigger");

if (autoTrigger && !dryRun) {
  console.log("\n=== AUTO-TRIGGER ===");
  
  const triggers = [];
  
  if (report.totals.emptyMediaWithWebsite > 40) {
    triggers.push({
      job: "catalog:media-curate",
      reason: `emptyMediaWithWebsite: ${report.totals.emptyMediaWithWebsite} > 40`,
      args: "--limit 40"
    });
  }
  
  if (report.totals.thinDescription > 20) {
    triggers.push({
      job: "catalog:about-curate",
      reason: `thinDescription: ${report.totals.thinDescription} > 20`,
      args: "--limit 20"
    });
  }
  
  if (report.totals.unprocessedFeedback > 5) {
    triggers.push({
      job: "catalog:feedback-processor",
      reason: `unprocessedFeedback: ${report.totals.unprocessedFeedback} > 5`,
      args: "--limit 10"
    });
  }
  
  if (triggers.length > 0) {
    console.log(`Auto-triggering ${triggers.length} jobs:`);
    triggers.forEach((t) => {
      console.log(`  • ${t.job} ${t.args} (${t.reason})`);
    });
    
    // TODO: Implement via subscribe_timer or direct exec
    // For now, just log what would be triggered
  } else {
    console.log("No auto-triggers (all thresholds below limits)");
  }
}
```

---

## Phase 7: Integration with `catalog:quality-loop`

**Goal:** Make quality-loop read and apply recommendations.

### 7.1 Update `catalog:quality-loop` — Phase 2 Enhancement

**File:** `scripts/catalog-quality-loop.mts`

**Before Phase 2 (improve), add:**

```typescript
// Phase 1.5: Read open recommendations
const recommendationsCollection = db.collection(QUALITY_RECOMMENDATIONS_COLLECTION);

const openRecs = await recommendationsCollection
  .find({
    status: "open",
    vertical: MONGODB_DB,
    "action.type": "improve-description",
    expiresAt: { $gt: new Date() }
  })
  .sort({ priority: -1, createdAt: 1 })  // highest priority first
  .limit(improveLimit)
  .toArray();

console.log(`\nOpen recommendations: ${openRecs.length}`);

// Phase 2: Improve (now includes recommendations)
const toImprove = [
  ...openRecs.map((rec) => ({
    id: rec.target.ids?.[0],
    source: "recommendation",
    recommendationId: rec.recommendationId,
    instruction: rec.action.details.instruction
  })),
  ...failing.slice(0, improveLimit - openRecs.length).map((f) => ({
    id: f.id,
    source: "quality-score",
    flags: f.flags
  }))
];

// ... (apply improvements) ...

// Mark recommendations as applied
if (!dryRun) {
  for (const rec of openRecs) {
    await recommendationsCollection.updateOne(
      { recommendationId: rec.recommendationId },
      {
        $set: {
          status: "applied",
          appliedAt: new Date(),
          appliedBy: "cloud-agent",
          outcome: "success"  // TODO: verify after apply
        }
      }
    );
  }
}
```

---

## Testing Strategy

### Unit Tests

1. **Test lesson encoding:**
   - `catalog:quality-loop` with known failing listings
   - Verify `quality_lessons` rows created

2. **Test feedback processing:**
   - Insert test feedback via `/api/stats/feedback`
   - Run `catalog:feedback-processor`
   - Verify recommendation created + feedback marked processed

3. **Test recommendation consumption:**
   - Insert test recommendation manually
   - Run `catalog:quality-loop`
   - Verify recommendation applied + status updated

### Integration Tests

1. **End-to-end feedback loop:**
   - Staff posts feedback → processor creates rec → quality-loop applies → outcome recorded

2. **Override learning:**
   - Insert test sovereign_decisions with overrides → learner suggests config change

3. **Error remediation:**
   - Simulate 3 consecutive cron failures → remediation creates retry rec

---

## Rollout Strategy

### Week 1: Foundation
- ✅ Implement Phase 1 (schemas + self-heal update)
- ✅ Deploy `quality_lessons` and `quality_recommendations` collections
- ✅ Test lesson encoding in staging

### Week 2: Feedback Processing
- ✅ Implement `catalog:feedback-processor`
- ✅ Test with real operator feedback
- ✅ Deploy to production

### Week 3: Quality Loop Integration
- ✅ Update `catalog:quality-loop` to read recommendations
- ✅ Test end-to-end feedback → rec → apply flow
- ✅ Monitor success rates

### Week 4: Override Learning
- ✅ Implement `catalog:override-learner`
- ✅ Analyze historical override patterns
- ✅ Create first config change recommendations (human review)

### Week 5+: Advanced Features
- Error remediation
- Source discovery
- Auto-triggers

---

## Success Criteria

After Phase 1-3 implementation:

1. ✅ `card_feedback` unprocessed count trends to 0
2. ✅ `quality_recommendations` open count > 0 and being applied
3. ✅ `quality_lessons` success rate > 0.7
4. ✅ Quality-loop `needImprovement` count decreases over time
5. ✅ Sovereign agent override rate < 15%

---

## Next Actions (This Session)

1. ✅ **Create `src/lib/sovereign/lessons.ts`** (schemas)
2. ✅ **Update `catalog:quality-loop`** (Phase 3 encoding)
3. ✅ **Update `catalog:self-heal`** (read card_feedback)
4. ✅ **Test locally** (dry-run all changes)
5. ✅ **Commit + push**
6. ✅ **Update PR** with self-healing audit + plan

---

**Status:** Ready to implement Phase 1  
**Estimated time:** 2-3 hours for Phase 1 completion
