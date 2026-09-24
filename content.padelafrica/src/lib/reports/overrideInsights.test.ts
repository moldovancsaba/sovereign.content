import { describe, expect, it } from "vitest";
import { renderOverrideInsights, type OverrideInsightsDigest } from "./overrideInsights";

describe("renderOverrideInsights", () => {
  it("says when nothing repeated", () => {
    const d: OverrideInsightsDigest = {
      generatedAt: "2026-09-23T00:00:00.000Z",
      windowHours: 168,
      since: "2026-09-16T00:00:00.000Z",
      waivedPublishCount: 1,
      byFamily: [],
      lessons: [],
    };
    expect(renderOverrideInsights(d)).toMatch(/No repeated waiver/);
  });

  it("lists suggestions without inventing percentages", () => {
    const d: OverrideInsightsDigest = {
      generatedAt: "2026-09-23T00:00:00.000Z",
      windowHours: 168,
      since: "2026-09-16T00:00:00.000Z",
      waivedPublishCount: 4,
      byFamily: [
        {
          family: "completeness",
          activitySlug: "tournaments",
          count: 3,
          suggestion: "hint",
        },
      ],
      lessons: [],
    };
    const text = renderOverrideInsights(d);
    expect(text).toContain("completeness / tournaments ×3");
    expect(text).toContain("hint");
    expect(text).not.toMatch(/%/);
  });
});
