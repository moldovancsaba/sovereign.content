/**
 * Public ingest client for the sportolok management instance.
 * ONLY allowed write path for this agent — never open Mongo from here.
 */

export type IngestConfig = {
  /** e.g. https://sport.doneisbetter.com */
  baseUrl: string;
  apiKey: string;
};

export type IngestSourceBody = {
  id: string;
  sourceText: string;
  sourcePool?: "source_seed" | "live_discovery" | "ingest";
  reprocess?: boolean;
};

export type IngestPatchBody = {
  id: string;
  patch: Record<string, unknown>;
};

async function postJson(cfg: IngestConfig, body: unknown): Promise<Response> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/api/ingest`;
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
    },
    body: JSON.stringify(body),
  });
}

export async function ingestSourceText(cfg: IngestConfig, body: IngestSourceBody): Promise<unknown> {
  const res = await postJson(cfg, {
    id: body.id,
    sourceText: body.sourceText,
    sourcePool: body.sourcePool ?? "ingest",
    reprocess: body.reprocess ?? false,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ingest source failed ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

export async function ingestPatch(cfg: IngestConfig, body: IngestPatchBody): Promise<unknown> {
  const res = await postJson(cfg, { id: body.id, patch: body.patch });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ingest patch failed ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
