/**
 * Media-curate cron — fill empty listing media from website OG / page images. No LLM.
 */
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authorizeCronRequest, cronAuthMode, logCronDisabledOnce } from "@/lib/cronAuth";
import { timedCronRun } from "@/lib/cron/cronRuns";
import { describeMediaCurate, runMediaCurate } from "@/lib/catalogHygiene/mediaCurate";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 25);
  const dryRun = url.searchParams.get("dry-run") === "1";
  const listingId = url.searchParams.get("listing-id") || undefined;

  const outcome = await timedCronRun(db, "media-curate", async () => {
    const report = await runMediaCurate(db, { limit, dryRun, listingId });
    const detail = describeMediaCurate(report);
    return {
      status: "ok" as const,
      http: 200,
      body: { ok: true, ...report },
      ticks: report.enriched,
      detail,
    };
  });
  if (outcome.status === "error") return NextResponse.json({ ok: false, error: outcome.detail }, { status: 500 });
  return NextResponse.json(outcome.body, { status: outcome.http });
}

export async function POST(req: Request): Promise<NextResponse> {
  return GET(req);
}
