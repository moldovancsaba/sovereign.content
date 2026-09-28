/**
 * Honest delivery KPIs from /api/machine/catalog triage.
 * Enrich/About patches are not P (published). Report D/E/P from live triage.
 *
 * Pass `camera` so Határon túl (`sportolok_hataron-tul`) is not invisible behind the Itthon base DB.
 */

export type DeliveryKpis = {
  published: number;
  reviewReady: number;
  discovered: number;
  reviewReadySoftIncomplete: number | null;
  listingsTotal: number | null;
  city: string | null;
};

export type SportolokCamera = "itthon" | "hataron-tul";

export async function fetchDeliveryKpis(
  baseUrl: string,
  apiKey: string,
  camera?: SportolokCamera,
): Promise<DeliveryKpis> {
  const headers: Record<string, string> = { "x-api-key": apiKey };
  if (camera) {
    headers["x-sportolok-camera"] = camera;
    headers["x-engine-city"] = camera;
  }
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/machine/catalog?limit=1`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`catalog ${res.status}`);
  }
  const data = (await res.json()) as {
    city?: string | null;
    triage?: {
      byState?: Record<string, number>;
      reviewReadySoftIncomplete?: number;
    };
    catalog?: { total?: number };
  };
  const by = data.triage?.byState ?? {};
  return {
    published: by.PUBLISHED ?? 0,
    reviewReady: by.REVIEW_READY ?? 0,
    discovered: by.DISCOVERED ?? 0,
    reviewReadySoftIncomplete: data.triage?.reviewReadySoftIncomplete ?? null,
    listingsTotal: data.catalog?.total ?? null,
    city: data.city ?? camera ?? null,
  };
}
