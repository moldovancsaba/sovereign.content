import { describe, expect, it } from "vitest";
import {
  decideFindBind,
  preferredTacticOrder,
  recommendationsFromContactEnrich,
  steerTacticsFromLessons,
  buildResearchGapBrief,
} from "./index";
import type { QualityLesson, QualityListingSnapshot } from "@/lib/listingQuality/types";

describe("catalogSelfHeal", () => {
  it("defers FIND when About debt is hot", () => {
    const d = decideFindBind({ openAbout: 3, openResearch: 0 });
    expect(d.mode).toBe("defer_heal_first");
    expect(d.healFirst.some((c) => c.includes("about-curate"))).toBe(true);
  });

  it("allows until-found when only research debt is open", () => {
    const d = decideFindBind({ openAbout: 0, openResearch: 30 });
    expect(d.mode).toBe("until-found");
    expect(d.reason).toMatch(/research gaps remain/);
  });

  it("allows until-found when debt is clear", () => {
    const d = decideFindBind({ openAbout: 0, openResearch: 0 });
    expect(d.mode).toBe("until-found");
  });

  it("steers tactics toward positive-delta lessons", () => {
    const lessons: QualityLesson[] = [
      {
        id: "1",
        listingId: "a",
        recommendationId: "r1",
        kind: "about_thin",
        tactic: "curated_about",
        scoreBefore: 60,
        scoreAfter: 75,
        delta: 15,
        createdAt: "2026-09-24T00:00:00.000Z",
      },
      {
        id: "2",
        listingId: "b",
        recommendationId: "r2",
        kind: "about_thin",
        tactic: "compose_about",
        scoreBefore: 70,
        scoreAfter: 70,
        delta: 0,
        createdAt: "2026-09-24T00:00:00.000Z",
      },
    ];
    const steer = steerTacticsFromLessons(lessons);
    expect(steer[0]?.tactic).toBe("curated_about");
    expect(preferredTacticOrder(lessons)[0]).toBe("curated_about");
  });

  it("opens contact_gap + research_needed from no_evidence enrich rows", () => {
    const snap: QualityListingSnapshot = {
      id: "research-x",
      name: "Test Club",
      description: "About text here that is long enough.",
      locality: "Accra",
      countryCode: "GH",
      updatedAt: "2026-09-24T00:00:00.000Z",
    };
    const recs = recommendationsFromContactEnrich(
      [{ listingId: "research-x", status: "skipped", reason: "no_evidence", fields: [] }],
      new Map([["research-x", snap]]),
      "2026-09-24T12:00:00.000Z",
    );
    expect(recs.map((r) => r.kind).sort()).toEqual(["contact_gap", "research_needed"]);
    expect(recs.every((r) => r.status === "open")).toBe(true);
  });

  it("skips contact debt when listing already has phone or website", () => {
    const snap: QualityListingSnapshot = {
      id: "research-x",
      name: "Test Club",
      description: "About text here that is long enough.",
      locality: "Accra",
      countryCode: "GH",
      website: "https://example.com",
      updatedAt: "2026-09-24T00:00:00.000Z",
    };
    const recs = recommendationsFromContactEnrich(
      [{ listingId: "research-x", status: "skipped", reason: "no_evidence", fields: [] }],
      new Map([["research-x", snap]]),
      "2026-09-24T12:00:00.000Z",
    );
    expect(recs).toEqual([]);
  });

  it("emits an agentRequired research brief with never-invent bar", () => {
    const brief = buildResearchGapBrief({
      id: "research-x",
      name: "Test Club",
      description: "x",
      locality: "Accra",
      countryCode: "GH",
      updatedAt: "2026-09-24T00:00:00.000Z",
    });
    expect(brief.agentRequired).toBe(true);
    expect(brief.searchQueries.length).toBeGreaterThan(0);
    expect(brief.neverInvent).toContain("phone");
  });

  it("surfaces openOperatorFeedback in self-heal status with a quality-loop instruction", async () => {
    const { memoryListingQualityStore } = await import("@/lib/listingQuality/store");
    const { buildSelfHealStatus } = await import("./status");
    const store = memoryListingQualityStore();
    await store.upsertRecommendations([
      {
        id: "lqr_feedback1",
        listingId: "listing-a",
        kind: "operator_feedback",
        severity: "medium",
        scoreBefore: 60,
        status: "open",
        message: "Tone feels generic",
        evidence: [],
        createdAt: "2026-09-24T12:00:00.000Z",
        updatedAt: "2026-09-24T12:00:00.000Z",
      },
    ]);
    const status = await buildSelfHealStatus(store, { processPath: "/tmp/nonexistent-process-lessons.json" });
    expect(status.recommendations.openOperatorFeedback).toBe(1);
    expect(status.recommendations.openAbout).toBe(1);
    expect(status.instructions.some((i) => i.includes("operator_feedback") && i.includes("quality-loop"))).toBe(
      true,
    );
  });
});

