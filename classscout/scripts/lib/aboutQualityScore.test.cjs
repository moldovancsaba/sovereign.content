const assert = require("assert");
const {
  ABOUT_QUALITY_TARGET,
  aboutQualityScore,
  isSoftBelowAboutTarget,
} = require("./aboutQualityScore.cjs");

assert.ok(ABOUT_QUALITY_TARGET >= 70 && ABOUT_QUALITY_TARGET <= 85);

const good = aboutQualityScore(
  "Example Studio teaches kids yoga in Brooklyn with weekly classes for families.",
  "Example Studio is a Brooklyn yoga school with weekly kids classes, prenatal sessions, and family workshops stated on its official site.",
  { name: "Example Studio" }
);
assert.equal(good.chrome, false);
assert.ok(good.score >= ABOUT_QUALITY_TARGET, `good score ${good.score}`);
assert.equal(good.passes, true);

const soft = aboutQualityScore(
  "Families nearby choose this spot for its welcoming vibe each day of the week.",
  "Families nearby choose this spot for its welcoming vibe each day of the week around here.",
  { name: "Mystery Spot" }
);
assert.equal(soft.chrome, false);
assert.ok(soft.score < ABOUT_QUALITY_TARGET, `soft score ${soft.score} should be below target`);
assert.equal(soft.passes, false);
assert.equal(soft.soft, true);
assert.equal(
  isSoftBelowAboutTarget(
    "Families nearby choose this spot for its welcoming vibe each day of the week.",
    "Families nearby choose this spot for its welcoming vibe each day of the week around here.",
    { name: "Mystery Spot" }
  ),
  true
);

// Locality bonus alone must not clear the bar from a soft base.
const localityPadded = aboutQualityScore(
  "Families nearby choose this spot for its welcoming vibe each day of the week.",
  "Families nearby choose this Brooklyn spot for its welcoming vibe each day of the week around here.",
  { name: "Mystery Spot", place: "Brooklyn" }
);
assert.ok(
  localityPadded.parts.localityBonus <= 10,
  "locality bonus must stay capped"
);
assert.ok(
  localityPadded.score < ABOUT_QUALITY_TARGET + 5,
  "locality padding should not invent a strong About"
);

const chrome = aboutQualityScore(
  "Example offers kids programs in Brooklyn (Park Slope).",
  "Example is listed on ClassScout Provider Research (Drive) as a family program.",
  { chrome: true }
);
assert.equal(chrome.passes, false);
assert.ok(chrome.score <= 40);

const empty = aboutQualityScore("", "");
assert.equal(empty.passes, false);
assert.equal(empty.chrome, true);

console.log("aboutQualityScore.test.cjs: ok");
