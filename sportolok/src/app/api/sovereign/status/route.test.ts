/**
 * Integration tests for GET /api/sovereign/status
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/requireIngestKey", () => ({
  requireIngestKey: vi.fn(),
}));

vi.mock("@/lib/auth/machineToken", () => ({
  SCOPE_CATALOG_READ: "management:catalog.read",
}));

vi.mock("@/lib/vertical/resolve", () => ({
  getVertical: vi.fn(),
}));

vi.mock("@/lib/sovereign/agent", () => ({
  calculateAccuracy: vi.fn(),
}));

import { getDb } from "@/lib/mongodb";
import { requireIngestKey } from "@/lib/requireIngestKey";
import { getVertical } from "@/lib/vertical/resolve";
import { calculateAccuracy } from "@/lib/sovereign/agent";

describe("GET /api/sovereign/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 503 when database unavailable", async () => {
    (requireIngestKey as any).mockResolvedValue({ denied: null });
    (getDb as any).mockResolvedValue(null);

    const mockRequest = new Request("http://localhost:3000/api/sovereign/status");
    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe("unavailable");
  });

  it("should return disabled status when sovereign agent not configured", async () => {
    (requireIngestKey as any).mockResolvedValue({ denied: null });
    (getDb as any).mockResolvedValue({});
    (getVertical as any).mockReturnValue({
      pack: {
        slug: "test-vertical",
        // No sovereignAgent config
      },
    });

    const mockRequest = new Request("http://localhost:3000/api/sovereign/status");
    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.enabled).toBe(false);
    expect(data.vertical).toBe("test-vertical");
  });

  it("should return full status when sovereign agent enabled", async () => {
    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === "sovereign_decisions") {
          return {
            find: vi.fn(() => ({
              sort: vi.fn(() => ({
                limit: vi.fn(() => ({
                  project: vi.fn(() => ({
                    toArray: vi.fn(async () => [
                      {
                        id: "decision-1",
                        timestamp: new Date(),
                        decisionType: "quality-gate",
                        decision: "approve",
                        confidence: 0.96,
                      },
                    ]),
                  })),
                })),
              })),
            })),
            aggregate: vi.fn(() => ({
              toArray: vi.fn(async () => [
                { _id: "quality-gate", count: 150 },
                { _id: "delivery-priority", count: 200 },
              ]),
            })),
            countDocuments: vi.fn(async (query: any) => {
              if (query.override) return 15; // overridden
              return 350; // total
            }),
          };
        }
        if (name === "listings") {
          return {
            aggregate: vi.fn(() => ({
              toArray: vi.fn(async () => [
                {
                  _id: null,
                  avgPriority: 67.5,
                  maxPriority: 98,
                  minPriority: 12,
                  count: 342,
                },
              ]),
            })),
          };
        }
        return {};
      }),
    };

    (requireIngestKey as any).mockResolvedValue({ denied: null });
    (getDb as any).mockResolvedValue(mockDb);
    (getVertical as any).mockReturnValue({
      pack: {
        slug: "sportolok",
        sovereignAgent: {
          enabled: true,
          allowedDecisions: ["quality-gate", "delivery-priority"],
          autonomyThreshold: 0.95,
          qualityGates: {
            minDescriptionLength: 150,
            minImageCount: 1,
            requiresSchedule: true,
            requiresPricing: false,
            requiresGeocode: true,
          },
          deliveryRules: {
            priorityFactors: [
              { factor: "coverage-gap", weight: 0.45 },
              { factor: "completeness", weight: 0.25 },
              { factor: "demand", weight: 0.20 },
              { factor: "newness", weight: 0.10 },
            ],
            maxPublishRate: 40,
          },
          learning: {
            enabled: true,
            minSampleSize: 100,
            retrainingFrequency: "weekly",
          },
        },
      },
    });

    (calculateAccuracy as any).mockResolvedValue({
      sampleSize: 150,
      agreementRate: 0.96,
      falsePositiveRate: 0.02,
      falseNegativeRate: 0.02,
      canAutonomize: true,
    });

    const mockRequest = new Request("http://localhost:3000/api/sovereign/status");
    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.enabled).toBe(true);
    expect(data.vertical).toBe("sportolok");
    expect(data.configuration).toBeDefined();
    expect(data.configuration.autonomyThreshold).toBe(0.95);
    expect(data.metrics).toBeDefined();
    expect(data.metrics.totalDecisions).toBe(350);
    expect(data.metrics.overrideRate).toBeCloseTo(15 / 350);
    expect(data.deliveryQueue).toBeDefined();
    expect(data.deliveryQueue.itemsQueued).toBe(342);
    expect(data.deliveryQueue.avgPriority).toBe(68); // rounded
  });

  it("should require authentication", async () => {
    const denied = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    (requireIngestKey as any).mockResolvedValue({ denied });

    const mockRequest = new Request("http://localhost:3000/api/sovereign/status");
    const response = await GET(mockRequest as any);

    expect(response.status).toBe(401);
  });

  it("should include recent decisions in response", async () => {
    const recentDecisions = [
      {
        id: "decision-1",
        timestamp: new Date("2026-09-23T10:00:00Z"),
        decisionType: "quality-gate",
        decision: "approve",
        confidence: 0.96,
      },
      {
        id: "decision-2",
        timestamp: new Date("2026-09-23T09:30:00Z"),
        decisionType: "delivery-priority",
        decision: "escalate",
        confidence: 0.78,
        override: {
          staffEmail: "operator@example.com",
          overrideDecision: "approve",
        },
      },
    ];

    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === "sovereign_decisions") {
          return {
            find: vi.fn(() => ({
              sort: vi.fn(() => ({
                limit: vi.fn(() => ({
                  project: vi.fn(() => ({
                    toArray: vi.fn(async () => recentDecisions),
                  })),
                })),
              })),
            })),
            aggregate: vi.fn(() => ({
              toArray: vi.fn(async () => []),
            })),
            countDocuments: vi.fn(async () => 100),
          };
        }
        return {
          aggregate: vi.fn(() => ({
            toArray: vi.fn(async () => []),
          })),
        };
      }),
    };

    (requireIngestKey as any).mockResolvedValue({ denied: null });
    (getDb as any).mockResolvedValue(mockDb);
    (getVertical as any).mockReturnValue({
      pack: {
        slug: "sportolok",
        sovereignAgent: {
          enabled: true,
          allowedDecisions: ["quality-gate"],
          autonomyThreshold: 0.95,
          qualityGates: {},
          deliveryRules: {},
          learning: {},
        },
      },
    });

    (calculateAccuracy as any).mockResolvedValue({
      sampleSize: 100,
      agreementRate: 0.95,
      falsePositiveRate: 0.03,
      falseNegativeRate: 0.02,
      canAutonomize: true,
    });

    const mockRequest = new Request("http://localhost:3000/api/sovereign/status");
    const response = await GET(mockRequest as any);
    const data = await response.json();

    expect(data.recentDecisions).toHaveLength(2);
    expect(data.recentDecisions[0].id).toBe("decision-1");
    expect(data.recentDecisions[1].override).toBeDefined();
  });
});
