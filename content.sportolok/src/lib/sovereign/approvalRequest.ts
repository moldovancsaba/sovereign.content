/**
 * Approval request generator — Creates approval requests for HUMAN_CONFIRM tasks.
 *
 * When Cloud Agent encounters tasks that need human approval (config changes,
 * unproven patterns, bulk changes), it creates a detailed approval request with:
 *
 * - Why this change is needed (data analysis)
 * - What will change (impact assessment)
 * - Risk analysis (what could go wrong)
 * - Alternatives considered
 * - Dry-run results
 * - Agent's recommendation (approve/reject/revise)
 *
 * Design: Give user all info needed to make informed decision in < 2 minutes.
 */

import type { TaskClassification } from "./lessons.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface ApprovalRequest {
  requestId: string;
  taskId: string;
  createdAt: Date;
  status: "pending" | "approved" | "rejected" | "revision-requested";
  
  task: TaskClassification;
  
  reasoning: {
    why: string;  // Why this change is needed
    impact: string;  // What will change
    risk: string;  // What could go wrong
  };
  
  alternatives: Array<{
    option: string;
    pros: string[];
    cons: string[];
    effort: string;
  }>;
  
  dryRunResults?: unknown;
  agentRecommendation: "approve" | "reject" | "revise";
  agentReasoning: string;
  
  filePath: string;
}

/**
 * Create an approval request for a HUMAN_CONFIRM task.
 */
export function createApprovalRequest(
  task: TaskClassification,
  context: {
    why: string;
    impact: string;
    risk: string;
    alternatives: Array<{ option: string; pros: string[]; cons: string[]; effort: string }>;
    dryRunResults?: unknown;
    recommendation: "approve" | "reject" | "revise";
    reasoning: string;
  },
  options: { outputDir?: string } = {}
): ApprovalRequest {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const outputDir = options.outputDir || "/tmp/sovereign-approvals";
  
  // Ensure output directory exists
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch {
    // Directory might already exist
  }
  
  const filePath = join(outputDir, `${requestId}.md`);
  
  const approval: ApprovalRequest = {
    requestId,
    taskId: task.taskId,
    createdAt: new Date(),
    status: "pending",
    task,
    reasoning: {
      why: context.why,
      impact: context.impact,
      risk: context.risk
    },
    alternatives: context.alternatives,
    dryRunResults: context.dryRunResults,
    agentRecommendation: context.recommendation,
    agentReasoning: context.reasoning,
    filePath
  };
  
  // Generate markdown
  const markdown = generateApprovalMarkdown(approval);
  writeFileSync(filePath, markdown, "utf-8");
  
  return approval;
}

function generateApprovalMarkdown(approval: ApprovalRequest): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`# HUMAN_CONFIRM Approval Request\n`);
  lines.push(`**Request ID:** ${approval.requestId}`);
  lines.push(`**Task ID:** ${approval.taskId}`);
  lines.push(`**Task Type:** ${approval.task.taskType}`);
  lines.push(`**Created:** ${approval.createdAt.toISOString()}`);
  lines.push(`**Status:** ${approval.status.toUpperCase()}\n`);
  lines.push(`---\n`);
  
  // Why
  lines.push(`## Why This Change Is Needed\n`);
  lines.push(approval.reasoning.why);
  lines.push(`\n---\n`);
  
  // Recommendation
  lines.push(`## Recommended Action\n`);
  lines.push(approval.task.description);
  lines.push(`\n**Risk level:** ${approval.task.risk}`);
  lines.push(`**Reversible:** ${approval.task.reversible ? "Yes" : "No"}`);
  lines.push(`**Blast radius:** ${(approval.task.blastRadius * 100).toFixed(1)}% of listings`);
  lines.push(`**Estimated time:** ${approval.task.estimatedTime}\n`);
  lines.push(`---\n`);
  
  // Impact
  lines.push(`## Impact Analysis\n`);
  lines.push(approval.reasoning.impact);
  lines.push(`\n---\n`);
  
  // Risk
  lines.push(`## Risk Assessment\n`);
  lines.push(approval.reasoning.risk);
  lines.push(`\n---\n`);
  
  // Dry-run results
  if (approval.dryRunResults) {
    lines.push(`## Dry-Run Results\n`);
    lines.push(`\`\`\`json`);
    lines.push(JSON.stringify(approval.dryRunResults, null, 2));
    lines.push(`\`\`\``);
    lines.push(`\n---\n`);
  }
  
  // Alternatives
  if (approval.alternatives.length > 0) {
    lines.push(`## Alternatives Considered\n`);
    
    approval.alternatives.forEach((alt, index) => {
      lines.push(`### Option ${String.fromCharCode(65 + index)}: ${alt.option}\n`);
      
      if (alt.pros.length > 0) {
        lines.push(`**Pros:**`);
        alt.pros.forEach(pro => lines.push(`- ${pro}`));
        lines.push(``);
      }
      
      if (alt.cons.length > 0) {
        lines.push(`**Cons:**`);
        alt.cons.forEach(con => lines.push(`- ${con}`));
        lines.push(``);
      }
      
      lines.push(`**Effort:** ${alt.effort}\n`);
    });
    
    lines.push(`---\n`);
  }
  
  // Agent recommendation
  lines.push(`## Cloud Agent Recommendation\n`);
  
  const emoji = approval.agentRecommendation === "approve" ? "✅" : 
                approval.agentRecommendation === "reject" ? "❌" : "⚠️";
  
  lines.push(`${emoji} **${approval.agentRecommendation.toUpperCase()}**\n`);
  lines.push(approval.agentReasoning);
  lines.push(`\n---\n`);
  
  // Commands
  lines.push(`## Decision Commands\n`);
  lines.push(`\`\`\`bash`);
  lines.push(`# Approve and apply immediately`);
  lines.push(`npm run sovereign:approve -- --request-id=${approval.requestId}\n`);
  lines.push(`# Reject (no changes)`);
  lines.push(`npm run sovereign:reject -- --request-id=${approval.requestId}\n`);
  lines.push(`# Request revision with feedback`);
  lines.push(`npm run sovereign:revise -- --request-id=${approval.requestId} --feedback="Your feedback here"`);
  lines.push(`\`\`\``);
  
  return lines.join("\n");
}

