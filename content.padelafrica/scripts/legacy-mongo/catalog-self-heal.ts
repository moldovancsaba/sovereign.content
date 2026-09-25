/**
 * Sovereign self-heal CLI — status, digest, research briefs, debt intake, process lessons.
 *
 *   npm run catalog:self-heal -- --status
 *   npm run catalog:self-heal -- --digest [--since=ISO]
 *   npm run catalog:self-heal -- --brief
 *   npm run catalog:self-heal -- --ingest-contact [--limit 40] [--dry-run]
 *   npm run catalog:self-heal -- --record-process --job=catalog:find --kind=success --message="…"
 *
 * Never invents contacts/venues. Research briefs are agent-required (WebSearch).
 * --digest prints a smart report with HiTL delivery classes (auto | agent_execute | hitl_review).
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";
import { existsSync, readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import {
  buildSelfHealStatus,
  buildSelfImproveDigest,
  recordProcessLesson,
  recommendationsFromContactEnrich,
  type ProcessLessonKind,
} from "../src/lib/catalogSelfHeal";
import {
  backfillListingContacts,
  CONTACT_ENRICH_PER_TICK,
  mongoContactEnrichStore,
} from "../src/lib/catalogHygiene/contactEnrich";
import { mongoListingQualityStore } from "../src/lib/listingQuality/store";
import { intArg } from "./listing-quality-cli";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

function argValue(flag: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("-")) return process.argv[i + 1];
  return undefined;
}

async function main() {
  refuseAgentMongo("catalog-self-heal.ts");
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");

  const status = process.argv.includes("--status");
  const digest = process.argv.includes("--digest");
  const brief = process.argv.includes("--brief");
  const ingestContact = process.argv.includes("--ingest-contact");
  const record = process.argv.includes("--record-process");
  const dryRun = process.argv.includes("--dry-run");

  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "padel-africa");
  const store = mongoListingQualityStore(db);

  try {
    if (record) {
      const job = argValue("--job") || "catalog:self-heal";
      const kind = (argValue("--kind") || "success") as ProcessLessonKind;
      const message = argValue("--message");
      if (!message) {
        console.error(JSON.stringify({ error: "usage", example: '--record-process --job=catalog:find --kind=success --message="seeded EG"' }, null, 2));
        process.exit(2);
      }
      const lesson = recordProcessLesson({ job, kind, message, evidence: argValue("--evidence")?.split("|") ?? [] });
      console.log(JSON.stringify({ job: "catalog:self-heal", mode: "record-process", lesson }, null, 2));
      return;
    }

    if (ingestContact) {
      const limit = intArg(process.argv, "--limit", CONTACT_ENRICH_PER_TICK);
      const summary = await backfillListingContacts(mongoContactEnrichStore(db), {
        maxPerRun: limit,
        dryRun,
      });
      const snaps = new Map(
        await Promise.all(
          summary.results.map(async (r) => [r.listingId, await store.getSnapshot(r.listingId)] as const),
        ),
      );
      const now = new Date().toISOString();
      const debt = recommendationsFromContactEnrich(summary.results, snaps, now);
      if (!dryRun && debt.length) await store.upsertRecommendations(debt);
      const noEvidence = summary.results.filter((r) => r.reason === "no_evidence").length;
      if (!dryRun && noEvidence > 0) {
        recordProcessLesson({
          job: "catalog:contact-enrich",
          kind: "evidence_wall",
          message: `contact enrich left ${noEvidence} listings with no_evidence`,
          evidence: [`scanned:${summary.scanned}`, `applied:${summary.applied}`, `no_evidence:${noEvidence}`],
          key: `no_evidence:${now.slice(0, 10)}`,
        });
      }
      console.log(
        JSON.stringify(
          {
            job: "catalog:self-heal",
            mode: "ingest-contact",
            dryRun,
            enrich: summary,
            debtOpened: debt.length,
            debtKinds: [...new Set(debt.map((d) => d.kind))],
          },
          null,
          2,
        ),
      );
      return;
    }

    if (digest) {
      const open = await store.listOpenRecommendations(200);
      const lessons = await store.listLessons(100);
      const since = argValue("--since") ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const report = buildSelfImproveDigest({
        recommendations: open,
        lessons,
        since,
      });
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const report = await buildSelfHealStatus(store);
    if (brief) {
      if (!report.nextResearchBrief) {
        console.log(JSON.stringify({ job: "catalog:self-heal", mode: "brief", brief: null, hint: "no open research debt" }, null, 2));
        return;
      }
      console.log(JSON.stringify(report.nextResearchBrief, null, 2));
      return;
    }

    // default + --status
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
