const assert = require("assert");
const {
  looksLikeStreetAddress,
  seedFamily,
  isTerminalFindAttempt,
  shouldRetireFindAttempt,
  findSeedQualityBonus,
  HARD_TERMINAL_FIND_SKIP_CODES,
} = require("./findSeedPriority.cjs");

assert.ok(looksLikeStreetAddress("378 3rd Street Brooklyn, NY 11215"));
assert.ok(!looksLikeStreetAddress(""));
assert.ok(!looksLikeStreetAddress("Ages 3-12 years"));
assert.equal(seedFamily("prov-drive-sheets-x"), "drive");
assert.equal(seedFamily("prov-beyond-camps-y"), "fair_use");
assert.equal(seedFamily("prov-tinyout-z"), "tinyout");
assert.ok(HARD_TERMINAL_FIND_SKIP_CODES.includes("no_street_address"));
assert.ok(HARD_TERMINAL_FIND_SKIP_CODES.includes("region_unknown"));
assert.ok(!HARD_TERMINAL_FIND_SKIP_CODES.includes("region_not_public"));
assert.ok(!HARD_TERMINAL_FIND_SKIP_CODES.includes("activity_not_public"));
assert.ok(isTerminalFindAttempt({ lastReasonCode: "http_not_found" }));
assert.ok(!isTerminalFindAttempt({ lastReasonCode: "region_not_public", tries: 1 }));
assert.ok(!isTerminalFindAttempt({ lastReasonCode: "fetch_error", tries: 1 }));
assert.ok(shouldRetireFindAttempt({ tries: 3, lastReasonCode: "fetch_error" }, "fetch_error"));
assert.ok(!shouldRetireFindAttempt({ tries: 1, lastReasonCode: "fetch_error" }, "fetch_error"));
assert.ok(!shouldRetireFindAttempt({ tries: 1, lastReasonCode: "region_not_public" }, "region_not_public"));

assert.equal(seedFamily("prov-la-jag-gym"), "multi_city");
assert.equal(seedFamily("prov-bos-wai-kru"), "multi_city");
const fair = findSeedQualityBonus(
  { id: "prov-beyond-a", address: "120 Riverside Blvd New York NY", publicTarget: true },
  null
);
const driveJunk = findSeedQualityBonus({ id: "prov-drive-sheets-b", publicTarget: true }, null);
const multi = findSeedQualityBonus(
  { id: "prov-la-jag-gym", address: "8640 Hayden Place Culver City CA", publicTarget: true },
  null
);
assert.ok(fair > driveJunk);
assert.ok(driveJunk < 0);
assert.ok(multi > fair);
assert.ok(multi > driveJunk);

console.log("findSeedPriority.test.cjs: ok");
