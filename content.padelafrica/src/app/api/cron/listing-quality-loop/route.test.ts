/**
 * Auth posture for /api/cron/listing-quality-loop — same pattern as serving-reconcile siblings.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn(async () => null) }));
vi.mock("@/lib/cronAuth", () => ({
  authorizeCronRequest: vi.fn(() => false),
  cronAuthMode: vi.fn(() => "secret"),
  logCronDisabledOnce: vi.fn(),
}));

import { GET } from "./route";
import { authorizeCronRequest, cronAuthMode } from "@/lib/cronAuth";

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/cron/listing-quality-loop", { headers });
}

describe("GET /api/cron/listing-quality-loop — cron authorization", () => {
  beforeEach(() => {
    vi.mocked(cronAuthMode).mockReturnValue("secret");
    vi.mocked(authorizeCronRequest).mockReturnValue(false);
  });

  it("refuses 503 when cron auth is disabled", async () => {
    vi.mocked(cronAuthMode).mockReturnValue("disabled");
    const res = await GET(req());
    expect(res.status).toBe(503);
  });

  it("refuses 401 when the credential is missing or wrong", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });
});
