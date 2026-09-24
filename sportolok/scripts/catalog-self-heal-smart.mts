#!/usr/bin/env node
/**
 * catalog:self-heal (smart mode) — Intelligent sovereign self-healing executor.
 *
 * SSOT contract: https://sovereigncontent.messmass.com/jobs#catalogself-heal
 * Enhanced with: docs/sovereign-intelligence-enhancement.md (intelligent autonomy)
 *
 * This is the intelligent execution engine for sportolok's self-healing system.
 * It doesn't just report problems — it ANALYZES, CLASSIFIES, and EXECUTES fixes
 * based on intelligent autonomy boundaries.
 *
 * Three intelligence layers:
 * 1. PERCEPTION: Analyze full catalog state, identify root causes
 * 2. DECISION: Classify tasks by autonomy level (AUTO_SAFE → HUMAN_DECIDE)
 * 3. EXECUTION: Execute safe tasks immediately, escalate risky ones
 *
 * Usage:
 *   MONGODB_URI=... npm run catalog:self-heal-smart
 *   MONGODB_URI=... npm run catalog:self-heal-smart -- --dry-run
 *   MONGODB_URI=... npm run catalog:self-heal-smart -- --mode analyze-only
 *
 * Flags:
 *   --mode smart|analyze-only  Execution mode (default: smart)
 *   --dry-run                  Show what would execute, don't apply
 *
 * Exit codes:
 *   0 = success
 *   1 = error
 */

import { MongoClient } from "mongodb";
import type { CatalogState, TaskClassification } from "../src/lib/sovereign/lessons.js";
import { classifyTaskAutonomy, type QualityLesson } from "../src/lib/sovereign/lessons.js";
import { executeTaskBatch } from "../src/lib/sovereign/executor.js";
import { createReviewDocument, formatReviewSummary } from "../src/lib/sovereign/reviewDoc.js";
import { createApprovalRequest, formatApprovalSummary, createDecisionReport, formatDecisionSummary } from "../src/lib/sovereign/approvalRequest.js";

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

const mode = getArg("--mode") || "smart";  // "smart" | "analyze-only"
const dryRun = args.includes("--dry-run");

