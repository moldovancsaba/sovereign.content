/**
 * Tests for the Sovereign Agent — autonomous content decision-making.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  evaluateCard,
  evaluateListing,
  calculateAccuracy,
  DEFAULT_SOVEREIGN_CONFIG,
  type SovereignAgentConfig,
  type SovereignDecision,
} from "./agent";
import type { ContentCard } from "@/lib/pipeline/cards";
import type { Listing } from "@/lib/entity/listing";

describe("Sovereign Agent", () => {
  describe("evaluateCard", () => {
    const mockCard: ContentCard = {
      id: "card-test-123",
      state: "REVIEW_READY",
      sourcePool: "discovery/test",
      lastReason: "extracted",
      updatedAt: new Date(),
      extractedText: {
        description: "This is a test description that meets the minimum length requirement for quality evaluation.",
        schedule: ["Monday 10:00-11:00", "Wednesday 15:00-16:00"],
      },
      extractedImages: [
        { url: "https://example.com/image1.jpg", altText: "Test image" },
      ],
      venue: {
        geocode: { lat: 47.4979, lng: 19.0402 },
      },
    };

    it("should approve high-quality cards with confidence above threshold", () => {
      const decision = evaluateCard(mockCard, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.decision).toBe("approve");
      expect(decision.confidence).toBeGreaterThanOrEqual(0.95);
      expect(decision.decisionType).toBe("quality-gate");
      expect(decision.subjectType).toBe("card");
      expect(decision.reasoning).toContain("meets threshold");
    });

    it("should escalate cards with insufficient description length", () => {
      const shortDescCard: ContentCard = {
        ...mockCard,
        extractedText: {
          ...mockCard.extractedText,
          description: "Too short",
        },
      };

      const decision = evaluateCard(shortDescCard, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.decision).toBe("escalate");
      expect(decision.confidence).toBeLessThan(0.95);
      expect(decision.evidence.flags).toContain("short-description");
      expect(decision.reasoning).toContain("below 100 minimum");
    });

    it("should reject cards with confidence below hard floor", () => {
      const poorCard: ContentCard = {
        ...mockCard,
        extractedText: {
          description: "Bad",
          schedule: [],
        },
        extractedImages: [],
        venue: {},
      };

      const decision = evaluateCard(poorCard, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.decision).toBe("reject");
      expect(decision.confidence).toBeLessThan(0.5);
      expect(decision.reasoning).toContain("too low, below 0.5 hard floor");
    });

    it("should remediate cards with fixable issues", () => {
      const fixableCard: ContentCard = {
        ...mockCard,
        extractedText: {
          description: "Short but fixable",
          schedule: ["Monday 10:00-11:00"],
        },
        venue: {
          geocode: { lat: 47.4979, lng: 19.0402 },
        },
      };

      const decision = evaluateCard(fixableCard, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.decision).toBe("remediate");
      expect(decision.evidence.flags).toContain("short-description");
      expect(decision.reasoning).toContain("Fixable issues detected");
    });

    it("should calculate all quality factors correctly", () => {
      const decision = evaluateCard(mockCard, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.evidence.factorScores).toHaveProperty("descriptionLength");
      expect(decision.evidence.factorScores).toHaveProperty("imageCount");
      expect(decision.evidence.factorScores).toHaveProperty("geocode");
      
      expect(decision.evidence.factorScores.descriptionLength).toBeGreaterThan(0);
      expect(decision.evidence.factorScores.imageCount).toBe(1.0);
      expect(decision.evidence.factorScores.geocode).toBe(1.0);
    });

    it("should respect custom quality gates", () => {
      const strictConfig: SovereignAgentConfig = {
        ...DEFAULT_SOVEREIGN_CONFIG,
        qualityGates: {
          minDescriptionLength: 200,
          minImageCount: 3,
          requiresSchedule: true,
          requiresPricing: false,
          requiresGeocode: true,
        },
      };

      const decision = evaluateCard(mockCard, strictConfig);

      expect(decision.confidence).toBeLessThan(1.0);
      expect(decision.evidence.flags).toContain("short-description");
      expect(decision.evidence.flags).toContain("insufficient-images");
    });

    it("should flag missing geocode when required", () => {
      const noGeoCard: ContentCard = {
        ...mockCard,
        venue: {},
      };

      const decision = evaluateCard(noGeoCard, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.evidence.flags).toContain("missing-geocode");
      expect(decision.evidence.factorScores.geocode).toBe(0.0);
    });

    it("should flag missing schedule when required", () => {
      const noScheduleCard: ContentCard = {
        ...mockCard,
        extractedText: {
          ...mockCard.extractedText,
          schedule: [],
        },
      };

      const decision = evaluateCard(noScheduleCard, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.evidence.flags).toContain("missing-schedule");
      expect(decision.evidence.factorScores.schedule).toBe(0.0);
    });

    it("should generate unique decision IDs", () => {
      const decision1 = evaluateCard(mockCard, DEFAULT_SOVEREIGN_CONFIG);
      const decision2 = evaluateCard(mockCard, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision1.id).not.toBe(decision2.id);
      expect(decision1.id).toMatch(/^sovereign-/);
      expect(decision2.id).toMatch(/^sovereign-/);
    });

    it("should include timestamp in decision", () => {
      const beforeTime = new Date();
      const decision = evaluateCard(mockCard, DEFAULT_SOVEREIGN_CONFIG);
      const afterTime = new Date();

      expect(decision.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(decision.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe("evaluateListing", () => {
    const mockListing: Listing = {
      id: "l-test-456",
      name: "Test Sport Club",
      description: "This is a comprehensive test description that provides adequate information about the sport club and its offerings.",
      lifecycleState: "PUBLISHED",
      activityTypes: ["tanfolyam"],
      images: [
        { url: "https://example.com/image1.jpg", altText: "Club photo" },
        { url: "https://example.com/image2.jpg", altText: "Training area" },
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

    it("should approve complete, quality listings", () => {
      const decision = evaluateListing(mockListing, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.decision).toBe("approve");
      expect(decision.reasoning).toContain("All quality checks passed");
      expect(decision.evidence.flags).toHaveLength(0);
    });

    it("should remediate listings with fixable quality issues", () => {
      const incompleteListing: Listing = {
        ...mockListing,
        description: "Too short",
        images: [],
      };

      const decision = evaluateListing(incompleteListing, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.decision).toBe("remediate");
      expect(decision.evidence.flags).toContain("short-description");
      expect(decision.evidence.flags).toContain("insufficient-images");
      expect(decision.reasoning).toContain("Fixable quality issues");
    });

    it("should escalate listings with critical missing data", () => {
      const criticalIssueListing: Listing = {
        ...mockListing,
        venue: {}, // missing geocode
      };

      const decision = evaluateListing(criticalIssueListing, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.decision).toBe("escalate");
      expect(decision.evidence.flags).toContain("missing-geocode");
      expect(decision.reasoning).toContain("Critical issue: missing location data");
    });

    it("should calculate quality factors for listings", () => {
      const decision = evaluateListing(mockListing, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.evidence.factorScores).toHaveProperty("descriptionQuality");
      expect(decision.evidence.factorScores).toHaveProperty("imageQuality");
      expect(decision.evidence.factorScores).toHaveProperty("scheduleCompleteness");
      expect(decision.evidence.factorScores).toHaveProperty("geoAccuracy");

      expect(decision.evidence.factorScores.descriptionQuality).toBe(1.0);
      expect(decision.evidence.factorScores.imageQuality).toBe(1.0);
      expect(decision.evidence.factorScores.geoAccuracy).toBe(1.0);
    });

    it("should give partial credit for missing schedule", () => {
      const noScheduleListing: Listing = {
        ...mockListing,
        schedule: [],
      };

      const decision = evaluateListing(noScheduleListing, DEFAULT_SOVEREIGN_CONFIG);

      expect(decision.evidence.factorScores.scheduleCompleteness).toBe(0.5);
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.confidence).toBeLessThan(1.0);
    });
  });

  describe("calculateAccuracy", () => {
    let mockDb: any;

    beforeEach(() => {
      // Mock MongoDB collection
      mockDb = {
        collection: (name: string) => ({
          find: () => ({
            toArray: async () => {
              // Mock decision history with overrides
              return [
                {
                  vertical: "sportolok",
                  decisionType: "quality-gate",
                  decision: "approve",
                  override: { overrideDecision: "approve" },
                },
                {
                  vertical: "sportolok",
                  decisionType: "quality-gate",
                  decision: "approve",
                  override: { overrideDecision: "approve" },
                },
                {
                  vertical: "sportolok",
                  decisionType: "quality-gate",
                  decision: "reject",
                  override: { overrideDecision: "reject" },
                },
                {
                  vertical: "sportolok",
                  decisionType: "quality-gate",
                  decision: "approve",
                  override: { overrideDecision: "reject" }, // False positive
                },
                {
                  vertical: "sportolok",
                  decisionType: "quality-gate",
                  decision: "reject",
                  override: { overrideDecision: "approve" }, // False negative
                },
              ];
            },
          }),
        }),
      };
    });

    it("should calculate agreement rate correctly", async () => {
      const accuracy = await calculateAccuracy(mockDb, "sportolok", "quality-gate", 5);

      expect(accuracy.sampleSize).toBe(5);
      expect(accuracy.agreementRate).toBe(0.6); // 3 agreements out of 5
      expect(accuracy.falsePositiveRate).toBe(0.2); // 1 out of 5
      expect(accuracy.falseNegativeRate).toBe(0.2); // 1 out of 5
    });

    it("should not allow autonomization below 95% agreement", async () => {
      const accuracy = await calculateAccuracy(mockDb, "sportolok", "quality-gate", 5);

      expect(accuracy.canAutonomize).toBe(false);
      expect(accuracy.agreementRate).toBeLessThan(0.95);
    });

    it("should require minimum sample size", async () => {
      mockDb.collection = () => ({
        find: () => ({
          toArray: async () => [
            {
              vertical: "sportolok",
              decisionType: "quality-gate",
              decision: "approve",
              override: { overrideDecision: "approve" },
            },
          ],
        }),
      });

      const accuracy = await calculateAccuracy(mockDb, "sportolok", "quality-gate", 100);

      expect(accuracy.sampleSize).toBe(1);
      expect(accuracy.canAutonomize).toBe(false);
      expect(accuracy.agreementRate).toBe(0); // Not enough samples
    });

    it("should allow autonomization with high agreement and sufficient samples", async () => {
      // Mock 100 decisions with 96% agreement
      const mockDecisions = Array.from({ length: 100 }, (_, i) => ({
        vertical: "sportolok",
        decisionType: "quality-gate",
        decision: i < 96 ? "approve" : "reject",
        override: { overrideDecision: i < 96 ? "approve" : "approve" }, // 4 false negatives
      }));

      mockDb.collection = () => ({
        find: () => ({
          toArray: async () => mockDecisions,
        }),
      });

      const accuracy = await calculateAccuracy(mockDb, "sportolok", "quality-gate", 100);

      expect(accuracy.sampleSize).toBe(100);
      expect(accuracy.agreementRate).toBe(0.96);
      expect(accuracy.canAutonomize).toBe(true);
    });
  });

  describe("DEFAULT_SOVEREIGN_CONFIG", () => {
    it("should have sensible default values", () => {
      expect(DEFAULT_SOVEREIGN_CONFIG.enabled).toBe(false);
      expect(DEFAULT_SOVEREIGN_CONFIG.autonomyThreshold).toBe(0.95);
      expect(DEFAULT_SOVEREIGN_CONFIG.qualityGates.minDescriptionLength).toBe(100);
      expect(DEFAULT_SOVEREIGN_CONFIG.qualityGates.requiresGeocode).toBe(true);
      expect(DEFAULT_SOVEREIGN_CONFIG.learning.enabled).toBe(true);
      expect(DEFAULT_SOVEREIGN_CONFIG.learning.minSampleSize).toBe(100);
    });

    it("should include essential decision types", () => {
      expect(DEFAULT_SOVEREIGN_CONFIG.allowedDecisions).toContain("quality-gate");
      expect(DEFAULT_SOVEREIGN_CONFIG.allowedDecisions).toContain("content-enrichment");
    });

    it("should have balanced delivery rules", () => {
      const totalWeight = DEFAULT_SOVEREIGN_CONFIG.deliveryRules.priorityFactors
        .reduce((sum, f) => sum + f.weight, 0);

      expect(totalWeight).toBe(1.0); // Weights should sum to 1
    });
  });
});