describe("hitlDelivery + smart digest", () => {
  it("classifies quality-loop as auto and SSOT contracts as hitl_review", async () => {
    const { classifyDelivery } = await import("./hitlDelivery");
    expect(classifyDelivery("quality_loop_about").delivery).toBe("auto");
    expect(classifyDelivery("media_curate_evidence").delivery).toBe("auto");
    expect(classifyDelivery("find_seed_evidence").delivery).toBe("agent_execute");
    expect(classifyDelivery("ssot_contract_draft").delivery).toBe("hitl_review");
    expect(classifyDelivery("invent_facts").delivery).toBe("hitl_review");
  });

  it("builds a narrative digest with HiTL queue separated from auto commands", async () => {
    const { buildSelfImproveDigest } = await import("./digest");
    const digest = buildSelfImproveDigest({
      processPath: "/tmp/nonexistent-process-lessons.json",
      since: "2020-01-01T00:00:00.000Z",
      now: "2026-09-24T18:00:00.000Z",
      recommendations: [
        {
          id: "lqr_about1",
          listingId: "listing-a",
          kind: "about_chrome",
          severity: "medium",
          scoreBefore: 55,
          status: "open",
          message: "Cookie chrome in About",
          evidence: ["chrome:cookie"],
          createdAt: "2026-09-24T12:00:00.000Z",
          updatedAt: "2026-09-24T12:00:00.000Z",
        },
        {
          id: "lqr_op1",
          listingId: "listing-b",
          kind: "operator_feedback",
          severity: "medium",
          scoreBefore: 70,
          status: "open",
          message: "Tone feels generic",
          evidence: ["note:Tone feels generic"],
          createdAt: "2026-09-24T12:00:00.000Z",
          updatedAt: "2026-09-24T12:00:00.000Z",
        },
        {
          id: "lqr_contact1",
          listingId: "listing-c",
          kind: "contact_gap",
          severity: "medium",
          scoreBefore: 0,
          status: "open",
          message: "missing phone",
          evidence: ["reason:no_evidence"],
          createdAt: "2026-09-24T12:00:00.000Z",
          updatedAt: "2026-09-24T12:00:00.000Z",
        },
      ],
    });
    expect(digest.executiveBrief.length).toBeGreaterThan(40);
    expect(digest.summary.autoCount).toBeGreaterThanOrEqual(1);
    expect(digest.summary.hitlReviewCount).toBeGreaterThanOrEqual(1);
    expect(digest.summary.agentExecuteCount).toBeGreaterThanOrEqual(1);
    expect(digest.autoCommands.some((c) => c.includes("quality-loop"))).toBe(true);
    expect(digest.hitlQueue.some((i) => i.id.includes("lqr_op1"))).toBe(true);
    expect(digest.items.every((i) => i.situation && i.analysis && i.recommendation && i.whyDelivery)).toBe(
      true,
    );
    expect(digest.instructions.some((i) => i.includes("executiveBrief"))).toBe(true);
  });
});