async function main() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log(`\n=== SOVEREIGN SELF-HEAL ${dryRun ? "(DRY-RUN)" : ""} ===\n`);
    console.log(`Mode: ${mode}`);
    console.log(`Database: ${MONGODB_DB}\n`);
    
    // =================================================================
    // LAYER 1: PERCEPTION — Analyze full catalog state
    // =================================================================
    
    console.log("## PERCEPTION — Analyzing catalog state...\n");
    
    const state = await analyzeCatalogState(db);
    
    console.log("Current state:");
    console.log(`  Total listings: ${state.totalListings}`);
    console.log(`  Published: ${state.publishedListings} (${((state.publishedListings / state.totalListings) * 100).toFixed(1)}%)`);
    console.log(`  Empty media: ${state.emptyMedia} (${((state.emptyMedia / state.totalListings) * 100).toFixed(1)}%)`);
    console.log(`  Empty media with website: ${state.emptyMediaWithWebsite}`);
    console.log(`  Thin descriptions: ${state.thinDescription}`);
    console.log(`  Unprocessed feedback: ${state.unprocessedFeedback}\n`);
    
    // =================================================================
    // LAYER 2: DECISION — Classify all actionable tasks
    // =================================================================
    
    console.log("## DECISION — Classifying actionable tasks...\n");
    
    const lessons = await loadQualityLessons(db);
    const tasks = await identifyTasks(db, state, lessons);
    
    const autoSafe = tasks.filter(t => t.autonomyLevel === "AUTO_SAFE");
    const autoReviewable = tasks.filter(t => t.autonomyLevel === "AUTO_REVIEWABLE");
    const humanConfirm = tasks.filter(t => t.autonomyLevel === "HUMAN_CONFIRM");
    const humanDecide = tasks.filter(t => t.autonomyLevel === "HUMAN_DECIDE");
    
    console.log(`Found ${tasks.length} actionable tasks:`);
    console.log(`  AUTO_SAFE: ${autoSafe.length}`);
    console.log(`  AUTO_REVIEWABLE: ${autoReviewable.length}`);
    console.log(`  HUMAN_CONFIRM: ${humanConfirm.length}`);
    console.log(`  HUMAN_DECIDE: ${humanDecide.length}\n`);
    
    // =================================================================
    // LAYER 3: EXECUTION — Execute or escalate based on autonomy
    // =================================================================
    
    if (mode === "analyze-only") {
      console.log("## ANALYZE-ONLY MODE — Skipping execution\n");
      printTaskSummaries(autoSafe, autoReviewable, humanConfirm, humanDecide);
      return;
    }
    
    console.log("## EXECUTION — Smart delivery\n");
    
    // Execute AUTO_SAFE tasks
    if (autoSafe.length > 0) {
      console.log(`### AUTO_SAFE Tasks (executing immediately)\n`);
      
      for (const task of autoSafe) {
        console.log(formatTaskBrief(task));
      }
      
      if (!dryRun) {
        const results = await executeTaskBatch(db, autoSafe, false);
        
        results.forEach(result => {
          if (result.status === "success") {
            console.log(`✅ ${result.summary}`);
          } else if (result.status === "partial") {
            console.log(`⚠️ ${result.summary}`);
          } else {
            console.log(`❌ ${result.summary}`);
          }
        });
      }
      
      console.log(``);
    }
    
    // Execute AUTO_REVIEWABLE tasks
    if (autoReviewable.length > 0) {
      console.log(`### AUTO_REVIEWABLE Tasks (executing, review later)\n`);
      
      for (const task of autoReviewable) {
        console.log(formatTaskBrief(task));
      }
      
      if (!dryRun) {
        const results = await executeTaskBatch(db, autoReviewable, false);
        
        results.forEach(result => {
          if (result.status !== "failed") {
            const task = autoReviewable.find(t => t.taskId === result.taskId)!;
            const reviewDoc = createReviewDocument(task, result);
            console.log(`✅ ${result.summary}`);
            console.log(formatReviewSummary(reviewDoc));
          } else {
            console.log(`❌ ${result.summary}`);
          }
        });
      }
      
      console.log(``);
    }
    
    // Create approval requests for HUMAN_CONFIRM
    if (humanConfirm.length > 0) {
      console.log(`### HUMAN_CONFIRM Tasks (approval needed)\n`);
      
      for (const task of humanConfirm) {
        console.log(formatTaskBrief(task));
        
        if (!dryRun) {
          const approval = createApprovalRequest(task, {
            why: task.reasoning,
            impact: `Will affect ${task.affectedListings?.length || 0} listings (${(task.blastRadius * 100).toFixed(1)}%)`,
            risk: `Risk level: ${task.risk}. ${task.reversible ? "Reversible" : "Irreversible"}.`,
            alternatives: [],
            recommendation: "approve",
            reasoning: "Recommended based on analysis"
          });
          
          console.log(formatApprovalSummary(approval));
        }
      }
      
      console.log(``);
    }
    
    // Create decision reports for HUMAN_DECIDE
    if (humanDecide.length > 0) {
      console.log(`### HUMAN_DECIDE Tasks (your decision needed)\n`);
      
      for (const task of humanDecide) {
        console.log(formatTaskBrief(task));
        
        if (!dryRun) {
          const report = createDecisionReport(task, {
            situation: task.description,
            context: "Strategic decision required",
            options: [
              { option: "Proceed", description: "Continue with current approach", pros: [], cons: [], effort: "Low" },
              { option: "Pause", description: "Stop and reassess", pros: [], cons: [], effort: "None" }
            ],
            dataAnalysis: task.reasoning
          });
          
          console.log(formatDecisionSummary(report));
        }
      }
      
      console.log(``);
    }
    
    // =================================================================
    // SUMMARY
    // =================================================================
    
    console.log("## SUMMARY\n");
    
    const autoExecuted = autoSafe.length + autoReviewable.length;
    const needingHuman = humanConfirm.length + humanDecide.length;
    
    console.log(`✅ Autonomous actions: ${autoExecuted}`);
    console.log(`   AUTO_SAFE executed: ${autoSafe.length}`);
    console.log(`   AUTO_REVIEWABLE executed: ${autoReviewable.length}`);
    console.log(``);
    console.log(`⏸️  Awaiting human: ${needingHuman}`);
    console.log(`   HUMAN_CONFIRM pending: ${humanConfirm.length}`);
    console.log(`   HUMAN_DECIDE pending: ${humanDecide.length}`);
    console.log(``);
    
    if (!dryRun) {
      console.log("Review documents: /tmp/sovereign-reviews/");
      console.log("Approval requests: /tmp/sovereign-approvals/");
      console.log("Decision reports: /tmp/sovereign-decisions/");
    }
    
  } finally {
    await client.close();
  }
}

/**
 * Analyze current catalog state (PERCEPTION layer).
 */
