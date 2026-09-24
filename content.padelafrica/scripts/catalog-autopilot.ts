/**
 * Cloud Agent / CLI autopilot tick — same machine as `/api/cron/content-intelligence-autopilot`,
 * without CRON_SECRET or AI Gateway. Structured source headers drive extraction.
 *
 *   VERTICAL=padel-africa MONGODB_URI=... MONGODB_DB=padel-africa \
 *     npx tsx scripts/catalog-autopilot.ts [--ticks N] [--requeue-limit N]
 */
import { MongoClient } from "mongodb";
import { createLlmClient, isLlmConfigured } from "../src/lib/pipeline/extraction";
import { runBoundedCycles } from "../src/lib/pipeline/autopilot";
import { createCachedGeocoder, mongoGeocodeCache } from "../src/lib/geo/geocodeCache";

function intArg(argv: string[], name: string, fallback: number): number {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  const n = Number(argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function resolvePack() {
  try {
    const { resolveVertical } = await import("../src/lib/vertical/resolve");
    return resolveVertical(process.env.VERTICAL?.trim() || "management-console");
  } catch (err) {
    throw new Error(
      `vertical pack unavailable (${err instanceof Error ? err.message : String(err)}). ` +
        `Install GDS packages or run from a complete node_modules.`,
    );
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const ticks = intArg(process.argv, "--ticks", 10);
  const requeueLimit = intArg(process.argv, "--requeue-limit", 10);
  const { pack, safety } = await resolvePack();
  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "management");
  const llm = isLlmConfigured() ? createLlmClient() : null;
  const summary = await runBoundedCycles(db, pack, safety, llm, ticks, createCachedGeocoder({ store: mongoGeocodeCache(db) }), {
    requeueStructured: true,
    requeueLimit,
  });
  console.log(
    JSON.stringify(
      {
        vertical: pack.slug,
        llm: llm ? "gateway" : "structured-only",
        requeued: summary.requeued ?? 0,
        ranTicks: summary.ranTicks,
        results: summary.results.map((r) => ({
          cardId: r.cardId,
          finalState: r.finalState,
          blockers: r.verdicts?.filter((v) => v.status === "blocker").map((v) => v.reasonCode),
        })),
      },
      null,
      2,
    ),
  );
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
