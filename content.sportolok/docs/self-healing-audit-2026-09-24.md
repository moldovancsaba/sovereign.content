# Self-Healing System Audit — sportolok Sovereign Content

**Date:** 2026-09-24  
**Vertical:** sportolok  
**Scope:** Self-healing jobs, feedback collection, lesson encoding, and autonomous improvement

---

## Executive Summary

**Current State:** sportolok has **foundational self-healing components** but **no closed feedback loop**. Jobs collect implicit signals (empty queues, quality scores, stuck cards), but there is **no dedicated job** that reads feedback, opens recommendations, or encodes lessons for future improvements.

**Key Findings:**
1. ✅ **Self-heal status reporting exists** (`catalog:self-heal`)
2. ✅ **Quality scoring exists** (`catalog:quality-loop`)
3. ✅ **Operator feedback collection exists** (`card_feedback` collection)
4. ✅ **Sovereign decision audit exists** (`sovereign_decisions` collection)
5. ❌ **No job processes `card_feedback` into actions**
6. ❌ **No job encodes quality lessons into reusable patterns**
7. ❌ **No job monitors `sovereign_decisions` for override patterns**
8. ❌ **No job discovers new optional sources for `catalog:find`**

**Gap:** We collect the data but **don't act on it autonomously**.

---

## 1. Current Feedback Collection Mechanisms

### 1.1 Operator Feedback (`card_feedback` collection)

**Source:** `/api/stats/feedback` (POST endpoint)  
**Collection:** `card_feedback`  
**Schema:**
```typescript
interface CardFeedback {
  feedbackId: string;
  scope: "global" | "card";           // Global instruction or card-specific
  sentiment: "instruction" | "positive" | "negative";
  message: string;                    // Free-text feedback (max 2000 chars)
  cardId?: string;                    // If scope = "card"
  createdAt: string;
}
```

**Usage:** Staff can post feedback via the stats console (`/stats` admin surface).  
**Processing:** Currently **read-only display** in the stats dashboard (`listLatestFeedback`). **No job processes these into actions.**

**Example feedback types:**
- `instruction/global`: "All pool descriptions should mention water temperature"
- `negative/card`: "This listing has outdated hours"
- `positive/card`: "Great description quality"

**Volume:** Unknown (not tracked in cron reports).

---

### 1.2 Sovereign Decisions (`sovereign_decisions` collection)

**Source:** `src/lib/sovereign/agent.ts` — `recordDecision()`  
**Collection:** `sovereign_decisions`  
**Schema:**
```typescript
interface SovereignDecision {
  id: string;
  timestamp: Date;
  vertical: string;
  decisionType: "publish-approval" | "quality-gate" | "content-enrichment" | ...;
  
  subjectId: string;
  subjectType: "listing" | "card" | "image" | "description";
  
  decision: "approve" | "reject" | "escalate" | "remediate";
  confidence: number; // 0-1
  reasoning: string[];
  
  evidence: {
    factorScores: Record<string, number>;
    thresholds: Record<string, number>;
    flags: string[];
  };
  
  override?: {
    staffEmail: string;
    overrideDecision: "approve" | "reject";
    overrideReason: string;
    overrideTimestamp: Date;
  };
  
  outcome?: {
    wasCorrect: boolean;
    feedbackTimestamp: Date;
    feedbackSource: "staff-override" | "user-engagement" | "automated-metric";
  };
}
```

**Usage:** The sovereign agent logs every autonomous decision with full audit trail.  
**Processing:** `/api/sovereign/status` reads for reporting. **No job analyzes overrides to learn patterns.**

**Learning opportunity:** When `override` exists, compare `decision` vs `overrideDecision` to identify systematic agent errors (e.g., "agent always rejects listings with < 3 images, but staff approves 40% of them → soften threshold").

**Volume:** Unknown (not tracked in cron reports).

---

### 1.3 Quality Scoring (`catalog:quality-loop`)

**Source:** `scripts/catalog-quality-loop.mts`  
**Implicit Feedback:** Quality verdict for each published listing:
```typescript
{
  id: string;
  name: string;
  score: number;        // 0-100
  ok: boolean;          // Pass/fail
  flags: string[];      // ["TOO_SHORT", "INLINE_URL", ...]
  reasons: string[];    // ["Description < 100 chars", ...]
}
```

