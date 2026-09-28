#!/usr/bin/env npx tsx
/**
 * Advance DISCOVERED cards via ingest `{advance:true}` — structured extract, no Ollama.
 *
 * Growth path: FIND → enrich → DISCOVERED → this script → REVIEW_READY / PUBLISHED.
 * forcePublish is NOT used here (soft-incomplete drain only).
 *
 *   npm run catalog:extract-discovered -- --limit=10
 *   npm run catalog:extract-discovered -- --camera=hataron-tul --limit=8
 *   npm run catalog:extract-discovered:dry -- --limit=5
 */
import { exitIfMongoEnv } from "./lib/refuseAgentMongo.ts";

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
  exitIfMongoEnv("extract-discovered-ingest.ts");
  const dryRun = argFlag("--dry-run");
  const limit = argInt("--limit", 10);
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
      discoveredCount?: number;
      discoveredSample?: Array<{ id: string; state: string }>;
    };
  };
  if (!catalogRes.ok) {
    console.log(JSON.stringify({ error: "catalog_failed", status: catalogRes.status, catalog }, null, 2));
    process.exitCode = 1;
    return;
  }

  const discovered =
    catalog.triage?.discoveredCount ?? catalog.triage?.byState?.DISCOVERED ?? 0;

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          job: "catalog:extract-discovered",
          dryRun: true,
          camera: camera ?? null,
          catalogCity: catalog.city ?? null,
          discovered,
          sample: catalog.triage?.discoveredSample ?? [],
          wouldAdvanceLimit: limit,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (discovered === 0) {
    console.log(
      JSON.stringify({
        job: "catalog:extract-discovered",
        camera: camera ?? null,
        discovered: 0,
        skipped: "no DISCOVERED cards",
      }),
    );
    return;
  }

  const res = await fetch(`${cfg.baseUrl}/api/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      ...cam,
    },
    body: JSON.stringify({ id: "advance-batch", advance: true, advanceLimit: limit }),
  });
  const body = await res.json().catch(() => ({}));

  if (res.status === 400 && /advance|unknown|unrecognized|invalid payload/i.test(JSON.stringify(body))) {
    console.log(
      JSON.stringify(
        {
          error: "advance_not_deployed",
          detail: "Deploy cursor/ht-city-pipeline-652a (ingest advance) first",
          status: res.status,
          body,
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
    return;
  }

  const afterRes = await fetch(`${cfg.baseUrl}/api/machine/catalog?limit=1`, {
    headers: { "x-api-key": cfg.apiKey, ...cam },
  });
  const after = afterRes.ok
    ? ((await afterRes.json()) as { triage?: { byState?: Record<string, number> } })
    : null;

  console.log(
    JSON.stringify(
      {
        job: "catalog:extract-discovered",
        camera: camera ?? null,
        catalogCity: catalog.city ?? null,
        discoveredBefore: discovered,
        status: res.status,
        body,
        byStateAfter: after?.triage?.byState ?? null,
      },
      null,
      2,
    ),
  );
  if (!res.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
