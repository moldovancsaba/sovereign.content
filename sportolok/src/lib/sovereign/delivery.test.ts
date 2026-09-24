/**
 * Tests for Sovereign Delivery Optimizer — intelligent content prioritization.
 */

import { describe, it, expect } from "vitest";
import {
  calculateDeliveryPriority,
  planDeliveryWindows,
  deriveAudienceSegments,
  DeliveryRateLimiter,
} from "./delivery";
import { DEFAULT_SOVEREIGN_CONFIG } from "./agent";
import type { Listing } from "@/lib/entity/listing";

describe("Sovereign Delivery", () => {
  describe("calculateDeliveryPriority", () => {
    const mockListing: Listing = {
      id: "l-test-123",
      name: "Test Uszoda",
      description: "A comprehensive description with adequate detail about the swimming pool facility and its programs.",
      lifecycleState: "PUBLISHED",
      activityTypes: ["tanfolyam"],
      images: [
        { url: "https://example.com/pool.jpg", altText: "Pool photo" },
      ],
      schedule: [
        { dayOfWeek: "monday", startTime: "10:00", endTime: "11:00", timezone: "Europe/Budapest" },
      ],
      venue: {
        geocode: { lat: 47.4979, lng: 19.0402 },
        locality: { settlement: "Budapest" },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should calculate priority score for complete listing", () => {
      const coverageGaps = new Map([["tanfolyam", 0.8]]);
      const demandSignals = new Map([["tanfolyam", 0.9]]);

      const priority = calculateDeliveryPriority(mockListing, {
        config: DEFAULT_SOVEREIGN_CONFIG,
        coverageGaps,
        demandSignals,
        publishedAt: new Date(),
      });

      expect(priority.score).toBeGreaterThan(0);
      expect(priority.score).toBeLessThanOrEqual(100);
      expect(priority.listingId).toBe("l-test-123");
      expect(priority.factors).toHaveProperty("coverageGap");
      expect(priority.factors).toHaveProperty("completeness");
      expect(priority.factors).toHaveProperty("demand");
      expect(priority.factors).toHaveProperty("newness");
    });

    it("should prioritize listings in high coverage gaps", () => {
      const highGapCoverage = new Map([["tanfolyam", 0.9]]);
      const lowGapCoverage = new Map([["tanfolyam", 0.1]]);
      const demandSignals = new Map([["tanfolyam", 0.5]]);
      const publishedAt = new Date();

      const highGapPriority = calculateDeliveryPriority(mockListing, {
        config: DEFAULT_SOVEREIGN_CONFIG,
        coverageGaps: highGapCoverage,
        demandSignals,
        publishedAt,
      });

      const lowGapPriority = calculateDeliveryPriority(mockListing, {
        config: DEFAULT_SOVEREIGN_CONFIG,
        coverageGaps: lowGapCoverage,
        demandSignals,
        publishedAt,
      });

      expect(highGapPriority.score).toBeGreaterThan(lowGapPriority.score);
      expect(highGapPriority.factors.coverageGap).toBe(0.9);
      expect(lowGapPriority.factors.coverageGap).toBe(0.1);
    });

    it("should score completeness based on quality gates", () => {
      const incompleteListing: Listing = {
        ...mockListing,
        description: "Short",
        images: [],
        schedule: [],
        venue: {},
      };

      const coverageGaps = new Map();
      const demandSignals = new Map();
      const publishedAt = new Date();

      const completePriority = calculateDeliveryPriority(mockListing, {
        config: DEFAULT_SOVEREIGN_CONFIG,
        coverageGaps,
        demandSignals,
        publishedAt,
      });

      const incompletePriority = calculateDeliveryPriority(incompleteListing, {
        config: DEFAULT_SOVEREIGN_CONFIG,
        coverageGaps,
        demandSignals,
        publishedAt,
      });

      expect(completePriority.factors.completeness).toBe(1.0);
      expect(incompletePriority.factors.completeness).toBe(0);
      expect(completePriority.score).toBeGreaterThan(incompletePriority.score);
    });

    it("should decay newness factor over time", () => {
      const coverageGaps = new Map();
      const demandSignals = new Map();
      
      const justPublished = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

      const newPriority = calculateDeliveryPriority(mockListing, {
        config: DEFAULT_SOVEREIGN_CONFIG,
        coverageGaps,
        demandSignals,
        publishedAt: justPublished,
      });

      const oldPriority = calculateDeliveryPriority(mockListing, {
        config: DEFAULT_SOVEREIGN_CONFIG,
        coverageGaps,
        demandSignals,
        publishedAt: thirtyDaysAgo,
      });

      expect(newPriority.factors.newness).toBeGreaterThan(oldPriority.factors.newness);
      expect(oldPriority.factors.newness).toBeGreaterThanOrEqual(0);
    });

    it("should respect configured priority weights", () => {
      const customConfig = {
        ...DEFAULT_SOVEREIGN_CONFIG,
        deliveryRules: {
          priorityFactors: [
            { factor: "coverage-gap" as const, weight: 1.0 }, // 100% coverage gap
            { factor: "completeness" as const, weight: 0.0 },
            { factor: "demand" as const, weight: 0.0 },
            { factor: "newness" as const, weight: 0.0 },
          ],
          maxPublishRate: 50,
        },
      };

      const coverageGaps = new Map([["tanfolyam", 0.5]]);
      const demandSignals = new Map();

      const priority = calculateDeliveryPriority(mockListing, {
        config: customConfig,
        coverageGaps,
        demandSignals,
        publishedAt: new Date(),
      });

      // Score should be approximately 50 (0.5 gap * 100% weight * 100 scale)
      expect(priority.score).toBeGreaterThan(40);
      expect(priority.score).toBeLessThan(60);
    });

    it("should include expiration timestamp", () => {
      const beforeTime = Date.now();
      
      const priority = calculateDeliveryPriority(mockListing, {
        config: DEFAULT_SOVEREIGN_CONFIG,
        coverageGaps: new Map(),
        demandSignals: new Map(),
        publishedAt: new Date(),
      });

      const expectedExpiry = beforeTime + 3600000; // 1 hour
      expect(priority.expiresAt.getTime()).toBeGreaterThan(beforeTime);
      expect(priority.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
    });
  });

  describe("planDeliveryWindows", () => {
    const mockListing: Listing = {
      id: "l-test-456",
      name: "Test Activity",
      lifecycleState: "PUBLISHED",
      activityTypes: ["tanfolyam"],
      ageBands: ["ovodas", "also-tagozat"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should plan immediate delivery for high-priority content", () => {
      const highPriority = {
        listingId: "l-test-456",
        score: 85,
        factors: {
          coverageGap: 0.9,
          completeness: 1.0,
          demand: 0.8,
          newness: 0.7,
          engagement: 0.5,
        },
        computedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      const windows = planDeliveryWindows(mockListing, highPriority);

      expect(windows.listingId).toBe("l-test-456");
      expect(windows.windows.length).toBeGreaterThan(0);
      expect(windows.windows[0].priority).toBe("high");
      
      const now = Date.now();
      expect(windows.windows[0].start.getTime()).toBeLessThanOrEqual(now + 60000); // Within 1 min
    });

    it("should plan peak-hour delivery for medium-priority content", () => {
      const mediumPriority = {
        listingId: "l-test-456",
        score: 60,
        factors: {
          coverageGap: 0.5,
          completeness: 0.8,
          demand: 0.6,
          newness: 0.5,
          engagement: 0.5,
        },
        computedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      const windows = planDeliveryWindows(mockListing, mediumPriority);

      expect(windows.windows.length).toBeGreaterThan(0);
      expect(windows.windows.some(w => w.priority === "medium")).toBe(true);
      
      // Should include morning or evening peak hours
      const hasPeakHours = windows.windows.some(w => {
        const hour = w.start.getHours();
        return (hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 21);
      });
      expect(hasPeakHours).toBe(true);
    });

    it("should plan off-peak delivery for low-priority content", () => {
      const lowPriority = {
        listingId: "l-test-456",
        score: 30,
        factors: {
          coverageGap: 0.2,
          completeness: 0.6,
          demand: 0.3,
          newness: 0.1,
          engagement: 0.5,
        },
        computedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      const windows = planDeliveryWindows(mockListing, lowPriority);

      expect(windows.windows.length).toBeGreaterThan(0);
      expect(windows.windows[0].priority).toBe("low");
    });

    it("should target age band audiences", () => {
      const priority = {
        listingId: "l-test-456",
        score: 75,
        factors: {
          coverageGap: 0.8,
          completeness: 1.0,
          demand: 0.7,
          newness: 0.6,
          engagement: 0.5,
        },
        computedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      const windows = planDeliveryWindows(mockListing, priority);

      expect(windows.windows.some(w => 
        w.audienceSegment?.includes("ovodas") && 
        w.audienceSegment?.includes("also-tagozat")
      )).toBe(true);
    });
  });

  describe("deriveAudienceSegments", () => {
    const mockListings: Listing[] = [
      {
        id: "l-1",
        name: "Úszás óvodásoknak",
        lifecycleState: "PUBLISHED",
        activityTypes: ["tanfolyam"],
        ageBands: ["ovodas"],
        venue: { locality: { settlement: "Budapest" } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "l-2",
        name: "Foci alsósoknak",
        lifecycleState: "PUBLISHED",
        activityTypes: ["sportegyesulet"],
        ageBands: ["also-tagozat"],
        venue: { locality: { settlement: "Budapest" } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "l-3",
        name: "Konditerem",
        lifecycleState: "PUBLISHED",
        activityTypes: ["edzoterem"],
        ageBands: ["felnott"],
        venue: { locality: { settlement: "Debrecen" } },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockPack = {
      ageBands: [
        { key: "ovodas", label: "Óvodás, 3–6 év" },
        { key: "also-tagozat", label: "Alsó tagozatos, 6–10 év" },
        { key: "felnott", label: "Felnőtt, 18–60 év" },
      ],
      taxonomy: {
        "tanfolyam": "Tanfolyamok",
        "sportegyesulet": "Sportegyesületek",
        "edzoterem": "Edzőtermek",
      },
    };

    it("should create age-based segments", () => {
      const segments = deriveAudienceSegments(mockListings, mockPack);

      const ageSegments = segments.filter(s => s.id.startsWith("age-"));
      expect(ageSegments.length).toBe(3);

      const ovodasSegment = segments.find(s => s.id === "age-ovodas");
      expect(ovodasSegment).toBeDefined();
      expect(ovodasSegment?.name).toBe("Óvodás, 3–6 év");
      expect(ovodasSegment?.criteria.ageBands).toEqual(["ovodas"]);
      expect(ovodasSegment?.size).toBeGreaterThan(0);
    });

    it("should create category-based segments", () => {
      const segments = deriveAudienceSegments(mockListings, mockPack);

      const categorySegments = segments.filter(s => s.id.startsWith("category-"));
      expect(categorySegments.length).toBe(3);

      const tanfolyamSegment = segments.find(s => s.id === "category-tanfolyam");
      expect(tanfolyamSegment).toBeDefined();
      expect(tanfolyamSegment?.name).toBe("Tanfolyamok");
      expect(tanfolyamSegment?.criteria.categories).toEqual(["tanfolyam"]);
    });

    it("should create location-based segments", () => {
      const segments = deriveAudienceSegments(mockListings, mockPack);

      const locationSegments = segments.filter(s => s.id.startsWith("location-"));
      expect(locationSegments.length).toBe(2); // Budapest and Debrecen

      const budapestSegment = segments.find(s => s.id === "location-Budapest");
      expect(budapestSegment).toBeDefined();
      expect(budapestSegment?.name).toBe("Budapest");
      expect(budapestSegment?.criteria.locations).toEqual(["Budapest"]);
    });

    it("should estimate segment sizes", () => {
      const segments = deriveAudienceSegments(mockListings, mockPack);

      segments.forEach(segment => {
        expect(segment.size).toBeGreaterThan(0);
        expect(typeof segment.size).toBe("number");
      });
    });

    it("should handle listings without age bands", () => {
      const listingsWithoutAgeBands: Listing[] = [
        {
          id: "l-4",
          name: "Sport Boltok",
          lifecycleState: "PUBLISHED",
          activityTypes: ["sportbolt"],
          venue: { locality: { settlement: "Szeged" } },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const segments = deriveAudienceSegments(listingsWithoutAgeBands, mockPack);

      // Should still create category and location segments
      expect(segments.length).toBeGreaterThan(0);
      expect(segments.some(s => s.id.startsWith("category-"))).toBe(true);
      expect(segments.some(s => s.id.startsWith("location-"))).toBe(true);
    });
  });

  describe("DeliveryRateLimiter", () => {
    it("should allow publishing within rate limit", () => {
      const limiter = new DeliveryRateLimiter(10);

      expect(limiter.canPublish()).toBe(true);
      
      limiter.recordPublish();
      expect(limiter.getRemaining()).toBe(9);
      expect(limiter.canPublish()).toBe(true);
    });

    it("should prevent publishing when limit reached", () => {
      const limiter = new DeliveryRateLimiter(3);

      limiter.recordPublish();
      limiter.recordPublish();
      limiter.recordPublish();

      expect(limiter.canPublish()).toBe(false);
      expect(limiter.getRemaining()).toBe(0);
    });

    it("should reset after one hour", (done) => {
      const limiter = new DeliveryRateLimiter(2);

      limiter.recordPublish();
      limiter.recordPublish();
      expect(limiter.canPublish()).toBe(false);

      // Simulate time passing by creating a new limiter with backdated start
      const limiterWithBackdate = new DeliveryRateLimiter(2);
      (limiterWithBackdate as any).hourStartTime = Date.now() - 3600001; // 1 hour + 1ms ago
      (limiterWithBackdate as any).publishedThisHour = 2;

      expect(limiterWithBackdate.canPublish()).toBe(true);
      expect(limiterWithBackdate.getRemaining()).toBe(2);
      
      done();
    });

    it("should track remaining capacity correctly", () => {
      const limiter = new DeliveryRateLimiter(5);

      expect(limiter.getRemaining()).toBe(5);
      
      limiter.recordPublish();
      expect(limiter.getRemaining()).toBe(4);
      
      limiter.recordPublish();
      limiter.recordPublish();
      expect(limiter.getRemaining()).toBe(2);
    });
  });
});
