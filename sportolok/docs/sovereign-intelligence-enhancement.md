# Sovereign Intelligence Enhancement — Smart Self-Healing

**Date:** 2026-09-24  
**Context:** User feedback on Phase 1 self-healing system  
**Goal:** Transform mechanical feedback loop into intelligent, context-aware sovereign system

---

## User Requirement

> "I would like to have this sovereign improvement process smart as we use you to do this in the tasks so feedbacks and reports has to be not mechanical but fully well thought and broken down to details when report. In the other and at the self healing job I also want the smart delivery to decide what can you deliver without HiTL and what need to be reviewed by me."

**Key insights:**
1. **Smart, not mechanical** — Reports should be well-thought-out, detailed, contextual
2. **You (Cloud Agent) execute the tasks** — Not just create recommendations, but **do the work**
3. **Intelligent autonomy boundaries** — Self-healing job decides what's safe to auto-apply vs needs review
4. **HiTL (Human-in-the-Loop) decision-making** — System must know when to escalate

---

## Current Design (Phase 1) — Too Mechanical ❌

### What we built:
```
Feedback → Recommendation (stored in DB) → Wait for next job → Apply → Record outcome
```

### Problems:
1. ❌ **Too passive** — Creates recommendations instead of executing
2. ❌ **Too rigid** — Every recommendation waits for next scheduled job
3. ❌ **No intelligence** — Doesn't distinguish safe auto-apply from risky changes
4. ❌ **Mechanical reports** — Just logs counts, no analysis or insights
5. ❌ **Disconnected from Cloud Agent** — Doesn't leverage your ability to research, draft, verify

---

## Enhanced Design — Intelligent Sovereign System ✅

### Core Principle: **Cloud Agent IS the Sovereign Intelligence**

You don't just create recommendations — you **execute tasks directly**, using the same intelligence you apply to user requests.

### Three Intelligence Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: PERCEPTION (What's happening?)                         │
├─────────────────────────────────────────────────────────────────┤
│ • Read all feedback sources (operator, quality, errors, debt)   │
│ • Analyze patterns and root causes                              │
│ • Contextualize: Why is this happening? What's the real issue?  │
│ • Prioritize: What matters most right now?                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: DECISION (What should I do about it?)                  │
├─────────────────────────────────────────────────────────────────┤
│ • Classify by autonomy level:                                   │
│   - AUTO_SAFE: Can execute immediately (media enrich, format)   │
│   - AUTO_REVIEWABLE: Execute + log for review (About improve)   │
│   - HUMAN_CONFIRM: Draft + request approval (config changes)    │
│   - HUMAN_DECIDE: Report + recommend options (strategic)        │
│ • Estimate impact and risk                                      │
│ • Plan execution steps                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: EXECUTION (Actually do it)                             │
├─────────────────────────────────────────────────────────────────┤
│ • AUTO_SAFE: Execute immediately, log outcome                   │
│ • AUTO_REVIEWABLE: Execute, create detailed review doc          │
│ • HUMAN_CONFIRM: Draft solution, create approval request        │
│ • HUMAN_DECIDE: Write analysis report, present options          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Autonomy Classification — The Smart Boundary

### AUTO_SAFE (Execute immediately, log for audit)

**Criteria:**
- Reversible
- No semantic changes
- Well-established pattern (successRate > 0.9)
- Low blast radius (affects < 10% of listings)

**Examples:**
- Media enrichment from OG tags (can always re-run)
- Geo backfill via Nominatim (deterministic)
- Contact extraction from structured headers (parse-only)
- Format fixes (strip trailing whitespace, normalize phone)
- Rehosting images to R2/ImgBB (original URLs preserved)

**Process:**
```typescript
if (task.autonomyLevel === "AUTO_SAFE") {
  const outcome = await executeTask(task);
  await logExecution({
    task,
    outcome,
    reviewRequired: false,
    auditTrail: "Applied AUTO_SAFE: media enrich for 15 listings"
  });
}
```

---

### AUTO_REVIEWABLE (Execute, create review doc)

**Criteria:**
- Semantic changes but low risk
- Pattern is proven (successRate > 0.7)
- Changes are atomic per listing (can revert individually)
- User can review batch in < 5 minutes