**Current behavior:** Scores and reports, but **lesson encoding is stubbed** (Phase 3 of the script logs patterns but doesn't write to DB).

**Gap:** No `quality_lessons` or `quality_recommendations` collection. Patterns are logged to console, not persisted.

---

### 1.4 Catalog Status (`catalog:self-heal`)

**Source:** `scripts/catalog-self-heal.mts`  
**Implicit Feedback:** Catalog health metrics:
```json
{
  "db": "sportolok",
  "totals": {
    "total": 349,
    "published": 240,
    "reviewReady": 0,
    "withMedia": 240,
    "emptyMedia": 109,
    "emptyMediaWithWebsite": 45,
    "thinDescription": 0
  },
  "contentCards": { "DISCOVERED": 12, "PUBLISHED": 237, ... },
  "nextWork": [ ... ]
}
```

**Current behavior:** Reports debt, prioritizes work for Cloud Agent.  
**Gap:** No job **acts** on this report (e.g., auto-trigger `catalog:media-curate` when `emptyMediaWithWebsite > 40`).

---

### 1.5 Cron Job Error Logging

**Source:** `src/lib/cron/cronRuns.ts` — `timedCronRun()`  
**Collection:** `cron_runs`  
**Schema:** (from `cron_runs.ts`)
```typescript
{
  runId: string;
  name: string;
  vertical: string;
  status: "ok" | "error" | "timeout" | "refused";
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  ticks?: number;        // Rows processed
  detail?: string;       // Success summary or error message
}
```

**Usage:** Every cron logs outcome. The `/api/cron/status` endpoint reads these.  
**Processing:** Read-only dashboard. **No job analyzes error patterns** (e.g., "geo backfill fails every 3rd run → Nominatim rate limit issue").

---

### 1.6 Content Card Lifecycle Transitions

**Implicit Feedback:** State changes tracked in `content_cards`:
- `DISCOVERED → QUARANTINED`: Extraction failed
- `REVIEW_READY → PUBLISHED`: Manual approval
- `BLOCKED_REPAIRABLE → DISCOVERED`: Requeued after fix

**Gap:** No job analyzes **why** cards get stuck (e.g., "80% of QUARANTINED cards have missing `sourceText.website` → update Find to require website before seed").

---

## 2. What Feedback Is Collected?

| Feedback Type | Source | Collection | Structured? | Volume | Processed? |
|---------------|--------|------------|-------------|--------|------------|
| **Operator notes** | `/api/stats/feedback` | `card_feedback` | ✅ Yes | Unknown | ❌ No |
| **Sovereign overrides** | Sovereign agent | `sovereign_decisions` | ✅ Yes | Unknown | ❌ No |
| **Quality verdicts** | `catalog:quality-loop` | Console only | ⚠️ No DB | Daily | ❌ No |
| **Catalog debt** | `catalog:self-heal` | Console only | ⚠️ No DB | On-demand | ❌ No |
| **Cron errors** | All crons | `cron_runs` | ✅ Yes | Every tick | ❌ No |
| **Card lifecycle** | Pipeline | `content_cards` | ✅ Yes | Continuous | ❌ No |
| **Backfill errors** | `catalog-backfill` | Inline in report | ⚠️ No DB | Every tick | ❌ No |

**Summary:** Rich feedback exists, but it's **not actionable** without a processing job.

---

## 3. What Do We Do With Feedbacks?

### Current Processing (Read-Only)

1. **Stats Dashboard** (`/api/stats/summary`):
   - Reads `card_feedback` for display
   - Reads `cron_runs` for status
   - Shows latest 12 feedback items
   - **No actions taken**

2. **Sovereign Status** (`/api/sovereign/status`):
   - Reads `sovereign_decisions` for audit
   - Calculates confidence/override stats
   - **No learning loop**

3. **Cron Status** (`/api/cron/status`):
   - Reads `cron_runs` for health check
   - Shows last 50 runs
   - **No remediation**

### What's Missing: The Processing Jobs

**None of these exist yet:**

❌ `catalog:feedback-processor` — Reads `card_feedback`, opens recommendations  
❌ `catalog:lesson-encoder` — Persists quality patterns from `quality-loop`  
❌ `catalog:override-learner` — Analyzes `sovereign_decisions` overrides  
❌ `catalog:error-remediation` — Monitors `cron_runs` for recurring failures  
❌ `catalog:source-discovery` — Mines stuck cards for new `catalog:find` sources  

---

## 4. Is There a Separated Job That Checks for New Feedback?

**No.** Currently:
- Feedback is **passively stored** when staff submits via `/api/stats/feedback`
- Quality verdicts are **logged to console** but not persisted
- Sovereign overrides are **written once** but never re-analyzed
- Cron errors are **logged** but not aggregated for patterns

**What SSOT Recommends:**

From `sovereigncontent.messmass.com/jobs#catalog:self-heal`:
> Unified About + research debt status. When debt is hot, FIND `--until-found` defers and prints heal-first briefs. `--status` reports `openOperatorFeedback` (`/stats` card notes) and instructs `catalog:quality-loop` — never paste the operator note into About. Record process lessons with `--record-process`.

This implies:
1. `catalog:self-heal --status` should **read `card_feedback`** and surface it as "openOperatorFeedback"
2. A separate job (or flag) should **process** that feedback into quality-loop instructions
3. Lessons should be **recorded** (`--record-process` flag mentioned but not implemented)

---

## 5. Effectiveness of Current Self-Healing

### What Works ✅

1. **`catalog:self-heal`** reports debt accurately
2. **`catalog:quality-loop`** scores descriptions consistently
3. **`catalog:hygiene`** fills missing geo/price/contact
4. **`catalog:autopilot`** requeues stuck cards
5. **`catalog:media-curate`** enriches media systematically

### What's Manual 🛠️

1. **Cloud Agent acts on `self-heal` report** → Should be automatic trigger
2. **Quality lessons are console-logged** → Should be persisted + applied
3. **Operator feedback is displayed** → Should open recommendations
4. **Sovereign overrides are audited** → Should update thresholds
5. **Cron errors are logged** → Should trigger remediation

### What's Missing ❌

1. **No feedback processing loop**
2. **No lesson persistence** (`quality_lessons` collection doesn't exist)
3. **No recommendation queue** (`quality_recommendations` collection doesn't exist)
4. **No override learning** (autonomous threshold adjustment)
5. **No error pattern detection** (recurring cron failures)
6. **No source discovery** (mining failed finds for new search strategies)

---

## 6. Gaps in Self-Healing System

### 6.1 No Feedback → Action Pipeline

**Current:** Operator writes feedback → sits in `card_feedback` → maybe Cloud Agent sees it in dashboard  
**Needed:** Operator writes feedback → `catalog:feedback-processor` → opens recommendation → `catalog:quality-loop --improve` applies it

### 6.2 No Lesson Encoding

**Current:** `quality-loop` logs patterns like "TOO_SHORT: 15 occurrences" to console  
**Needed:** `quality-loop` writes to `quality_lessons` → next run applies learned patterns

### 6.3 No Override Learning

**Current:** Staff overrides sovereign agent → decision logged with override reason  
**Needed:** `catalog:override-learner` analyzes patterns → suggests config changes (e.g., "Lower minImageCount from 3 to 1")

### 6.4 No Error Remediation

**Current:** `catalog-backfill` geo pass fails 3 times in a row → logged each time  
**Needed:** `catalog:error-remediation` detects pattern → opens ticket or auto-retry with backoff

### 6.5 No Source Discovery

**Current:** `catalog:find` zero-results for a city → recorded as `outcome: zero-result`  
**Needed:** `catalog:source-discovery` analyzes zero-results → suggests new search queries or sources for next campaign

### 6.6 No Debt-Based Triggers

**Current:** `self-heal` reports `emptyMediaWithWebsite: 45` → Cloud Agent sees it → manually runs `media-curate`  
**Needed:** `self-heal` auto-triggers `media-curate` when threshold exceeded

---

## 7. Recommendations for Improvement

### Phase 1: Persist Feedback (Immediate — 1 session)

**Goal:** Stop losing feedback to console logs.

1. **Create `quality_lessons` collection:**
   ```typescript
   interface QualityLesson {
     lessonId: string;
     createdAt: Date;
     vertical: string;
     lessonType: "description-pattern" | "media-pattern" | "geo-pattern" | "contact-pattern";
     pattern: {
       flag: string;          // e.g., "TOO_SHORT"
       occurrences: number;
       samples: Array<{
         listingId: string;
         name: string;
         context: string;
       }>;
     };
     recommendation: string;  // Human-readable
     appliedCount: number;    // How many times this lesson was used
     successRate: number;     // 0-1
   }
   ```

2. **Create `quality_recommendations` collection:**
   ```typescript
   interface QualityRecommendation {
     recommendationId: string;
     createdAt: Date;
     vertical: string;
     status: "open" | "applied" | "rejected" | "expired";
     priority: "high" | "medium" | "low";
     source: "operator-feedback" | "quality-loop" | "override-learning" | "error-pattern";
     
     target: {
       type: "listing" | "card" | "config";
       ids?: string[];        // Specific listings/cards, or null for global
     };
     
     action: {
       type: "improve-description" | "update-config" | "retry-extraction" | "add-source";
       details: Record<string, unknown>;
     };
     
     appliedAt?: Date;
     appliedBy?: string;      // "cloud-agent" | staff email
     outcome?: "success" | "failed" | "partial";
   }
   ```

3. **Update `catalog:quality-loop` to write lessons:**
   - Phase 3 (encode lessons) currently logs to console
   - Change to: `db.collection("quality_lessons").insertMany(lessonDocs)`
   - Return lesson count in report

4. **Update `catalog:self-heal` to read `card_feedback`:**
   - Add `openOperatorFeedback` count to report
   - List top 5 unprocessed feedback items

---

### Phase 2: Create Feedback Processor (High Priority — 2 sessions)

**Goal:** Turn stored feedback into actionable recommendations.

**New Job:** `catalog:feedback-processor`

**Contract:**
```bash
npm run catalog:feedback-processor -- --limit 20 --dry-run
npm run catalog:feedback-processor -- --limit 20
```

**What it does:**
1. Read unprocessed `card_feedback` (no linked recommendation)
2. For each feedback:
   - If `scope: "global"` + `sentiment: "instruction"` → create global recommendation
   - If `scope: "card"` + `sentiment: "negative"` → create card-specific recommendation
   - If `sentiment: "positive"` → mark for lesson encoding (this pattern works)
3. Write to `quality_recommendations` collection
4. Mark feedback as processed (`processedAt`, `recommendationId` link)

**Example:**
- Feedback: "All pool descriptions should mention water temperature"
- Action: Create recommendation → `type: "improve-description"`, `target.ids: [all pools]`, `details: { addFact: "water temperature" }`
- Next `catalog:quality-loop` run reads open recommendations and applies them

---

### Phase 3: Create Lesson Encoder (High Priority — 1 session)

**Goal:** Learn from quality patterns and operator feedback.

**Enhance:** `catalog:quality-loop` (already exists)

**New Phase 3 Implementation:**
1. After scoring, aggregate patterns (already done)
2. **New:** Write patterns to `quality_lessons` collection
3. **New:** On next run, read `quality_lessons` where `appliedCount < 10` (still learning)
4. Apply lessons proactively (e.g., if lesson says "strip phone numbers from About", do it before scoring)

**Example Lesson Flow:**
1. Quality-loop finds 20 listings with `INLINE_PHONE` flag
2. Writes lesson: `{ flag: "INLINE_PHONE", recommendation: "Strip phone from description, move to venue.contact.phone", appliedCount: 0 }`
3. Next run: reads lesson, applies to new listings before they fail quality gate
4. Increment `appliedCount`, track `successRate`
5. When `successRate > 0.8` and `appliedCount > 20` → promote lesson to "trusted rule"

---

### Phase 4: Create Override Learner (Medium Priority — 2 sessions)

**Goal:** Adjust sovereign agent thresholds based on staff overrides.

**New Job:** `catalog:override-learner`

**Contract:**
```bash
npm run catalog:override-learner -- --min-overrides 10 --dry-run
npm run catalog:override-learner -- --min-overrides 10
```

**What it does:**
1. Read `sovereign_decisions` where `override` exists
2. Group by `decisionType` (e.g., "quality-gate")
3. Calculate override rate: `overrides / total decisions`
4. If override rate > 30% for a decision type:
   - Analyze patterns (e.g., "agent rejected 40% of listings with 1-2 images, but staff approved 80%")
   - Create recommendation: `type: "update-config"`, `details: { key: "minImageCount", currentValue: 3, suggestedValue: 1, reason: "Staff overrides 80% of 1-2 image rejections" }`
5. Write to `quality_recommendations` with `priority: "high"`, `source: "override-learning"`

**Human review required:** Config changes should be reviewed before auto-apply (safety).

---

### Phase 5: Create Error Remediation (Medium Priority — 2 sessions)

**Goal:** Detect and remediate recurring cron failures.

**New Job:** `catalog:error-remediation`

**Contract:**
```bash
npm run catalog:error-remediation -- --lookback-hours 24 --dry-run
npm run catalog:error-remediation -- --lookback-hours 24
```

**What it does:**
1. Read `cron_runs` for last 24 hours
2. Detect patterns:
   - Same job fails 3+ times in a row → "chronic failure"
   - Same error message repeats across jobs → "systemic issue"
   - Timeout pattern (e.g., geo backfill always times out) → "resource exhaustion"
3. For each pattern, create recommendation:
   - Chronic failure → `type: "retry-with-backoff"` or `type: "escalate-to-human"`
   - Systemic issue (e.g., MongoDB connection) → `type: "alert"`, `priority: "high"`
   - Resource exhaustion → `type: "reduce-batch-size"`
4. Write to `quality_recommendations`
5. For auto-remediable issues (e.g., retry-with-backoff), apply immediately

**Safety:** Only auto-remediate low-risk actions (retry, reduce batch). Escalate high-risk (config changes).

---

### Phase 6: Create Source Discovery (Low Priority — 3 sessions)

**Goal:** Learn new sources for `catalog:find` from failed attempts.

**New Job:** `catalog:source-discovery`

**Contract:**
```bash
npm run catalog:source-discovery -- --analyze-zero-results --dry-run
npm run catalog:source-discovery -- --analyze-zero-results
```

**What it does:**
1. Read `find_attempts` where `outcome: "zero-result"`
2. For each zero-result:
   - Re-run WebSearch with broader queries
   - Check if new sources exist (e.g., local sports authority websites)
   - If found, create recommendation: `type: "add-source"`, `details: { city, country, newSource: "https://..." }`
3. Write to `quality_recommendations`
4. Next `catalog:find --until-found` run reads recommendations and tries new sources

**Example:**
- Find zero-result for "Debrecen, HU"
- Source-discovery WebSearches "Debrecen sports facilities directory"
- Finds `https://debrecen.hu/sport` (official city site)
- Creates recommendation: "Add debrecen.hu/sport to FIND sources for HU cities"
- Next FIND run checks this site first

---

### Phase 7: Create Debt-Based Triggers (Low Priority — 1 session)

**Goal:** Auto-trigger jobs based on `catalog:self-heal` thresholds.

**Enhance:** `catalog:self-heal` (add `--auto-trigger` flag)

**What it does:**
1. Run status check (already exists)
2. **New:** Check thresholds:
   - `emptyMediaWithWebsite > 40` → trigger `catalog:media-curate --limit 40`
   - `thinDescription > 20` → trigger `catalog:about-curate --limit 20`
   - `openOperatorFeedback > 5` → trigger `catalog:feedback-processor --limit 10`
3. Execute triggered jobs (use `subscribe_timer` to queue them)
4. Report: "Auto-triggered 3 jobs based on debt thresholds"

**Safety:** Only trigger if last run was > 1 hour ago (prevent infinite loops).

---

## 8. Proposed Self-Healing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEEDBACK COLLECTION LAYER                     │
├─────────────────────────────────────────────────────────────────┤
│  • card_feedback (operator notes)                                │
│  • sovereign_decisions (agent decisions + overrides)             │
│  • cron_runs (job outcomes + errors)                             │
│  • quality verdicts (from catalog:quality-loop)                  │
│  • catalog debt (from catalog:self-heal)                         │
│  • find_attempts (zero-results from catalog:find)                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING LAYER (NEW)                        │
├─────────────────────────────────────────────────────────────────┤
│  catalog:feedback-processor    → reads card_feedback             │
│  catalog:quality-loop (Phase 3)→ encodes quality_lessons         │
│  catalog:override-learner      → analyzes sovereign_decisions    │
│  catalog:error-remediation     → monitors cron_runs              │
│  catalog:source-discovery      → mines find_attempts             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RECOMMENDATION LAYER (NEW)                    │
├─────────────────────────────────────────────────────────────────┤
│  • quality_recommendations (actionable tasks)                    │
│  • quality_lessons (learned patterns)                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION LAYER (EXISTING)                    │
├─────────────────────────────────────────────────────────────────┤
│  catalog:quality-loop  (reads recommendations, applies)          │
│  catalog:about-curate  (acts on open recommendations)            │
│  catalog:media-curate  (triggered by debt thresholds)            │
│  catalog:autopilot     (requeues based on lessons)               │
│  catalog:find          (tries new sources from discovery)        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CONTINUOUS LEARNING LOOP                      │
├─────────────────────────────────────────────────────────────────┤
│  1. Execute job (e.g., quality-loop)                             │
│  2. Record outcome (success/partial/failed)                      │
│  3. Update lesson appliedCount + successRate                     │
│  4. If successRate > 0.8 → promote to trusted rule               │
│  5. If successRate < 0.3 → deprecate lesson, open investigation  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Plan

### Immediate (This Session)

1. ✅ **Audit complete** (this document)
2. **Create `quality_lessons` schema** (TypeScript interface)
3. **Create `quality_recommendations` schema** (TypeScript interface)
4. **Update `catalog:self-heal` to read `card_feedback`**
5. **Update `catalog:quality-loop` Phase 3 to write lessons**

### Phase 1 (Next 1-2 Sessions)

6. **Implement `catalog:feedback-processor`**
   - Read `card_feedback`
   - Create recommendations
   - Mark feedback as processed

7. **Test feedback → recommendation flow**
   - Post test feedback via `/api/stats/feedback`
   - Run `catalog:feedback-processor`
   - Verify recommendation created

### Phase 2 (Next 2-3 Sessions)

8. **Implement `catalog:override-learner`**
   - Analyze `sovereign_decisions`
   - Detect override patterns
   - Create config update recommendations

9. **Implement `catalog:error-remediation`**
   - Monitor `cron_runs`
   - Detect chronic failures
   - Auto-retry or escalate

### Phase 3 (Future)

10. **Implement `catalog:source-discovery`**
11. **Add `--auto-trigger` to `catalog:self-heal`**
12. **Deploy timer subscriptions** for new jobs

---

## 10. Success Metrics

After implementing the self-healing loop, track:

1. **Feedback Processing Rate:**
   - `card_feedback` unprocessed count → should trend to 0
   - Time from feedback → recommendation → applied

2. **Lesson Effectiveness:**
   - `quality_lessons` success rate (target: > 0.8)
   - Reduction in quality-loop `needImprovement` count

3. **Override Learning:**
   - Sovereign agent override rate (target: < 10%)
   - Config changes suggested vs applied

4. **Error Remediation:**
   - Chronic cron failures (target: 0 failures > 3 consecutive runs)
   - Auto-remediation success rate

5. **Source Discovery:**
   - Zero-result rate for `catalog:find` (target: < 30%)
   - New sources discovered per month

6. **Autonomous Improvement:**
   - % of recommendations applied without human intervention
   - Time from debt detection → remediation

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| **Infinite loops** (auto-trigger triggers itself) | Rate limiting: max 1 trigger per job per hour |
| **Bad lessons** (wrong pattern learned) | Require `appliedCount > 20` and `successRate > 0.8` before trust |
| **Config drift** (too many auto-adjustments) | Human approval required for `type: "update-config"` recommendations |
| **Feedback spam** (operator writes junk) | Filter by `sentiment` and staff role |
| **Storage bloat** (`quality_lessons` grows unbounded) | TTL: archive lessons > 90 days old with `appliedCount == 0` |

---

## 12. Alignment with SSOT

From `sovereigncontent.messmass.com/jobs#catalog:self-heal`:
> Record process lessons with `--record-process`.

This audit proposes:
- `--record-process` flag for `catalog:self-heal` → writes to `quality_lessons`
- New `catalog:feedback-processor` → SSOT-compliant (Mongo-only, bounded ticks)
- New `catalog:override-learner` → follows SSOT dry-run + bounded-tick pattern
- All new jobs follow `catalog:*` naming convention

**Compliance:** 100% aligned with SSOT principles.

---

## Conclusion

sportolok's sovereign content system has **excellent data collection** but **no action loop**. We log feedback, quality patterns, overrides, and errors, but we don't **process** them into improvements.

**Next step:** Implement Phase 1 (persist feedback + update self-heal) to close the loop.

**Long-term goal:** Fully autonomous self-healing system that learns from every interaction and continuously improves without human intervention.

---

**Prepared by:** Cursor Cloud Agent  
**Status:** Ready for implementation  
**Estimated effort:** 10-12 sessions for full self-healing loop
