import { describe, expect, it } from "vitest";
import type { Listing } from "@/lib/entity/listing";
import {
  applyGeographicGapBoosts,
  countGeoCells,
  GEO_GAP_BOOST_MAX,
  geoCellKey,
  geographicGapBoost,
  geographicGapBoostByListingId,
} from "./geographicGapBoost";

const listing = (id: string, countryCode?: string, locality?: string): Pick<Listing, "id" | "venue"> => {
  if (!countryCode && !locality) return { id } as Pick<Listing, "id" | "venue">;
  return {
    id,
    venue: {
      address: {
        line1: "1 St",
        ...(locality ? { locality } : { locality: "X" }),
        ...(countryCode ? { countryCode } : {}),
      },
    },
  } as Pick<Listing, "id" | "venue">;
};

describe("geographicGapBoost (promote-only, sportolok B2)", () => {
  it("prefers country code cells over locality", () => {
    expect(geoCellKey(listing("a", "ZA", "Cape Town"))).toBe("cc:ZA");
    expect(geoCellKey(listing("b", undefined, "Budapest"))).toBe("loc:budapest");
    expect(geoCellKey({ id: "c" } as Pick<Listing, "id" | "venue">)).toBeNull();
  });

  it("gives max boost to the scarcest cell and none to the densest", () => {
    expect(geographicGapBoost(1, 10)).toBeCloseTo(GEO_GAP_BOOST_MAX * 0.9, 10);
    expect(geographicGapBoost(10, 10)).toBe(0);
    expect(geographicGapBoost(0, 10)).toBe(GEO_GAP_BOOST_MAX);
  });

  it("boosts listings in thin countries relative to a dense peer", () => {
    const rows = [
      listing("za1", "ZA"),
      listing("za2", "ZA"),
      listing("za3", "ZA"),
      listing("za4", "ZA"),
      listing("na1", "NA"),
    ];
    const boosts = geographicGapBoostByListingId(rows);
    expect(boosts.get("na1")!).toBeGreaterThan(boosts.get("za1")!);
    expect(boosts.get("za1")).toBe(0);
  });

  it("counts cells and applies additive boosts without touching publish", () => {
    expect(countGeoCells([listing("a", "BW"), listing("b", "BW"), listing("c", "ZM")]).get("cc:BW")).toBe(2);
    const ranks = new Map([
      ["thin", 0.5],
      ["dense", 0.8],
    ]);
    const boosted = applyGeographicGapBoosts(ranks, new Map([["thin", 0.15], ["dense", 0]]));
    expect(boosted.get("thin")).toBeCloseTo(0.65, 10);
    expect(boosted.get("dense")).toBe(0.8);
    expect(ranks.get("thin")).toBe(0.5); // original map unchanged
  });
});