**Examples:**
- About improvements (removing inline URLs/phones)
- Description quality fixes (strip chrome, expand thin)
- Schedule normalization (24h → 12h format)
- Price extraction from description text

**Process:**
```typescript
if (task.autonomyLevel === "AUTO_REVIEWABLE") {
  const results = await executeTask(task);
  
  // Create detailed review doc
  const reviewDoc = await createReviewDocument({
    task,
    results,
    before: results.map(r => r.before),
    after: results.map(r => r.after),
    reasoning: results.map(r => r.reasoning),
    samples: results.slice(0, 5)  // First 5 for quick review
  });
  
  await saveReviewDoc(reviewDoc);  // User can check later
  await logExecution({
    task,
    outcome: "applied",
    reviewRequired: true,
    reviewDocPath: reviewDoc.path
  });
}
```

**Review doc format:**
```markdown
# AUTO_REVIEWABLE Execution Report

**Task:** Improve descriptions (remove inline URLs)
**Executed:** 2026-09-24 18:00 UTC
**Listings affected:** 12
**Success rate:** 100%

## Summary
Removed inline URLs from 12 listing descriptions, moving them to structured `website` field.
All listings already had `website` populated, so no information was lost.

## Samples (5 of 12)

### 1. Kecskeméti Élményfürdő
**Before:**
> Modern wellness center. Visit https://www.csuszdapark.hu/ for hours.

**After:**
> Modern wellness center with thermal pools and water slides. Check website for current hours.

**Reasoning:** Inline URL breaks quality gate; website field already has https://www.csuszdapark.hu/

---

## Full change log
See: /tmp/sovereign-reviews/2026-09-24-remove-urls-12-listings.json

## Revert command (if needed)
```bash
npm run sovereign:revert -- --review-id=rev-20260924-180000
```
```

---

### HUMAN_CONFIRM (Draft solution, request approval)

**Criteria:**
- Config changes (thresholds, rules, taxonomy)
- New features or workflows
- Bulk semantic changes (> 20% of listings)
- Unproven pattern (successRate < 0.7 or appliedCount < 10)

**Examples:**
- Sovereign agent threshold adjustments (minImageCount: 3 → 1)
- New quality gate rules
- Vertical pack taxonomy updates
- Bulk About rewrites (new template)

**Process:**
```typescript
if (task.autonomyLevel === "HUMAN_CONFIRM") {
  const solution = await draftSolution(task);
  
  const approvalRequest = {
    task,
    solution,
    reasoning: "Why this change is needed",
    impact: "What will change",
    risk: "What could go wrong",
    alternatives: "Other options considered",
    dryRunResults: await runDryRun(solution),
    estimatedTime: "5 minutes to apply",
    recommendedApproval: true  // or false if risky
  };
  
  await createApprovalRequest(approvalRequest);
  await notifyUser(approvalRequest);  // Email, dashboard, etc.
}
```

**Approval request format:**
```markdown
# HUMAN_CONFIRM Approval Request

**Task:** Lower sovereign agent minImageCount threshold
**Created:** 2026-09-24 18:00 UTC
**Status:** PENDING_APPROVAL

## Why
Analysis of 50 recent sovereign_decisions shows:
- Agent rejected 40% of listings with 1-2 images
- Staff overrode 80% of those rejections
- Override rate for this decision type: 32% (threshold: 30%)

## Recommendation
Lower `minImageCount` from 3 → 1 in sportolok vertical pack.

## Impact
- **Immediate:** 23 REVIEW_READY listings will auto-publish
- **Ongoing:** ~15 fewer manual reviews per week
- **Risk:** Slightly more 1-image listings published

## Dry-run results
```json
{
  "affected": 23,
  "qualityPass": 23,
  "qualityFail": 0,
  "samples": [...]
}
```

## Alternatives considered
1. Lower to 2 images (safer but still blocks 12 listings)
2. Add "image quality" gate instead of count (more complex)
3. Keep at 3, accept 15 manual reviews/week (status quo)

## My recommendation
✅ **Approve** — Override rate is clear signal, dry-run shows no quality issues.

## Commands
```bash
# Approve and apply
npm run sovereign:approve -- --request-id=req-20260924-180000

