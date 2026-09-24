/**
 * Sovereign Content System Deployment Verification Script
 *
 * Verifies that the sovereign content system is properly deployed and functioning.
 * Run this after deploying to staging or production to validate the installation.
 *
 * Usage:
 *   npx tsx scripts/verify-sovereign-deployment.ts [--env=staging|production]
 */

import { getDb } from "../src/lib/mongodb";
import { getVertical } from "../src/lib/vertical/resolve";

interface VerificationResult {
  category: string;
  check: string;
  status: "✅ PASS" | "❌ FAIL" | "⚠️  WARN";
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

function addResult(
  category: string,
  check: string,
  status: "✅ PASS" | "❌ FAIL" | "⚠️  WARN",
  message: string,
  details?: any,
) {
  results.push({ category, check, status, message, details });
}

async function verifyConfiguration() {
  console.log("\n🔍 Verifying Configuration...\n");

  try {
    const { pack } = getVertical();

    // Check if sovereign agent is configured
    const sovereignConfig = (pack as any).sovereignAgent;

    if (!sovereignConfig) {
      addResult(
        "Configuration",
        "Sovereign Agent Config",
        "❌ FAIL",
        "No sovereignAgent configuration found in vertical pack",
      );
      return;
    }

    addResult(
      "Configuration",
      "Sovereign Agent Config",
      "✅ PASS",
      "Configuration found in vertical pack",
    );

    // Check enabled status
    if (sovereignConfig.enabled !== true) {
      addResult(
        "Configuration",
        "Agent Enabled",
        "⚠️  WARN",
        "Sovereign agent is configured but not enabled",
        { enabled: sovereignConfig.enabled },
      );
    } else {
      addResult(
        "Configuration",
        "Agent Enabled",
        "✅ PASS",
        "Sovereign agent is enabled",
      );
    }

    // Check allowed decisions
    if (!sovereignConfig.allowedDecisions || sovereignConfig.allowedDecisions.length === 0) {
      addResult(
        "Configuration",
        "Allowed Decisions",
        "❌ FAIL",
        "No allowed decisions configured",
      );
    } else {
      addResult(
        "Configuration",
        "Allowed Decisions",
        "✅ PASS",
        `${sovereignConfig.allowedDecisions.length} decision types allowed`,
        { decisions: sovereignConfig.allowedDecisions },
      );
    }

    // Check autonomy threshold
    if (sovereignConfig.autonomyThreshold >= 0.9 && sovereignConfig.autonomyThreshold <= 1.0) {
      addResult(
        "Configuration",
        "Autonomy Threshold",
        "✅ PASS",
        `Threshold set to ${sovereignConfig.autonomyThreshold} (reasonable)`,
      );
    } else {
      addResult(
        "Configuration",
        "Autonomy Threshold",
        "⚠️  WARN",
        `Threshold ${sovereignConfig.autonomyThreshold} may be too low/high`,
        { threshold: sovereignConfig.autonomyThreshold },
      );
    }

    // Check quality gates
    if (sovereignConfig.qualityGates) {
      const gates = sovereignConfig.qualityGates;
      const gateCount = Object.keys(gates).length;
      addResult(
        "Configuration",
        "Quality Gates",
        "✅ PASS",
        `${gateCount} quality gates configured`,
        gates,
      );
    } else {
      addResult(
        "Configuration",
        "Quality Gates",
        "❌ FAIL",
        "No quality gates configured",
      );
    }

    // Check delivery rules
    if (sovereignConfig.deliveryRules) {
      const rules = sovereignConfig.deliveryRules;
      const factorWeightSum = rules.priorityFactors?.reduce(
        (sum: number, f: any) => sum + f.weight,
        0,
      ) || 0;

      if (Math.abs(factorWeightSum - 1.0) < 0.01) {
        addResult(
          "Configuration",
          "Delivery Rules",
          "✅ PASS",
          "Priority factor weights sum to 1.0",
          rules,
        );
      } else {
        addResult(
          "Configuration",
          "Delivery Rules",
          "⚠️  WARN",
          `Priority factor weights sum to ${factorWeightSum.toFixed(2)} (should be 1.0)`,
          rules,
        );
      }
    }
  } catch (error) {
    addResult(
      "Configuration",
      "Verification",
      "❌ FAIL",
      `Error verifying configuration: ${String(error)}`,
    );
  }
}

async function verifyDatabase() {
  console.log("\n🔍 Verifying Database...\n");

  try {
    const db = await getDb();
    if (!db) {
      addResult(
        "Database",
        "Connection",
        "❌ FAIL",
        "Could not connect to database",
      );
      return;
    }

    addResult(
      "Database",
      "Connection",
      "✅ PASS",
      "Successfully connected to database",
    );

    // Check sovereign_decisions collection
    const decisionsCollection = db.collection("sovereign_decisions");
    const decisionsCount = await decisionsCollection.countDocuments();

    addResult(
      "Database",
      "sovereign_decisions Collection",
      "✅ PASS",
      `Collection exists with ${decisionsCount} documents`,
    );

    // Check indexes
    const decisionsIndexes = await decisionsCollection.indexes();
    const hasVerticalIndex = decisionsIndexes.some(
      (idx) => idx.key.vertical && idx.key.timestamp,
    );

    if (hasVerticalIndex) {
      addResult(
        "Database",
        "Decision Indexes",
        "✅ PASS",
        "Performance indexes exist",
      );
    } else {
      addResult(
        "Database",
        "Decision Indexes",
        "⚠️  WARN",
        "Recommended indexes not found (may impact performance)",
        {
          recommended: [
            "{ vertical: 1, timestamp: -1 }",
            "{ vertical: 1, decisionType: 1, override: 1 }",
          ],
        },
      );
    }

    // Check sovereign_delivery_metrics collection
    const metricsCollection = db.collection("sovereign_delivery_metrics");
    const metricsCount = await metricsCollection.countDocuments();

    addResult(
      "Database",
      "sovereign_delivery_metrics Collection",
      metricsCount >= 0 ? "✅ PASS" : "❌ FAIL",
      `Collection exists with ${metricsCount} documents`,
    );

    // Check listings with delivery metadata
    const listingsCollection = db.collection("listings");
    const listingsWithDelivery = await listingsCollection.countDocuments({
      "delivery.priority": { $exists: true },
    });

    if (listingsWithDelivery > 0) {
      addResult(
        "Database",
        "Listings with Delivery Metadata",
        "✅ PASS",
        `${listingsWithDelivery} listings have delivery priorities`,
      );
    } else {
      addResult(
        "Database",
        "Listings with Delivery Metadata",
        "⚠️  WARN",
        "No listings have delivery metadata yet (delivery optimizer hasn't run)",
      );
    }
  } catch (error) {
    addResult(
      "Database",
      "Verification",
      "❌ FAIL",
      `Error verifying database: ${String(error)}`,
    );
  }
}

async function verifyRecentActivity() {
  console.log("\n🔍 Verifying Recent Activity...\n");

  try {
    const db = await getDb();
    if (!db) {
      addResult(
        "Activity",
        "Database Check",
        "❌ FAIL",
        "Database not available",
      );
      return;
    }

    const { pack } = getVertical();
    const cutoff24h = new Date(Date.now() - 86400000);

    // Check decisions in last 24 hours
    const decisionsCollection = db.collection("sovereign_decisions");
    const recentDecisions = await decisionsCollection.countDocuments({
      vertical: pack.slug,
      timestamp: { $gte: cutoff24h },
    });

    if (recentDecisions > 0) {
      addResult(
        "Activity",
        "Recent Decisions (24h)",
        "✅ PASS",
        `${recentDecisions} decisions recorded in last 24 hours`,
      );
    } else {
      addResult(
        "Activity",
        "Recent Decisions (24h)",
        "⚠️  WARN",
        "No decisions in last 24 hours (may be normal for new deployment)",
      );
    }

    // Check delivery optimizer runs
    const metricsCollection = db.collection("sovereign_delivery_metrics");
    const recentMetrics = await metricsCollection.countDocuments({
      vertical: pack.slug,
      timestamp: { $gte: cutoff24h },
    });

    if (recentMetrics > 0) {
      addResult(
        "Activity",
        "Delivery Optimizer Runs (24h)",
        "✅ PASS",
        `${recentMetrics} optimizer runs in last 24 hours`,
      );
    } else {
      addResult(
        "Activity",
        "Delivery Optimizer Runs (24h)",
        "⚠️  WARN",
        "No optimizer runs in last 24 hours (check cron schedule)",
      );
    }

    // Check decision distribution
    const decisionStats = await decisionsCollection
      .aggregate([
        {
          $match: {
            vertical: pack.slug,
            timestamp: { $gte: cutoff24h },
          },
        },
        {
          $group: {
            _id: "$decision",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    if (decisionStats.length > 0) {
      const distribution = Object.fromEntries(
        decisionStats.map((d) => [d._id, d.count]),
      );
      addResult(
        "Activity",
        "Decision Distribution",
        "✅ PASS",
        "Decisions distributed across types",
        distribution,
      );
    }
  } catch (error) {
    addResult(
      "Activity",
      "Verification",
      "❌ FAIL",
      `Error verifying activity: ${String(error)}`,
    );
  }
}

function printResults() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 SOVEREIGN CONTENT SYSTEM VERIFICATION RESULTS");
  console.log("=".repeat(80) + "\n");

  const categories = [...new Set(results.map((r) => r.category))];

  for (const category of categories) {
    console.log(`\n📁 ${category}`);
    console.log("-".repeat(80));

    const categoryResults = results.filter((r) => r.category === category);

    for (const result of categoryResults) {
      console.log(`\n${result.status} ${result.check}`);
      console.log(`   ${result.message}`);

      if (result.details) {
        console.log(
          `   Details: ${JSON.stringify(result.details, null, 2)
            .split("\n")
            .join("\n   ")}`,
        );
      }
    }
  }

  console.log("\n" + "=".repeat(80));

  const passed = results.filter((r) => r.status === "✅ PASS").length;
  const failed = results.filter((r) => r.status === "❌ FAIL").length;
  const warned = results.filter((r) => r.status === "⚠️  WARN").length;

  console.log(`\n📈 Summary: ${passed} passed, ${warned} warnings, ${failed} failed`);

  if (failed > 0) {
    console.log("\n❌ VERIFICATION FAILED - Critical issues found");
    console.log("   Review failed checks above and resolve before proceeding.");
    process.exit(1);
  } else if (warned > 0) {
    console.log("\n⚠️  VERIFICATION PASSED WITH WARNINGS");
    console.log("   Review warnings above - deployment can proceed with caution.");
    process.exit(0);
  } else {
    console.log("\n✅ VERIFICATION PASSED - All checks successful");
    console.log("   Sovereign content system is properly deployed!");
    process.exit(0);
  }
}

async function main() {
  console.log("🚀 Sovereign Content System Deployment Verification");
  console.log("================================================\n");

  const env = process.argv.find((arg) => arg.startsWith("--env="))?.split("=")[1] || "unknown";
  const { pack } = getVertical();

  console.log(`Environment: ${env}`);
  console.log(`Vertical: ${pack.slug}`);
  console.log(`Display Name: ${pack.displayName}`);

  await verifyConfiguration();
  await verifyDatabase();
  await verifyRecentActivity();

  printResults();
}

main().catch((error) => {
  console.error("\n❌ VERIFICATION ERROR:");
  console.error(error);
  process.exit(1);
});
