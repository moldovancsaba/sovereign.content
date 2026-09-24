/**
 * Unit checks for deep enrich helpers and expanded price/session extractors.
 */
const assert = require("assert");
const {
  extractPrice,
  extractSessions,
  extractAgeRanges,
  buildTrialPolicy,
  isBadTrialPolicy,
} = require("./extractOfficialPage.cjs");
const { deepPaths } = require("./deepEnrichOfficialSite.cjs");

const priceHtml = `<html><body>Fall classes are $375 for 10 weeks.</body></html>`;
const p1 = extractPrice(priceHtml, "https://example.com/pricing");
assert.ok(p1 && p1.price && p1.price.evidence === "stated");
assert.equal(p1.price.amount, 375);
assert.equal(p1.price.unit, "session");

const pMonth = extractPrice("<p>Membership from $599/mo.</p>", "https://example.com");
assert.ok(pMonth && pMonth.price.amount === 599 && pMonth.price.unit === "month");

const p2 = extractPrice("<p>Tuition is $45 per class for members.</p>", "https://x.com");
assert.ok(p2 && p2.price.unit === "class" && p2.price.amount === 45);

const sessHtml = `
Fall Session: September 12 – November 14, 2026. Ages 5-9 classes begin September 12, 2026.
`;
const sessions = extractSessions(`<html><body>${sessHtml}</body></html>`, "prov-test");
assert.ok(sessions.length >= 1, "expected at least one dated session");
assert.ok(sessions[0].startDate && sessions[0].sourceText);

const ages = extractAgeRanges("<p>Programs for ages 2-9 and teens.</p>");
assert.ok(ages.includes("0–2") || ages.includes("3–5"));
assert.ok(ages.includes("Teens"));

const trial = buildTrialPolicy(["Try a free class and experience the benefits firsthand."]);
assert.ok(trial && trial.trialAvailable && trial.trialIsFree);
assert.equal(isBadTrialPolicy(trial), false);

const paths = deepPaths("https://example.com/locations/greenpoint");
assert.ok(paths.some((u) => u.includes("/pricing")));
assert.ok(paths.some((u) => u.includes("/contact")));
assert.ok(paths.length >= 6);
// Contact / locations must land inside the default 6–8 page window (before pricing clutter).
const firstEight = paths.slice(0, 8);
assert.ok(
  firstEight.some((u) => /\/contact(?:-us)?$/.test(u)),
  `contact missing from first 8: ${firstEight.join(", ")}`
);
assert.ok(
  firstEight.some((u) => /\/locations?$/.test(u)),
  `locations missing from first 8: ${firstEight.join(", ")}`
);

console.log("deepEnrichOfficialSite.test.cjs: ok");