/**
 * Format an approval request summary for display.
 */
export function formatApprovalSummary(approval: ApprovalRequest): string {
  const lines: string[] = [];
  
  const emoji = approval.agentRecommendation === "approve" ? "✅" : 
                approval.agentRecommendation === "reject" ? "❌" : "⚠️";
  
  lines.push(`📋 Approval Request Created`);
  lines.push(`   ID: ${approval.requestId}`);
  lines.push(`   Task: ${approval.task.taskType}`);
  lines.push(`   Risk: ${approval.task.risk}`);
  lines.push(`   Agent rec: ${emoji} ${approval.agentRecommendation.toUpperCase()}`);
  lines.push(`   File: ${approval.filePath}`);
  
  return lines.join("\n");
}

/**
 * Create a decision report for HUMAN_DECIDE tasks.
 */
export interface DecisionReport {
  reportId: string;
  taskId: string;
  createdAt: Date;
  
  task: TaskClassification;
  
  situation: string;  // What's happening
  context: string;  // Why it matters
  
  options: Array<{
    option: string;
    description: string;
    pros: string[];
    cons: string[];
    effort: string;
  }>;
  
  dataAnalysis: string;  // What the numbers say
  agentThoughts?: string;  // Optional perspective
  
  filePath: string;
}

/**
 * Create a decision report for a HUMAN_DECIDE task.
 */
export function createDecisionReport(
  task: TaskClassification,
  context: {
    situation: string;
    context: string;
    options: Array<{ option: string; description: string; pros: string[]; cons: string[]; effort: string }>;
    dataAnalysis: string;
    agentThoughts?: string;
  },
  options: { outputDir?: string } = {}
): DecisionReport {
  const reportId = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const outputDir = options.outputDir || "/tmp/sovereign-decisions";
  
  // Ensure output directory exists
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch {
    // Directory might already exist
  }
  
  const filePath = join(outputDir, `${reportId}.md`);
  
  const report: DecisionReport = {
    reportId,
    taskId: task.taskId,
    createdAt: new Date(),
    task,
    situation: context.situation,
    context: context.context,
    options: context.options,
    dataAnalysis: context.dataAnalysis,
    agentThoughts: context.agentThoughts,
    filePath
  };
  
  // Generate markdown
  const markdown = generateDecisionMarkdown(report);
  writeFileSync(filePath, markdown, "utf-8");
  
  return report;
}

function generateDecisionMarkdown(report: DecisionReport): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`# HUMAN_DECIDE Decision Report\n`);
  lines.push(`**Report ID:** ${report.reportId}`);
  lines.push(`**Task ID:** ${report.taskId}`);
  lines.push(`**Task Type:** ${report.task.taskType}`);
  lines.push(`**Created:** ${report.createdAt.toISOString()}\n`);
  lines.push(`---\n`);
  
  // Situation
  lines.push(`## Situation\n`);
  lines.push(report.situation);
  lines.push(`\n---\n`);
  
  // Context
  lines.push(`## Context\n`);
  lines.push(report.context);
  lines.push(`\n---\n`);
  
  // Options
  lines.push(`## Options\n`);
  
  report.options.forEach((opt, index) => {
    lines.push(`### Option ${String.fromCharCode(65 + index)}: ${opt.option}\n`);
    lines.push(opt.description);
    lines.push(``);
    
    if (opt.pros.length > 0) {
      lines.push(`**Pros:**`);
      opt.pros.forEach(pro => lines.push(`- ✅ ${pro}`));
      lines.push(``);
    }
    
    if (opt.cons.length > 0) {
      lines.push(`**Cons:**`);
      opt.cons.forEach(con => lines.push(`- ❌ ${con}`));
      lines.push(``);
    }
    
    lines.push(`**Effort:** ${opt.effort}\n`);
    lines.push(`---\n`);
  });
  
  // Data analysis
  lines.push(`## Data Analysis\n`);
  lines.push(report.dataAnalysis);
  lines.push(`\n---\n`);
  
  // Agent thoughts
  if (report.agentThoughts) {
    lines.push(`## Cloud Agent Perspective\n`);
    lines.push(report.agentThoughts);
    lines.push(`\n---\n`);
  }
  
  // Decision request
  lines.push(`## Your Decision Needed\n`);
  lines.push(`Please review the options above and decide which direction to take.`);
  lines.push(`\nRecord your decision:`);
  lines.push(`\`\`\`bash`);
  lines.push(`npm run sovereign:decide -- --report-id=${report.reportId} --option=A  # or B, C, etc.`);
  lines.push(`\`\`\``);
  
  return lines.join("\n");
}

/**
 * Format a decision report summary for display.
 */
export function formatDecisionSummary(report: DecisionReport): string {
  const lines: string[] = [];
  
  lines.push(`📊 Decision Report Created`);
  lines.push(`   ID: ${report.reportId}`);
  lines.push(`   Task: ${report.task.taskType}`);
  lines.push(`   Options: ${report.options.length}`);
  lines.push(`   File: ${report.filePath}`);
  
  return lines.join("\n");
}