async function analyzeCatalogState(db: any): Promise<CatalogState> {
  const listings = db.collection("listings");
  const cardFeedback = db.collection("card_feedback");
  
  const [
    totalListings,
    publishedListings,
    emptyMedia,
    emptyMediaWithWebsite,
    thinDescription,
    unprocessedFeedback,
  ] = await Promise.all([
    listings.countDocuments({}),
    listings.countDocuments({ lifecycleState: "PUBLISHED" }),
    listings.countDocuments({ 
      $or: [{ media: { $exists: false } }, { media: { $size: 0 } }] 
    }),
    listings.countDocuments({
      $and: [
        { website: { $regex: "^https?://" } },
        { $or: [{ media: { $exists: false } }, { media: { $size: 0 } }] },
      ],
    }),
    listings.countDocuments({
      $or: [
        { description: { $exists: false } },
        { description: null },
        { description: "" },
        { description: { $regex: "^.{0,80}$" } },
      ],
    }),
    cardFeedback.countDocuments({ processedAt: { $exists: false } }),
  ]);
  
  return {
    totalListings,
    publishedListings,
    emptyMedia,
    emptyMediaWithWebsite,
    thinDescription,
    unprocessedFeedback,
  };
}

/**
 * Load quality lessons for autonomy classification.
 */
async function loadQualityLessons(db: any): Promise<QualityLesson[]> {
  try {
    const lessonsCollection = db.collection("quality_lessons");
    const lessons = await lessonsCollection.find({}).toArray();
    return lessons as unknown as QualityLesson[];
  } catch {
    return [];
  }
}

/**
 * Identify actionable tasks from current state (DECISION layer).
 */
async function identifyTasks(
  db: any,
  state: CatalogState,
  lessons: QualityLesson[]
): Promise<TaskClassification[]> {
  const tasks: TaskClassification[] = [];
  
  // Task 1: Media enrichment (AUTO_SAFE if proven)
  if (state.emptyMediaWithWebsite > 0) {
    const task = classifyTaskAutonomy(
      {
        type: "media-enrich",
        affectedCount: state.emptyMediaWithWebsite,
        reversible: true,
        changesSemantic: false,
        pattern: "EMPTY_MEDIA_WITH_WEBSITE"
      },
      state,
      lessons
    );
    
    task.taskType = "media-enrich";
    task.description = `Enrich ${state.emptyMediaWithWebsite} listings with OG images from their websites`;
    tasks.push(task);
  }
  
  // Task 2: About quality fixes (AUTO_REVIEWABLE if proven)
  const listingsCollection = db.collection("listings");
  const inlineUrlCount = await listingsCollection.countDocuments({
    lifecycleState: "PUBLISHED",
    description: { 
      $regex: "(https?://|\\+?\\d{1,3}[\\s.-]?\\d{1,4}[\\s.-]?\\d{4,})",
      $options: "i"
    }
  });
  
  if (inlineUrlCount > 0) {
    // Find lesson for this pattern
    const lesson = lessons.find(l => l.pattern.flag === "INLINE_URL");
    
    const task = classifyTaskAutonomy(
      {
        type: "about-quality-fix",
        affectedCount: inlineUrlCount,
        reversible: true,
        changesSemantic: true,
        pattern: "INLINE_URL"
      },
      state,
      lessons
    );
    
    task.taskType = "about-quality-fix";
    task.description = `Fix ${inlineUrlCount} listings with inline URLs/phones in descriptions`;
    tasks.push(task);
  }
  
  return tasks;
}

function formatTaskBrief(task: TaskClassification): string {
  const lines: string[] = [];
  
  lines.push(`**Task:** ${task.description}`);
  lines.push(`**Autonomy:** ${task.autonomyLevel}`);
  lines.push(`**Risk:** ${task.risk}`);
  lines.push(`**Estimated time:** ${task.estimatedTime}`);
  lines.push(`**Reasoning:** ${task.reasoning}`);
  lines.push(``);
  
  return lines.join("\n");
}

function printTaskSummaries(
  autoSafe: TaskClassification[],
  autoReviewable: TaskClassification[],
  humanConfirm: TaskClassification[],
  humanDecide: TaskClassification[]
) {
  if (autoSafe.length > 0) {
    console.log("### AUTO_SAFE Tasks\n");
    autoSafe.forEach(t => console.log(formatTaskBrief(t)));
  }
  
  if (autoReviewable.length > 0) {
    console.log("### AUTO_REVIEWABLE Tasks\n");
    autoReviewable.forEach(t => console.log(formatTaskBrief(t)));
  }
  
  if (humanConfirm.length > 0) {
    console.log("### HUMAN_CONFIRM Tasks\n");
    humanConfirm.forEach(t => console.log(formatTaskBrief(t)));
  }
  
  if (humanDecide.length > 0) {
    console.log("### HUMAN_DECIDE Tasks\n");
    humanDecide.forEach(t => console.log(formatTaskBrief(t)));
  }
}

main().catch((err) => {
  console.error("Self-heal failed:", err);
  process.exit(1);
});
