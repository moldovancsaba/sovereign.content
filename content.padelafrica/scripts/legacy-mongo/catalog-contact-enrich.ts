/**
 * Evidence-only contact enrich — fill blank phone / website / email from card sourceText
 * headers or a promotable listing sourceUrl. Never invents contacts.
 *
 * Opens self-heal debt (contact_gap / research_needed) when status is no_evidence so the
 * unified recommendation queue + agent research briefs can clear the evidence wall.
 *
 *   npm run catalog:contact-enrich -- --limit 40
 *   npm run catalog:contact-enrich -- --dry-run --limit 40
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";
import { MongoClient } from "mongodb";
import {
  backfillListingContacts,
  CONTACT_ENRICH_PER_TICK,
  mongoContactEnrichStore,
} from "../src/lib/catalogHygiene/contactEnrich";
import {
  recommendationsFromContactEnrich,
  recordProcessLesson,
} from "../src/lib/catalogSelfHeal";
import { mongoListingQualityStore } from "../src/lib/listingQuality/store";
import { intArg } from "./listing-quality-cli";

async function main() {
  refuseAgentMongo("catalog-contact-enrich.ts");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dryRun = process.argv.includes("--dry-run");
  const limit = intArg(process.argv, "--limit", CONTACT_ENRICH_PER_TICK);
  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "management");
  try {
    const summary = await backfillListingContacts(mongoContactEnrichStore(db), {
      maxPerRun: limit,
      dryRun,
    });
    const store = mongoListingQualityStore(db);
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
        { dryRun, limit, ...summary, selfHealDebtOpened: debt.length },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
