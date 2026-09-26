/**
 * Public ingest client for the sportolok management instance.
 * ONLY allowed write path for this agent — never open Mongo from here.
 */

export type IngestConfig = {
  /** e.g. https://sport.doneisbetter.com */
  baseUrl: string;
  /** INGEST_API_KEY or SSO machine token */
  apiKey: string;
};

export type IngestSourceBody = {
  id: string;
  sourceText: string;
  sourcePool?: "source_seed" | "live_discovery" | "ingest";
  reprocess?: boolean;
  /**
   * Sportolok camera / city slug (Itthon · Határon túl). Sent as `x-sportolok-camera`
   * so management `getRequestDb` routes into the correct city database.
   */
  camera?: "itthon" | "hataron-tul";
};

export type IngestPatchBody = {
  id: string;
  /** Must already satisfy management listing patch rules + content-data-contract */
  patch: Record<string, unknown>;
  camera?: "itthon" | "hataron-tul";
};

async function postJson(
  cfg: IngestConfig,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/api/ingest`;
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

function cameraHeaders(camera?: "itthon" | "hataron-tul"): Record<string, string> | undefined {
  if (!camera) return undefined;
  return { "x-sportolok-camera": camera, "x-engine-city": camera };
}

export async function ingestSourceText(cfg: IngestConfig, body: IngestSourceBody): Promise<unknown> {
  const res = await postJson(
    cfg,
    {
      id: body.id,
      sourceText: body.sourceText,
      sourcePool: body.sourcePool ?? "ingest",
      reprocess: body.reprocess ?? false,
    },
    cameraHeaders(body.camera),
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ingest source failed ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

export async function ingestPatch(cfg: IngestConfig, body: IngestPatchBody): Promise<unknown> {
  const res = await postJson(
    cfg,
    { id: body.id, patch: body.patch },
    cameraHeaders(body.camera),
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ingest patch failed ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

/** Alias used by quality-loop ingest stub */
export const ingestListingPatch = ingestPatch;
