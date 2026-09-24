/**
 * Listing quality loop cron — GET/POST /api/cron/listing-quality-loop.
 *
 * Engine-native self-improvement for EXISTING published cards (About prose first): score → record
 * recommendations → apply safe deterministic upgrades → encode lessons. Distinct from ClassScout's
 * unported `catalog-loop` Find→Improve discovery pipeline (`docs/engine-parity-tracker.md` #221).
 *
 * Same auth/fail-closed posture as `serving-reconcile`: refuses 503 with no `CRON_SECRET` off Vercel,
 * 401 on a bad/missing credential. Deterministic composer + curated Abouts from Mongo
 * (`listing_curated_abouts`) — no LLM, no repo content. On by default; set
 * `LISTING_QUALITY_LOOP=false` to refuse (recorded so Automation shows why).
 * The Mac daemons run the same tick daily when enabled.
 */
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authorizeCronRequest, cronAuthMode, logCronDisabledOnce } from "@/lib/cronAuth";
import { getVertical } from "@/lib/vertical/resolve";
import { timedCronRun } from "@/lib/cron/cronRuns";
import {
  describeListingQualityLoop,
  loadCuratedAbout,
  mongoListingQualityStore,
  runListingQualityLoop,
  DEFAULT_QUALITY_IMPROVE_LIMIT,
  DEFAULT_QUALITY_SCORE_LIMIT,
} from "@/lib/listingQuality";
import { parseListing } from "@/lib/entity/listing";
import { deriveServingDoc } from "@/lib/servingModel/deriveServingDoc";
import { writeServingDoc } from "@/lib/servingModel/writeServingDoc";
import { resolveTerritory } from "@/lib/geo/territoryResolve";
import type { TerritoryConfig } from "@/lib/geo/territory";
import { readStructuredBlock, TERRITORY_BLOCK } from "@/lib/runtimeConfig/structuredBlocks";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** On by default — self-heal published About prose unless explicitly disabled. */
function listingQualityLoopEnabled(): boolean {
  const v = (process.env.LISTING_QUALITY_LOOP ?? "true").trim().toLowerCase();
  return v !== "false" && v !== "0" && v !== "off";
}

export async function GET(req: Request): Promise<NextResponse> {
  if (cronAuthMode() === "disabled") {
    logCronDisabledOnce();
    return NextResponse.json({ error: "cron disabled: CRON_SECRET unset" }, { status: 503 });
  }
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  if (!db) return NextResponse.json({ error: "No database" }, { status: 503 });

  const outcome = await timedCronRun(db, "listing-quality-loop", async () => {
    if (!listingQualityLoopEnabled()) {
      return {
        status: "refused" as const,
        http: 200,
        body: { ok: false, refused: "LISTING_QUALITY_LOOP=false" },
        detail: "LISTING_QUALITY_LOOP=false — unset or set to true to enable",
      };
    }
    const { pack } = getVertical();
    const territory: TerritoryConfig = resolveTerritory(
      (pack.territory as TerritoryConfig | undefined) ?? {},
      await readStructuredBlock(db, TERRITORY_BLOCK),
    );
    const summary = await runListingQualityLoop(mongoListingQualityStore(db), {
      scoreLimit: DEFAULT_QUALITY_SCORE_LIMIT,
      improveLimit: DEFAULT_QUALITY_IMPROVE_LIMIT,
      curatedById: await loadCuratedAbout(db),
      listingNounSingular: pack.listingNoun?.singular,
      onDescriptionApplied: async (listingId) => {
        const doc = await db.collection("listings").findOne({ id: listingId }, { projection: { _id: 0 } });
        if (!doc) return;
        const listing = parseListing(doc);
        const serving = deriveServingDoc(listing, pack, territory, new Date().toISOString());
        await writeServingDoc(db, serving);
      },
    });
    return {
      status: "ok" as const,
      http: 200,
      body: { ok: true, ...summary, detail: describeListingQualityLoop(summary) },
      ticks: summary.improve.applied + summary.encode.encoded,
      detail: describeListingQualityLoop(summary),
    };
  });
  if (outcome.status === "error") return NextResponse.json({ ok: false, error: outcome.detail }, { status: 500 });
  return NextResponse.json(outcome.body, { status: outcome.http });
}

export async function POST(req: Request): Promise<NextResponse> {
  return GET(req);
}
