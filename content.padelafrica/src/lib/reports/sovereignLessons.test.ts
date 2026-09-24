import { describe, expect, it } from "vitest";
import {
  lessonEffectFor,
  lessonFromOverrideRow,
  renderSovereignLessons,
  SovereignLessonSchema,
} from "./sovereignLessons";

describe("sovereignLessons effect rules", () => {
  it("never softens geo / safety / territory / knowledge", () => {
    expect(lessonEffectFor("real-address")).toBe("none");
    expect(lessonEffectFor("territory")).toBe("none");
    expect(lessonEffectFor("safety")).toBe("none");
    expect(lessonEffectFor("knowledge")).toBe("none");
  });

  it("suggests soften-required only for completeness / media", () => {
    expect(lessonEffectFor("completeness")).toBe("soften-required");
    expect(lessonEffectFor("media-readiness")).toBe("soften-required");
    expect(lessonEffectFor("provider-identity")).toBe("suggest-config");
  });

  it("builds a validated lesson that stays suggest-only", () => {
    const lesson = lessonFromOverrideRow({
      family: "completeness",
      activitySlug: "tournaments",
      count: 3,
      suggestion: "Review activityCompleteness for tournaments.",
      createdAt: "2026-09-23T00:00:00.000Z",
    });
    expect(SovereignLessonSchema.parse(lesson).effect).toBe("soften-required");
    expect(lesson.suggestion).toMatch(/soften-required/);
    expect(lesson.suggestion).not.toMatch(/autonomyThreshold|0\.9/);
  });

  it("marks real-address lessons as none", () => {
    const lesson = lessonFromOverrideRow({
      family: "real-address",
      activitySlug: null,
      count: 2,
      suggestion: "Prefer Nominatim after street-level line1.",
      createdAt: "2026-09-23T00:00:00.000Z",
    });
    expect(lesson.effect).toBe("none");
    expect(renderSovereignLessons([lesson])).toMatch(/Effect=none/);
  });
});