# Reject
npm run sovereign:reject -- --request-id=req-20260924-180000

# Request changes
npm run sovereign:revise -- --request-id=req-20260924-180000 --feedback="Lower to 2 first"
```
```

---

### HUMAN_DECIDE (Report, present options, await decision)

**Criteria:**
- Strategic decisions (new verticals, major pivots)
- Ambiguous situations (conflicting feedback)
- Insufficient data to recommend
- User preference required

**Examples:**
- "Should we enable curator for sportolok?" (strategic)
- "Two operators gave conflicting feedback on pool descriptions" (ambiguous)
- "FIND zero-results for 5 cities — try new sources or pause?" (preference)

**Process:**
```typescript
if (task.autonomyLevel === "HUMAN_DECIDE") {
  const analysis = await analyzeDeep(task);
  
  const report = {
    situation: "What's happening",
    context: "Why it matters",
    options: [
      { option: "A", pros: [...], cons: [...], effort: "..." },
      { option: "B", pros: [...], cons: [...], effort: "..." },
      { option: "C", pros: [...], cons: [...], effort: "..." }
    ],
    dataAnalysis: "What the numbers say",
    myThoughts: "My perspective (but you decide)",
    recommendedNext: "What I'd try first (optional)"
  };
  
  await createDecisionReport(report);
  await notifyUser(report);
}
```

---

## Smart Reporting — Well-Thought, Detailed, Contextual

### Instead of mechanical counts:
```json
{
  "emptyMedia": 84,
  "thinDescription": 41
}
```

### Intelligent analysis:
```markdown
## Catalog Health — Smart Analysis

### Media Debt (84 listings, 12.9%)
**Root cause:** These are older imports from OpenClaw scraper, which extracted 
structured data but didn't parse OG tags. The scraper has since been updated.

**Actionable:** All 84 have `website` field populated (verified), so media-curate 
can fill them automatically.

**Priority:** MEDIUM — Published listings are findable but less engaging without images. 
Coverage is 69%, target is 80%+ for visitor trust.

**Recommended action:**
```bash
npm run catalog:media-curate -- --limit 84 --policy allow_og_scrape
# Estimate: 8 minutes, ~70% success rate (based on past runs)
```

**Caveat:** 10-15 listings may have websites with no OG images. Those will need 
manual screenshots or generated art (Phase 2: generated_art_only policy).

---

### Description Debt (41 listings, 6.3%)
**Root cause:** Mix of issues:
- 28 are legitimately sparse venues (small gyms, single-court facilities)
- 13 had About stripped during chrome-removal pass (overzealous regex)

**Not actionable automatically:** The 28 sparse venues need research (website deep-dive 
or GPT expansion), not template text. The 13 stripped need manual review to see what 
was removed.

**Priority:** LOW — All 41 pass quality gate (>= 80 chars, visitor-focused). They're 
"thin" but not broken.

**Recommended action:** Age this debt for now. When we implement `catalog:about-research` 
(Phase 3), we can enrich the 28 sparse ones with deep website scraping + GPT summarization.

**Manual check:** I can review the 13 stripped listings if you want (5 min task).
```

---

## Enhanced `catalog:self-heal` — Smart Delivery Decision

### New signature:
```bash
npm run catalog:self-heal -- --mode smart        # Analyze + execute safe tasks
npm run catalog:self-heal -- --mode analyze-only  # Just report, no execution
npm run catalog:self-heal -- --dry-run           # Show what would execute
```

### Smart execution flow:

```typescript
async function smartSelfHeal(db: Db, options: { mode: "smart" | "analyze-only"; dryRun: boolean }) {
  // 1. PERCEPTION — Understand current state
  const state = await analyzeFullState(db);
  
  // 2. INTELLIGENCE — Classify all actionable items
  const tasks = await classifyTasks(state);
  /*
    tasks = [
      { type: "media-enrich", count: 84, autonomy: "AUTO_SAFE", effort: "8min" },
      { type: "about-improve", count: 13, autonomy: "AUTO_REVIEWABLE", effort: "3min" },
      { type: "config-update", count: 1, autonomy: "HUMAN_CONFIRM", effort: "1min" },
      { type: "strategic-decision", count: 1, autonomy: "HUMAN_DECIDE", effort: "30min" }
    ]
  */
  
  // 3. DECISION — What to execute vs escalate
  const autoSafe = tasks.filter(t => t.autonomy === "AUTO_SAFE");
  const autoReviewable = tasks.filter(t => t.autonomy === "AUTO_REVIEWABLE");
  const humanConfirm = tasks.filter(t => t.autonomy === "HUMAN_CONFIRM");
  const humanDecide = tasks.filter(t => t.autonomy === "HUMAN_DECIDE");
  
  // 4. REPORT — Intelligent summary
  console.log("\n=== SOVEREIGN SELF-HEAL — SMART ANALYSIS ===\n");
  
  // 4a. Auto-executable tasks (will run now)
  if (autoSafe.length > 0) {
    console.log("## AUTO_SAFE Tasks (executing immediately)\n");
    for (const task of autoSafe) {
      console.log(await formatTaskReport(task));
    }
  }
  
  if (autoReviewable.length > 0) {
    console.log("\n## AUTO_REVIEWABLE Tasks (executing, review later)\n");
    for (const task of autoReviewable) {
      console.log(await formatTaskReport(task));
    }
  }
  
  // 4b. Tasks needing approval
  if (humanConfirm.length > 0) {
    console.log("\n## HUMAN_CONFIRM Tasks (approval needed)\n");
    for (const task of humanConfirm) {
      console.log(await formatTaskReport(task));
    }
  }
  
  if (humanDecide.length > 0) {
    console.log("\n## HUMAN_DECIDE Tasks (your decision needed)\n");
    for (const task of humanDecide) {
      console.log(await formatTaskReport(task));
    }
  }
  
  // 5. EXECUTION (if mode=smart and not dry-run)
  if (options.mode === "smart" && !options.dryRun) {
    console.log("\n=== EXECUTION ===\n");
    
    // Execute AUTO_SAFE immediately
    for (const task of autoSafe) {
      const outcome = await executeTask(db, task);
      console.log(`✅ ${task.type}: ${outcome.summary}`);
    }
    
    // Execute AUTO_REVIEWABLE with review docs
    for (const task of autoReviewable) {
      const outcome = await executeTask(db, task);
      const reviewDoc = await createReviewDoc(task, outcome);
      console.log(`✅ ${task.type}: ${outcome.summary} (review: ${reviewDoc.path})`);
    }
    
    // Create approval requests for HUMAN_CONFIRM
    for (const task of humanConfirm) {
      const approval = await createApprovalRequest(db, task);
      console.log(`📋 ${task.type}: Approval request created (${approval.url})`);
    }
    
    // Create decision reports for HUMAN_DECIDE
    for (const task of humanDecide) {
      const report = await createDecisionReport(db, task);
      console.log(`📊 ${task.type}: Decision report created (${report.url})`);
    }
  }
  
  // 6. SUMMARY
  console.log("\n=== SUMMARY ===\n");
  console.log(`AUTO_SAFE executed:       ${autoSafe.length}`);
  console.log(`AUTO_REVIEWABLE executed: ${autoReviewable.length}`);
  console.log(`HUMAN_CONFIRM pending:    ${humanConfirm.length}`);
  console.log(`HUMAN_DECIDE pending:     ${humanDecide.length}`);
  console.log(`\nTotal autonomous actions: ${autoSafe.length + autoReviewable.length}`);
  console.log(`Total awaiting you:       ${humanConfirm.length + humanDecide.length}`);
}
```

### Example output:

