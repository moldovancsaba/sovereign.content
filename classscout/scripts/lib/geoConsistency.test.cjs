const test = require("node:test");
const assert = require("node:assert/strict");
const {
  boroughForNeighborhood,
  geoRepairPlan,
  isPlaceholderEmail,
  isContaminatedPhone,
  decodeHtmlEntities,
  sanitizeActivityTypes,
} = require("./geoConsistency.cjs");

test("boroughForNeighborhood maps Brooklyn neighborhoods", () => {
  assert.equal(boroughForNeighborhood("Boerum Hill"), "Brooklyn");
  assert.equal(boroughForNeighborhood("Fort Greene"), "Brooklyn");
  assert.equal(boroughForNeighborhood("Bay Ridge"), "Brooklyn");
  assert.equal(boroughForNeighborhood("Saint Albans"), "Queens");
  assert.equal(boroughForNeighborhood("Throggs Neck"), "Bronx");
  assert.equal(boroughForNeighborhood("Westchester Square"), "Bronx");
});

test("geoRepairPlan fixes Manhattan label on Brooklyn neighborhood", () => {
  const plan = geoRepairPlan({
    name: "Tutu School Boerum Hill",
    borough: "Manhattan",
    neighborhood: "Boerum Hill",
    address: "200 Smith Street",
  });
  assert.equal(plan.borough, "Brooklyn");
});

test("geoRepairPlan hides outside NYC", () => {
  const plan = geoRepairPlan({
    name: "Shine Tumblers",
    borough: "Manhattan",
    neighborhood: "Newark",
    address: "Newark, NJ",
  });
  assert.equal(plan.hide, true);
});

test("placeholder and contaminated contacts", () => {
  assert.equal(isPlaceholderEmail("your@email.com"), true);
  assert.equal(isPlaceholderEmail("info@bam.org"), false);
  assert.equal(isContaminatedPhone("+12545352419"), true);
  assert.equal(isContaminatedPhone("+17186364100"), false);
});

test("decodeHtmlEntities", () => {
  assert.equal(decodeHtmlEntities("Victory Music &amp; Dance"), "Victory Music & Dance");
  assert.equal(decodeHtmlEntities("Brooklyn Children&#x27;s Theater"), "Brooklyn Children's Theater");
});

test("sanitizeActivityTypes fixes Skateyogi Ice Skating", () => {
  const next = sanitizeActivityTypes({
    name: "Skateyogi Brooklyn",
    activityTypes: ["Ice Skating"],
    shortDescription: "skateboarding programs for kids in Brooklyn",
  });
  assert.deepEqual(next, ["Skateboarding"]);
});

test("sanitizeActivityTypes strips Soccer from BAM arts listing", () => {
  const next = sanitizeActivityTypes({
    name: "Brooklyn Academy of Music",
    activityTypes: ["Soccer", "Art", "Music"],
    shortDescription: "BAM is a multi-arts center located in Brooklyn",
  });
  assert.ok(!next.includes("Soccer"));
  assert.ok(next.includes("Art") || next.includes("Music"));
});
