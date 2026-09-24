/**
 * Unit checks for scarcity research brief ranking + oldest-updated sort.
 */
const assert = require("assert");
const {
  rankThinNeighborhoods,
  rankScarceSports,
  buildResearchBrief,
  prioritizeSeedsByBrief,
  orderDiscoveryPagesByBrief,
  sortOldestUpdatedFirst,
  seedScarcityScore,
  findReadinessBonus,
} = require("./scarcityResearchBrief.cjs");

const providers = [
  {
    id: "a",
    borough: "Manhattan",
    neighborhood: "Upper West Side",
    activityTypes: ["Soccer", "Gymnastics"],
    visibility: "public",
  },
  {
    id: "b",
    borough: "Manhattan",
    neighborhood: "Upper West Side",
    activityTypes: ["Soccer"],
    visibility: "public",
  },
  {
    id: "c",
    borough: "Brooklyn",
    neighborhood: "Park Slope",
    activityTypes: ["Dance"],
    visibility: "public",
  },
  {
    id: "hidden",
    borough: "Brooklyn",
    neighborhood: "Boerum Hill",
    activityTypes: ["Lacrosse"],
    visibility: "hidden",
  },
];

const thin = rankThinNeighborhoods(providers, { topN: 5 });
assert.ok(thin.length === 5);
assert.equal(thin[0].count, 0, "zero-count neighborhoods rank first");
assert.ok(thin.some((n) => n.neighborhood === "Boerum Hill" && n.count === 0));

const sports = rankScarceSports(providers, { topN: 80 });
assert.ok(sports[0].count === 0);
const soccer = sports.find((s) => s.activity === "Soccer");
assert.ok(soccer);
assert.equal(soccer.count, 2);
const lacrosse = sports.find((s) => s.activity === "Lacrosse");
assert.ok(lacrosse);
assert.equal(lacrosse.count, 0, "hidden listing must not count toward scarcity");


const brief = buildResearchBrief(providers, {
  generatedAt: "2026-09-21T12:00:00.000Z",
  neighborhoodTopN: 4,
  sportTopN: 4,
  maxQueries: 10,
});
assert.equal(brief.hourUtc, "2026-09-21T12");
assert.ok(brief.searchQueries.length > 0);
assert.ok(brief.findHints.preferNeighborhoods.length === 4);
assert.ok(brief.searchQueries[0].includes("NYC"));

const pending = [
  { seed: { id: "1", neighborhood: "Upper West Side", activityTypes: ["Soccer"], publicTarget: true }, idx: 0 },
  { seed: { id: "2", neighborhood: brief.findHints.preferNeighborhoods[0], activityTypes: ["Lacrosse"], publicTarget: true }, idx: 1 },
  { seed: { id: "3", neighborhood: "Park Slope", activityTypes: ["Art"], publicTarget: true }, idx: 2 },
];
const ordered = prioritizeSeedsByBrief(pending, brief);
assert.equal(ordered[0].seed.id, "2", "scarce neighborhood+sport seed should lead");
assert.ok(seedScarcityScore(ordered[0].seed, brief) > seedScarcityScore(pending[0].seed, brief));

const pages = [
  "https://example.com/categories/art/",
  "https://example.com/neighborhoods/boerum-hill/",
  "https://example.com/sports/lacrosse/",
];
const reordered = orderDiscoveryPagesByBrief(pages, {
  thinNeighborhoods: [{ borough: "Brooklyn", neighborhood: "Boerum Hill", count: 0, rank: 1 }],
  scarceSports: [{ activity: "Lacrosse", count: 0, rank: 1 }],
});
assert.ok(reordered[0].includes("boerum-hill") || reordered[0].includes("lacrosse"));

const oldest = sortOldestUpdatedFirst([
  { id: "new", updatedAt: "2026-09-21T10:00:00.000Z" },
  { id: "old", updatedAt: "2026-01-01T00:00:00.000Z" },
  { id: "missing" },
]);
assert.equal(oldest[0].id, "missing");
assert.equal(oldest[1].id, "old");
assert.equal(oldest[2].id, "new");

assert.ok(findReadinessBonus({ id: "prov-beyond-camps-x", publicTarget: true, address: "378 3rd Street Brooklyn, NY" }, null) > 100);
assert.ok(
  findReadinessBonus({ id: "prov-beyond-camps-x", publicTarget: true, address: "378 3rd Street Brooklyn, NY" }, null) >
    findReadinessBonus({ id: "prov-drive-sheets-x", publicTarget: true }, null),
  "street-ready fair-use must beat address-less Drive"
);
assert.ok(
  findReadinessBonus({ id: "prov-drive-sheets-x", publicTarget: true }, null) < 0,
  "address-less Drive harvest is deprioritized"
);
const byReadiness = prioritizeSeedsByBrief(
  [
    { seed: { id: "prov-drive-sheets-junk", publicTarget: true }, idx: 0, attempt: null },
    {
      seed: {
        id: "prov-beyond-camps-fresh",
        publicTarget: true,
        address: "378 3rd Street Brooklyn, NY 11215",
      },
      idx: 1,
      attempt: null,
    },
  ],
  null
);
assert.equal(byReadiness[0].seed.id, "prov-beyond-camps-fresh");

console.log("scarcityResearchBrief.test.cjs: ok");