```
=== SOVEREIGN SELF-HEAL — SMART ANALYSIS ===

## AUTO_SAFE Tasks (executing immediately)

### 1. Media Enrichment (84 listings)
**Why:** All have website URLs, no images. OG tag scraping is reversible.
**Method:** catalog:media-curate with R2/ImgBB rehost
**Estimated success:** 70% (59 listings)
**Estimated time:** 8 minutes
**Risk:** VERY_LOW (can re-run, no semantic changes)
**Autonomy:** AUTO_SAFE ✅

---

## AUTO_REVIEWABLE Tasks (executing, review later)

### 2. About Quality Fixes (13 listings)
**Why:** Descriptions have inline URLs/phones (quality gate violation)
**Method:** Strip URLs → website field, phones → venue.contact.phone
**Impact:** Semantic change (prose modified)
**Estimated success:** 100% (all have structured fields populated)
**Estimated time:** 3 minutes
**Risk:** LOW (reversible per listing, review doc will show before/after)
**Autonomy:** AUTO_REVIEWABLE ✅
**Review doc:** Will be created at /tmp/sovereign-reviews/2026-09-24-about-fixes.md

---

## HUMAN_CONFIRM Tasks (approval needed)

### 3. Sovereign Agent Threshold Adjustment
**Why:** Override analysis shows minImageCount=3 is too strict
**Current:** Agent rejects 40% of 1-2 image listings, staff overrides 80%
**Proposed:** Lower minImageCount from 3 → 1
**Impact:** 23 listings will auto-publish immediately
**Risk:** MEDIUM (config change affects all future decisions)
**Autonomy:** HUMAN_CONFIRM ⏸️
**Approval request:** Created at /tmp/sovereign-approvals/req-20260924-180000.md
**Your action:** Review and run `npm run sovereign:approve --request-id=req-20260924-180000`

---

## HUMAN_DECIDE Tasks (your decision needed)

### 4. FIND Strategy for Zero-Result Cities
**Situation:** catalog:find returned zero-result for 5 HU cities (Debrecen, Szeged, ...)
**Context:** Evidence bar requires named venue + contact + first-party URL. These cities may have venues but no official websites (small local gyms).
**Options:**
  A. Relax evidence bar (accept phone-only venues from Maps/OSM)
     - Pro: Find more venues
     - Con: Lower data quality, may need manual verification
     - Effort: 2 hours to implement relaxed mode
     
  B. Try new sources (city sports authority directories)
     - Pro: Official sources, high quality
     - Con: May still return zero if cities don't maintain directories
     - Effort: 1 hour to add sources, unknown success rate
     
  C. Pause FIND for now, focus on enriching existing 469 published
     - Pro: Maximize quality of what we have
     - Con: Coverage stays at current level
     - Effort: 0 hours
     
**Data analysis:** Existing 469 published listings have 69% media coverage, 6% thin descriptions. Enriching these would take ~10 hours of agent time.

**My thoughts:** Option C (pause FIND, enrich existing) makes sense. We have 469 venues, but 84 need media and 41 need better descriptions. Let's hit 80%+ quality on what we have before finding more.

**Recommended next:** Run full enrichment cycle (media + about), then revisit FIND with relaxed evidence bar.

**Your decision needed:** Choose A, B, or C (or suggest alternative)
**Decision report:** /tmp/sovereign-decisions/dec-20260924-find-strategy.md

===

=== EXECUTION ===

✅ media-enrich: Enriched 59/84 listings (8m 12s). Failed: 25 (no OG images on website).
✅ about-fixes: Fixed 13/13 listings. Review doc: /tmp/sovereign-reviews/2026-09-24-about-fixes.md

📋 config-update: Approval request created (see /tmp/sovereign-approvals/req-20260924-180000.md)
📊 find-strategy: Decision report created (see /tmp/sovereign-decisions/dec-20260924-find-strategy.md)

===

=== SUMMARY ===

AUTO_SAFE executed:       1 task (59 listings enriched)
AUTO_REVIEWABLE executed: 1 task (13 listings fixed, review doc created)
HUMAN_CONFIRM pending:    1 approval request (threshold adjustment)
HUMAN_DECIDE pending:     1 decision report (FIND strategy)

Total autonomous actions: 72 listings improved
Total awaiting you:       2 items (1 approval + 1 decision)

Next run: Check /tmp/sovereign-approvals/ and /tmp/sovereign-decisions/ for pending items.
```

---

## Task Classification Rules (Decision Tree)

