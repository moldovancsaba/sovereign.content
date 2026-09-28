#!/usr/bin/env npx tsx
/**
 * Drain soft-incomplete REVIEW_READY cards via ingest force-publish.
 *
 *   npm run catalog:drain-review-ready -- --limit=25
 *   npm run catalog:drain-review-ready -- --camera=hataron-tul --limit=25
 *   npm run catalog:drain-review-ready:dry -- --limit=10
 *
 * Requires production (or preview) that supports POST /api/ingest {forcePublish:true}
 * and camera-aware GET /api/machine/catalog (x-sportolok-camera).
 * Never invents phones — only promotes cards the gate already passed with soft gaps.
 */
import { exitIfMongoEnv } from "./lib/refuseAgentMongo.ts";

type ReviewSample = {
  id: string;
  state: string;
  lastReason: string | null;
  listingId?: string | null;
};

type SportolokCamera = "itthon" | "hataron-tul";

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argInt(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!hit) return fallback;
  const n = parseInt(hit.split("=")[1], 10);
  return Number.isFinite(n) ? n : fallback;
}

function argCamera(): SportolokCamera | undefined {
  const hit = process.argv.find((a) => a.startsWith("--camera="));
  if (!hit) return undefined;
  const v = hit.split("=")[1]?.trim();
  if (v === "itthon" || v === "hataron-tul") return v;
  throw new Error(`--camera must be itthon|hataron-tul, got ${v}`);
}

function loadConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl =
    process.env.INGEST_BASE_URL ||
    process.env.SPORT_INGEST_BASE_URL ||
    "https://sport.doneisbetter.com";
  const apiKey = process.env.INGEST_API_KEY || process.env.SPORT_INGEST_API_KEY || "";
  if (!apiKey) throw new Error("INGEST_API_KEY required");
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

function cameraHeaders(camera?: SportolokCamera): Record<string, string> {
  if (!camera) return {};
  return { "x-sportolok-camera": camera, "x-engine-city": camera };
}

async function main() {
  exitIfMongoEnv("drain-review-ready-ingest.ts");
  const dryRun = argFlag("--dry-run");
  const limit = argInt("--limit", 25);
  const camera = argCamera();
  const cfg = loadConfig();
  const cam = cameraHeaders(camera);

  const catalogRes = await fetch(`${cfg.baseUrl}/api/machine/catalog?limit=1`, {
    headers: { "x-api-key": cfg.apiKey, ...cam },
  });
  const catalog = (await catalogRes.json()) as {
    city?: string | null;
    triage?: {
      byState?: Record<string, number>;
      reviewReadySoftIncomplete?: number;
      reviewReadySample?: ReviewSample[];
      stuckSample?: ReviewSample[];
    };
  };
  if (!catalogRes.ok) {
    console.log(JSON.stringify({ error: "catalog_failed", status: catalogRes.status, catalog }, null, 2));
    process.exitCode = 1;
    return;
  }

  const sample =
    catalog.triage?.reviewReadySample?.filter((c) =>
      (c.lastReason || "").includes("soft-incomplete"),
    ) ??
    catalog.triage?.stuckSample?.filter(
      (c) => c.state === "REVIEW_READY" && (c.lastReason || "").includes("soft-incomplete"),
    ) ??
    [];

  const toDrain = sample.slice(0, limit);
  const reason =
    "Soft-incomplete only: schedule/price/description gaps tolerated under publish-now-enrich-later; source already gate-passed.";

  const results: Array<Record<string, unknown>> = [];
  let published = 0;
  let refused = 0;
  let errors = 0;

  for (const card of toDrain) {
    if (dryRun) {
      results.push({ cardId: card.id, outcome: "dry-run", lastReason: card.lastReason });
      continue;
    }
    const res = await fetch(`${cfg.baseUrl}/api/ingest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        ...cam,
      },
      body: JSON.stringify({ id: card.id, forcePublish: true, reason }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.published === true) {
      published += 1;
      results.push({ cardId: card.id, outcome: "published", waived: body.waived });
    } else if (res.ok && body.published === false) {
      refused += 1;
      results.push({ cardId: card.id, outcome: "not_published", body });
    } else if (res.status === 400 && /forcePublish|unknown|unrecognized/i.test(JSON.stringify(body))) {
      console.log(
        JSON.stringify(
          {
            error: "force_publish_not_deployed",
            detail: "Deploy cursor/ingest-force-publish-652a first",
            status: res.status,
            body,
          },
          null,
          2,
        ),
      );
      process.exitCode = 2;
      return;
    } else {
      errors += 1;
      results.push({ cardId: card.id, outcome: "error", status: res.status, body });
    }
  }

  const afterRes = await fetch(`${cfg.baseUrl}/api/machine/catalog?limit=1`, {
    headers: { "x-api-key": cfg.apiKey, ...cam },
  });
  const after = afterRes.ok ? ((await afterRes.json()) as { triage?: { byState?: Record<string, number> } }) : null;

  console.log(
    JSON.stringify(
      {
        job: "catalog:drain-review-ready",
        camera: camera ?? null,
        catalogCity: catalog.city ?? null,
        dryRun,
        considered: toDrain.length,
        published,
        refused,
        errors,
        byStateBefore: catalog.triage?.byState ?? null,
        byStateAfter: after?.triage?.byState ?? null,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
