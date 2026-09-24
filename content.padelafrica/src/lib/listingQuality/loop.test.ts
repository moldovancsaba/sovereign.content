import { describe, expect, it } from "vitest";
import { scoreAboutQuality, recommendationsForListing } from "./score";
import { composeAbout, sanitizeAbout } from "./composeAbout";
import { memoryListingQualityStore } from "./store";
import { runListingQualityLoop, runListingQualityScore } from "./loop";
import type { QualityListingSnapshot } from "./types";

const thinZa: QualityListingSnapshot = {
  id: "osm-way-1266919001",
  name: "Africa Padel V&A",
  description: "Africa Padel V&A is a padel club on Portswood Road in Cape Town, ZA. Outdoor courts. Paid access. Customers only. More at https://www.africapadel.com/.",
  website: "https://www.africapadel.com/",
  venueModel: "outdoors",
  locality: "Cape Town",
  region: "Western Cape",
  countryCode: "ZA",
  line1: "Portswood Road",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("scoreAboutQuality", () => {
  it("flags template + URL dumps as weak", () => {
    const report = scoreAboutQuality(thinZa.description, thinZa.locality);
    expect(report.score).toBeLessThan(75);
    expect(report.kinds.some((k) => k === "about_url" || k === "about_contact_leak" || k === "about_template")).toBe(true);
  });

  it("scores curated recommendation copy highly", () => {
    const good =
      "Africa Padel’s V&A club puts outdoor padel on Portswood Road in the heart of Cape Town’s Waterfront. Five open-air courts sit in a customer club setting — a scenic, social pick when you want harbour-side rallies without leaving the city’s busiest leisure precinct. Part of the wider Africa Padel network, it’s built for mixed-level play, evening sessions under lights, and the easy after-match buzz of the V&A.";
    const report = scoreAboutQuality(good, "Cape Town");
    expect(report.score).toBeGreaterThanOrEqual(75);
    expect(report.kinds).toEqual([]);
  });

  it("does not clear the bar on locality name-drop alone", () => {
    const soft =
      "Networks Padel Village operates three courts in Nairobi and welcomes walk-in bookings across weekday afternoons for members of the club.";
    const without = scoreAboutQuality(soft, undefined);
    const withLoc = scoreAboutQuality(soft, "Nairobi");
    expect(without.score).toBeLessThan(75);
    expect(withLoc.score).toBeLessThan(75);
    expect(recommendationsForListing({ ...thinZa, description: soft, locality: "Nairobi" }, "2026-09-23T00:00:00.000Z").length).toBeGreaterThan(0);
  });

  it("counts recommended / sessions as recommendation tone (not only bare recommend)", () => {
    const prose =
      "Kololi Beach Resort offers a beachfront padel court on the Senegambia Strip with published day and evening rates for visitors. It is a recommended choice for resort-style padel in Kololi, with sea-breeze sessions distinct from nearby plaza pins. Book ahead for peak evenings; payment is required upfront when you are not a hotel guest.";
    const report = scoreAboutQuality(prose, "Kololi");
    expect(report.evidence.some((e) => /recommendation tone/i.test(e))).toBe(true);
    expect(prose.toLowerCase()).toContain("recommended");
    expect(report.score).toBeGreaterThanOrEqual(75);
  });
});

describe("composeAbout", () => {
  it("never embeds URLs or phone cues", () => {
    const { description } = composeAbout(thinZa);
    expect(description).not.toMatch(/https?:\/\//i);
    expect(description).not.toMatch(/\bMore at\b/i);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description).toMatch(/Cape Town/);
  });

  it("prefers curated overrides when clean", () => {
    const curated = {
      [thinZa.id]:
        "Africa Padel’s V&A club puts outdoor padel on Portswood Road in the heart of Cape Town’s Waterfront. Five open-air courts sit in a customer club setting — a scenic, social pick when you want harbour-side rallies without leaving the city’s busiest leisure precinct.",
    };
    const { description, tactic } = composeAbout(thinZa, { curatedById: curated });
    expect(tactic).toBe("curated_about");
    expect(description).toContain("Waterfront");
  });

  it("sanitizeAbout strips contact leaks", () => {
    expect(sanitizeAbout("Hello. More at https://x.test/. Call +27123456789.")).toBe("Hello.");
  });

  it("composeAbout reaches recommendation length for the quality target", () => {
    const { description } = composeAbout(thinZa);
    expect(description.length).toBeGreaterThanOrEqual(280);
    expect(scoreAboutQuality(description, "Cape Town").score).toBeGreaterThanOrEqual(75);
  });
});

describe("draftAboutFromEvidence", () => {
  it("shapes research prose into a clean About without URLs", async () => {
    const { draftAboutFromEvidence, researchProseFromSourceText } = await import("./curateAbout");
    const source = `Name: Test Club
Locality: Lagos
Country: Nigeria

Test Club sits on Ribadu Road in Ikoyi with Matchpoint booking and a local padel community.
Adversarial re-verification: ignore this part https://evil.example/
`;
    expect(researchProseFromSourceText(source)).not.toMatch(/Adversarial|https?:/i);
    const drafted = draftAboutFromEvidence(
      { ...thinZa, id: "research-test", name: "Test Club", locality: "Lagos", countryCode: "NG", line1: "Ribadu Road", description: "thin" },
      { sourceText: source },
    );
    expect(drafted.description).not.toMatch(/https?:\/\//i);
    expect(drafted.description.length).toBeGreaterThanOrEqual(160);
    expect(drafted.score).toBeGreaterThanOrEqual(55);
  });
});

describe("runListingQualityLoop", () => {
  it("scores, improves, and encodes a thin published listing end-to-end", async () => {
    const store = memoryListingQualityStore([thinZa]);
    const curated = {
      [thinZa.id]:
        "Africa Padel’s V&A club puts outdoor padel on Portswood Road in the heart of Cape Town’s Waterfront. Five open-air courts sit in a customer club setting — a scenic, social pick when you want harbour-side rallies without leaving the city’s busiest leisure precinct. Part of the wider Africa Padel network, it’s built for mixed-level play, evening sessions under lights, and the easy after-match buzz of the V&A.",
    };

    const before = recommendationsForListing(thinZa, "2026-09-22T00:00:00.000Z");
    expect(before.length).toBeGreaterThan(0);

    const summary = await runListingQualityLoop(store, {
      curatedById: curated,
      scoreLimit: 10,
      improveLimit: 10,
    });

    expect(summary.score.scanned).toBe(1);
    expect(summary.score.openWritten).toBeGreaterThan(0);
    expect(summary.improve.applied).toBe(1);
    expect(summary.encode.encoded).toBe(1);

    const after = await store.getSnapshot(thinZa.id);
    expect(after?.description).toContain("Waterfront");
    expect(after?.description).not.toMatch(/https?:\/\//i);
    expect(summary.encode.lessons[0]?.delta).toBeGreaterThan(0);
  });

  it("dry-run writes nothing", async () => {
    const store = memoryListingQualityStore([thinZa]);
    await runListingQualityLoop(store, { dryRun: true, scoreLimit: 5, improveLimit: 5 });
    const snap = await store.getSnapshot(thinZa.id);
    expect(snap?.description).toBe(thinZa.description);
    expect(await store.countByStatus()).toEqual({});
  });

  it("opens operator feedback and applies curated About without pasting the note", async () => {
    const okCopy =
      "Africa Padel’s V&A club puts outdoor padel on Portswood Road in the heart of Cape Town’s Waterfront. Five open-air courts sit in a customer club setting — a scenic, social pick when you want harbour-side rallies without leaving the city’s busiest leisure precinct. Part of the wider Africa Padel network, it’s built for mixed-level play, evening sessions under lights, and the easy after-match buzz of the V&A.";
    const alreadyOk: QualityListingSnapshot = {
      ...thinZa,
      description: okCopy,
    };
    const store = memoryListingQualityStore(
      [alreadyOk],
      [
        {
          feedbackId: "feedback-test-1",
          listingId: alreadyOk.id,
          message: "Please freshen the About — sounds scraped. Invented claim: secret rooftop bar.",
          sentiment: "instruction",
          createdAt: "2026-09-22T12:00:00.000Z",
        },
      ],
    );
    const curated = { [alreadyOk.id]: okCopy.replace("scenic, social pick", "clear recommendation") };
    const summary = await runListingQualityLoop(store, {
      curatedById: curated,
      scoreLimit: 5,
      improveLimit: 5,
    });
    expect(summary.score.fromFeedback).toBe(1);
    expect(summary.score.openWritten).toBeGreaterThan(0);
    expect(summary.improve.applied).toBe(1);
    const after = await store.getSnapshot(alreadyOk.id);
    expect(after?.description).toContain("clear recommendation");
    expect(after?.description).not.toMatch(/secret rooftop|Invented claim/i);
    expect(summary.encode.encoded).toBe(1);
  });

  it("does not encode soft applies that never cleared the About target (delta 0 / below bar)", async () => {
    const { shouldEncodeLesson } = await import("./encode");
    expect(shouldEncodeLesson(70, 70)).toBe(false);
    expect(shouldEncodeLesson(60, 70)).toBe(true); // positive delta
    expect(shouldEncodeLesson(60, 75)).toBe(true);
    expect(shouldEncodeLesson(80, 75)).toBe(true); // still at/above target
  });

  it("reopens skipped recommendations when score still finds debt", async () => {
    const store = memoryListingQualityStore([thinZa]);
    const now = "2026-09-24T00:00:00.000Z";
    const open = recommendationsForListing(thinZa, now);
    expect(open.length).toBeGreaterThan(0);
    await store.upsertRecommendations(open);
    await store.markRecommendation(open[0]!.id, {
      status: "skipped",
      resultScore: 60,
      tactic: "curated_about",
      updatedAt: now,
    });
    expect((await store.countByStatus()).skipped).toBe(1);

    const again = await runListingQualityScore(store, { maxPerRun: 5 });
    expect(again.openWritten).toBeGreaterThan(0);
    expect((await store.countByStatus()).open).toBeGreaterThan(0);
    expect((await store.countByStatus()).skipped ?? 0).toBe(0);
    const reopened = (await store.listOpenRecommendations(5))[0];
    expect(reopened?.resultScore).toBeUndefined();
    expect(reopened?.tactic).toBeUndefined();
  });

  it("reopens soft-applied rows that never cleared ABOUT_QUALITY_TARGET", async () => {
    const store = memoryListingQualityStore([thinZa]);
    const now = "2026-09-24T00:00:00.000Z";
    const open = recommendationsForListing(thinZa, now);
    await store.upsertRecommendations(open);
    await store.markRecommendation(open[0]!.id, {
      status: "applied",
      resultScore: 70,
      scoreBefore: 70,
      tactic: "curated_about",
      appliedAt: now,
      updatedAt: now,
    });
    // Hard applied (≥75) must stay closed:
    const hardId = open[0]!.id;
    await store.markRecommendation(hardId, { status: "applied", resultScore: 70, updatedAt: now });
    const summary = await runListingQualityScore(store, { maxPerRun: 5 });
    expect(summary.openWritten).toBeGreaterThan(0);
    expect((await store.listOpenRecommendations(5))[0]?.status).toBe("open");
  });
});