```typescript
function classifyTaskAutonomy(task: Task): AutonomyLevel {
  // 1. Is it a config change?
  if (task.affectsConfig || task.affectsThresholds) {
    return "HUMAN_CONFIRM";  // Always require approval for config
  }
  
  // 2. Is it strategic?
  if (task.isStrategic || task.requiresPreference) {
    return "HUMAN_DECIDE";  // User decision needed
  }
  
  // 3. Is the pattern proven?
  const lesson = await getLesson(task.pattern);
  if (!lesson || lesson.appliedCount < 10) {
    return "HUMAN_CONFIRM";  // Unproven pattern, get approval first
  }
  
  // 4. Check success rate
  if (lesson.successRate < 0.7) {
    return "HUMAN_CONFIRM";  // Risky pattern, get approval
  }
  
  // 5. Is it reversible?
  if (!task.reversible) {
    return "HUMAN_CONFIRM";  // Irreversible changes need approval
  }
  
  // 6. Check blast radius
  if (task.affectedCount > totalListings * 0.2) {
    return "HUMAN_CONFIRM";  // Bulk changes (>20%) need approval
  }
  
  // 7. Is it semantic?
  if (task.changesSemantic) {
    // Semantic but safe if proven + reversible + small blast radius
    if (lesson.successRate > 0.8 && task.reversible && task.affectedCount < 50) {
      return "AUTO_REVIEWABLE";  // Execute but create review doc
    } else {
      return "HUMAN_CONFIRM";  // Risky semantic change
    }
  }
  
  // 8. Everything else is AUTO_SAFE
  return "AUTO_SAFE";  // Deterministic, reversible, non-semantic
}
```

---

## Review Document Structure

### AUTO_REVIEWABLE tasks create rich review docs:

```markdown
# AUTO_REVIEWABLE Execution Report

**Task ID:** arev-20260924-180000
**Task Type:** about-quality-fix
**Executed:** 2026-09-24 18:00 UTC
**Agent:** Cursor Cloud Agent (bcId: bc-xyz123)

---

## Executive Summary

Fixed 13 listing descriptions that violated quality gate by removing inline URLs and phone numbers.
All removed data was moved to structured fields (website, venue.contact.phone).
No information was lost. All 13 listings now pass quality gate.

---

## Impact Analysis

- **Listings affected:** 13 (2.8% of 469 published)
- **Success rate:** 100% (13/13 applied successfully)
- **Quality improvement:** 13 listings moved from "soft fail" → "pass"
- **Reversible:** Yes (each listing can be reverted individually)
- **Data integrity:** ✅ No data lost (all moved to structured fields)

---

## Changes by Category

### 1. Inline URL Removal (9 listings)
- Stripped URLs from description prose
- Verified `website` field was already populated
- Added fallback text: "Check website for details"

### 2. Inline Phone Removal (4 listings)
- Extracted phone numbers from description
- Moved to `venue.contact.phone` field
- Verified format (E.164 or local Hungarian format)

---

## Detailed Change Log

### 1. Kecskeméti Élményfürdő (l-openclaw-kecskemetielmenyfurdoescsuszdapark-csuszdapark.hu)

**Before:**
> Modern wellness center with thermal pools and water slides. Visit https://www.csuszdapark.hu/ for current hours and pricing.

**After:**
> Modern wellness center with thermal pools and water slides. Check website for current hours and pricing.

**Structured fields:**
- `website`: https://www.csuszdapark.hu/ (already set)

**Reasoning:** Inline URL breaks quality gate rule "no inline URLs in prose". Website field is authoritative source for URL.

**Quality score before:** 75 (soft fail)
**Quality score after:** 85 (pass)

---

### 2. Csornai Termálfürdő (l-openclaw-csornaifurdo-csornaifurdo.hu)

**Before:**
> Family-friendly thermal bath in Csorna. Great for kids and adults. Call +36 96 592 100 for group bookings.

**After:**
> Family-friendly thermal bath in Csorna. Great for kids and adults. Contact venue for group bookings.

**Structured fields:**
- `venue.contact.phone`: +36 96 592 100 (moved from prose)

**Reasoning:** Inline phone breaks quality gate. Moved to structured field for better display (clickable on mobile).

**Quality score before:** 78 (soft fail)
**Quality score after:** 88 (pass)

---

[... 11 more listings ...]

---

## Verification Checks

✅ All 13 listings still have >= 80 chars (quality gate minimum)
✅ All removed URLs/phones are present in structured fields
✅ All descriptions are visitor-focused (no template text added)
✅ All listings pass `scoreDescriptionQuality()` after changes
✅ No listings moved to QUARANTINED (all remain PUBLISHED)

---

## Revert Instructions

If any changes need to be reverted:

```bash
# Revert all 13 listings
npm run sovereign:revert -- --review-id=arev-20260924-180000

