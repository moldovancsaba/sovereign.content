import { describe, expect, it } from "vitest";
import {
  extractionFromStructuredHeaders,
  hasStructuredSourceHeaders,
  parseStructuredSourceHeaders,
  resolveCountryCode,
  upsertStructuredSourceHeaders,
} from "./structuredSource";
import type { VerticalPack } from "@/lib/vertical/pack";

const pack = {
  slug: "padel-africa",
  displayName: "Padel Africa",
  taxonomy: { "padel-club": "Padel clubs", "indoor-court": "Indoor courts" },
  listingNoun: { singular: "club", plural: "clubs" },
  locales: ["en-ZA"],
} as unknown as VerticalPack;

const SAMPLE = `URL: https://www.africapadel.com/
Qualified as: padel-club
Name: Africa Padel V&A
Venue: Africa Padel V&A
Address: V&A Waterfront
Locality: Cape Town
Country: South Africa
CountryCode: ZA
Latitude: -33.9085564
Longitude: 18.4140392
Website: https://www.africapadel.com/
Phone: +27211234567

Home BOOK BOOK page dump continues here…`;

describe("structured source headers", () => {
  it("detects Name: headers", () => {
    expect(hasStructuredSourceHeaders(SAMPLE)).toBe(true);
    expect(hasStructuredSourceHeaders("just a page dump")).toBe(false);
  });

  it("parses the leading key/value block and stops at the dump", () => {
    const h = parseStructuredSourceHeaders(SAMPLE);
    expect(h).toMatchObject({
      Name: "Africa Padel V&A",
      CountryCode: "ZA",
      Locality: "Cape Town",
      Website: "https://www.africapadel.com/",
    });
    expect(h?.URL).toBe("https://www.africapadel.com/");
  });

  it("resolves country names when CountryCode is absent", () => {
    expect(resolveCountryCode({ Country: "Democratic Republic of the Congo" })).toBe("CD");
    expect(resolveCountryCode({ Country: "Gabon" })).toBe("GA");
    expect(resolveCountryCode({ CountryCode: "zm" })).toBe("ZM");
  });

  it("builds a schema-valid ExtractionResult from headers", () => {
    const extracted = extractionFromStructuredHeaders(SAMPLE, pack);
    expect(extracted).toMatchObject({
      name: "Africa Padel V&A",
      venueName: "Africa Padel V&A",
      countryCode: "ZA",
      locality: "Cape Town",
      activityTypes: ["padel-club"],
      lat: -33.9085564,
      lng: 18.4140392,
      website: "https://www.africapadel.com/",
      phone: "+27211234567",
    });
  });

  it("synthesizes address/locality so OSM coords without a street still form a venue", () => {
    const text = `Name: PADBOL GABON
Venue: PADBOL GABON
Locality: 
Country: Gabon
Latitude: -0.39
Longitude: 9.45
`;
    const extracted = extractionFromStructuredHeaders(text, pack);
    expect(extracted).toMatchObject({
      name: "PADBOL GABON",
      venueName: "PADBOL GABON",
      // Address empty → Locality empty → Country (geocodeable) before venue name
      addressLine1: "Gabon",
      locality: "Gabon",
      countryCode: "GA",
      lat: -0.39,
      lng: 9.45,
    });
  });

  it("prefers Locality over venue name when Address is empty (geocodeable)", () => {
    const text = `Name: Central Padel
Venue: Central Padel
Locality: Bir El Djir
Country: Algeria
CountryCode: DZ
`;
    const extracted = extractionFromStructuredHeaders(text, pack);
    expect(extracted?.addressLine1).toBe("Bir El Djir");
    expect(extracted?.countryCode).toBe("DZ");
  });

  it("upserts header values without rewriting the page dump", () => {
    const next = upsertStructuredSourceHeaders(SAMPLE, {
      Latitude: "-33.9",
      Longitude: "18.4",
      Phone: "+27000000000",
    });
    expect(next).toMatch(/Latitude: -33\.9/);
    expect(next).toMatch(/Longitude: 18\.4/);
    expect(next).toMatch(/Phone: \+27000000000/);
    expect(next).toMatch(/Home BOOK BOOK page dump continues here/);
  });
});
