/**
 * Public ingest client for ClassScout / Your Field (`moldovancsaba/classscout`).
 * ONLY allowed write path for this agent — never open Mongo from here for listing mutations.
 *
 * Auth: Authorization Bearer INGEST_API_KEY (or documented SSO machine token).
 * Body: batch `{ operations: [...] }` or a single operation — see content-data-contract.md.
 */

export type IngestConfig = {
  /** e.g. https://getyourfield.com */
  baseUrl: string;
  /** INGEST_API_KEY */
  apiKey: string;
};

export type IngestOperation = {
  resource: string;
  action: string;
  document?: Record<string, unknown>;
  patch?: Record<string, unknown>;
  id?: string;
  [key: string]: unknown;
};

async function postJson(cfg: IngestConfig, path: string, body: unknown): Promise<Response> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}${path}`;
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

export async function ingestOperations(
  cfg: IngestConfig,
  operations: IngestOperation[],
): Promise<unknown> {
  const res = await postJson(cfg, "/api/ingest", { operations });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ingest failed ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

export async function upsertProvider(
  cfg: IngestConfig,
  document: Record<string, unknown>,
): Promise<unknown> {
  return ingestOperations(cfg, [{ resource: "provider", action: "upsert", document }]);
}

export async function patchProvider(
  cfg: IngestConfig,
  id: string,
  patch: Record<string, unknown>,
): Promise<unknown> {
  return ingestOperations(cfg, [{ resource: "provider", action: "patch", id, patch }]);
}

/** Multipart upload → hosted image URL (R2 preferred when product is configured). */
export async function uploadListingImage(cfg: IngestConfig, file: Blob, filename = "image.jpg"): Promise<{
  url: string;
  displayUrl?: string;
}> {
  const form = new FormData();
  form.append("file", file, filename);
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/api/ingest/upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as { url?: string; displayUrl?: string; error?: string };
  if (!res.ok || !json.url) {
    throw new Error(`upload failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return { url: json.url, displayUrl: json.displayUrl };
}

export async function ingestCapabilities(cfg: IngestConfig): Promise<unknown> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/api/ingest`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ingest GET failed ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