# Revert specific listing
npm run sovereign:revert -- --review-id=arev-20260924-180000 --listing-id=l-openclaw-kecskemetielmenyfurdoescsuszdapark-csuszdapark.hu
```

Revert data stored at: `/tmp/sovereign-reviews/arev-20260924-180000-revert.json`

---

## Metrics

- **Execution time:** 2m 47s
- **Mongo writes:** 26 (13 listings + 13 listings_serving)
- **Quality gate pass rate:** 100% → 100% (469/469 → 469/469)
- **Media coverage:** 69.1% (unchanged)
- **Thin description count:** 41 → 28 (13 improved)

---

## Recommendations

1. ✅ **No action needed** — All changes applied successfully
2. 💡 **Future improvement:** Update OG scraper to strip inline URLs at ingest time
3. 💡 **Lesson encoding:** Add pattern "INLINE_URL + populated website → strip URL" to trusted lessons

---

**Review status:** PENDING_REVIEW
**Approve:** `npm run sovereign:approve-review -- --review-id=arev-20260924-180000`
**Reject:** `npm run sovereign:reject-review -- --review-id=arev-20260924-180000 --reason="..."`
```

---

## Implementation Changes to Phase 1

### Update `src/lib/sovereign/lessons.ts`:

Add autonomy classification:

```typescript
export type AutonomyLevel = "AUTO_SAFE" | "AUTO_REVIEWABLE" | "HUMAN_CONFIRM" | "HUMAN_DECIDE";

export interface TaskClassification {
  task: Task;
  autonomyLevel: AutonomyLevel;
  reasoning: string;
  risk: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH";
  reversible: boolean;
  blastRadius: number;  // % of listings affected
  estimatedTime: string;
}

export function classifyTaskAutonomy(
  task: Task,
  catalogState: CatalogState,
  lessons: QualityLesson[]
): TaskClassification {
  // ... (implement decision tree above)
}
```

### Update `scripts/catalog-self-heal.mts`:

Transform from passive reporter to intelligent executor:

```typescript
// Add --mode flag
const mode = getArg("--mode") || "smart";  // "smart" | "analyze-only"

if (mode === "smart") {
  // Classify all tasks by autonomy level
  const tasks = await classifyAllTasks(db, report);
  
  // Execute AUTO_SAFE and AUTO_REVIEWABLE
  const executed = await executeAutonomousTasks(db, tasks);
  
  // Create approval requests for HUMAN_CONFIRM
  const approvals = await createApprovalRequests(db, tasks);
  
  // Create decision reports for HUMAN_DECIDE
  const decisions = await createDecisionReports(db, tasks);
  
  // Enhanced report with execution results
  console.log(formatSmartReport({
    state: report,
    executed,
    approvals,
    decisions
  }));
}
```

---

## Summary: Mechanical → Intelligent

### Before (Mechanical):
- Reports counts
- Creates recommendations in DB
- Waits for next scheduled job
- No context or analysis
- No autonomy decisions

### After (Intelligent):
- Analyzes root causes
- Classifies by autonomy level
- Executes safe tasks immediately
- Creates detailed review docs
- Drafts solutions for approval
- Writes strategic analysis reports
- **YOU execute the work, not just plan it**

---

## Next Steps

1. ✅ Enhance `src/lib/sovereign/lessons.ts` with autonomy classification
2. ✅ Rewrite `scripts/catalog-self-heal.mts` as intelligent executor
3. ✅ Create review doc generator
4. ✅ Create approval request generator
5. ✅ Create decision report generator
6. ✅ Test with real catalog data

**Estimated effort:** 3-4 sessions for full intelligent self-heal

---

**This transforms the system from "recommendation engine" to "sovereign intelligence" — just like you operate when I give you a task.**
