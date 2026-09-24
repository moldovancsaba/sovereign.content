const assert = require("assert");
const {
  cityForSystemRegion,
  isSystemRegion,
  approximateAddressFromPlace,
  NYC_BOROUGHS,
  LA_AREAS,
  BOSTON_AREAS,
} = require("./systemRegions.cjs");

assert.equal(cityForSystemRegion("Manhattan"), "nyc");
assert.equal(cityForSystemRegion("Queens"), "nyc");
assert.equal(cityForSystemRegion("Westside"), "la");
assert.equal(cityForSystemRegion("North Boston"), "bos");
assert.equal(cityForSystemRegion("Hoboken"), null);
assert.equal(cityForSystemRegion(""), null);
assert.ok(isSystemRegion("Central LA"));
assert.ok(!isSystemRegion("Great Neck"));
assert.equal(
  approximateAddressFromPlace({ neighborhood: "Park Slope", borough: "Brooklyn" }),
  "Park Slope, Brooklyn"
);
assert.ok(NYC_BOROUGHS.includes("Brooklyn"));
assert.ok(LA_AREAS.includes("Westside"));
assert.ok(BOSTON_AREAS.includes("North Boston"));

console.log("systemRegions.test.cjs: ok");
