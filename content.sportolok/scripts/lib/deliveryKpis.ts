/**
 * Honest delivery KPIs from /api/machine/catalog triage.
 * Enrich/About patches are not P (published). Report D/E/P from live triage.
 */

export type DeliveryKpis = {
  published: number;
  reviewReady: number;
  discovered: number;
  reviewReadySoftIncomplete: number | null;
  listingsTotal: number | null;
};

export async function fetchDeliveryKpis(
  baseUrl: string,
  apiKey: string,
): Promise<DeliveryKpis> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/machine/catalog?limit=1`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`catalog ${res.status}`);
  }
  const data = (await res.json()) as {
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
  };
}
