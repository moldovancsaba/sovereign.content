const assert = require("assert");
const { listingQualityGaps, PRIORITY_GAP_CODES } = require("./listingQualityGaps.cjs");

const good = listingQualityGaps({
  website: "https://example.com",
  address: "123 Main Street",
  phone: "+12125550100",
  email: "hi@example.com",
  trialPolicy: { trialAvailable: true },
  sessions: [{ title: "Fall", startDate: "2026-09-01", sourceText: "Fall session" }],
  price: { evidence: "stated", amount: 20 },
  ageRanges: ["3–5"],
  shortDescription: "Example Studio teaches kids yoga in Brooklyn with weekly classes for families.",
  longDescription:
    "Example Studio is a Brooklyn yoga school with weekly kids classes, prenatal sessions, and family workshops stated on its official site.",
});
assert.deepEqual(good.gaps, []);
assert.equal(good.enrichable, false);
assert.equal(good.recommendable, false);

const softOnly = listingQualityGaps({
  website: "https://example.com",
  address: "123 Main Street",
  phone: "+12125550100",
  email: "hi@example.com",
  shortDescription: "Example Studio teaches kids yoga in Brooklyn with weekly classes for families.",
  longDescription:
    "Example Studio is a Brooklyn yoga school with weekly kids classes, prenatal sessions, and family workshops stated on its official site.",
});
assert.ok(softOnly.gaps.includes("blank_price"));
assert.ok(softOnly.gaps.includes("blank_trial"));
assert.equal(softOnly.recommendable, false);
assert.equal(softOnly.enrichable, true);

const blanks = listingQualityGaps({
  website: "https://example.com",
  address: "15 minutes. Please",
  shortDescription: "Example Studio teaches kids yoga in Brooklyn with weekly classes for families.",
  longDescription:
    "Example Studio is a Brooklyn yoga school with weekly kids classes, prenatal sessions, and family workshops stated on its official site.",
});
assert.ok(blanks.gaps.includes("bad_address"));
assert.ok(blanks.gaps.includes("blank_contacts"));
assert.ok(blanks.recommendable);
assert.deepEqual(blanks.priorityGaps, ["bad_address", "blank_contacts"]);
assert.equal(blanks.enrichable, true);
assert.equal(blanks.priority, 10);

const noWeb = listingQualityGaps({
  address: "123 Main Street",
  phone: "+12125550100",
  email: "hi@example.com",
  trialPolicy: { trialAvailable: true },
  sessions: [{ title: "Fall", startDate: "2026-09-01", sourceText: "x" }],
  price: { evidence: "stated" },
  ageRanges: ["3–5"],
  shortDescription: "Example Studio teaches kids yoga in Brooklyn with weekly classes for families.",
  longDescription:
    "Example Studio is a Brooklyn yoga school with weekly kids classes, prenatal sessions, and family workshops stated on its official site.",
});
assert.ok(noWeb.gaps.includes("missing_website"));
assert.equal(noWeb.enrichable, false);
assert.equal(noWeb.recommendable, false);

assert.deepEqual([...PRIORITY_GAP_CODES], ["bad_address", "weak_description", "blank_contacts"]);

const weakDesc = listingQualityGaps({
  website: "https://example.com",
  address: "123 Main Street",
  phone: "+12125550100",
  email: "hi@example.com",
  shortDescription: "Example offers kids programs in Brooklyn (Park Slope).",
  longDescription:
    "Example is listed on ClassScout Provider Research (Drive) as a family program.\n\nListed services include: Yoga.",
});
assert.ok(weakDesc.gaps.includes("weak_description"));
assert.ok(weakDesc.recommendable);

// Phone present, email missing → soft blank_email only (not a priority recommendation).
const phoneOnly = listingQualityGaps({
  website: "https://example.com",
  address: "123 Main Street",
  phone: "+12125550100",
  shortDescription: "Example Studio teaches kids yoga in Brooklyn with weekly classes for families.",
  longDescription:
    "Example Studio is a Brooklyn yoga school with weekly kids classes, prenatal sessions, and family workshops stated on its official site.",
});
assert.ok(phoneOnly.gaps.includes("blank_email"));
assert.ok(!phoneOnly.gaps.includes("blank_contacts"));
assert.equal(phoneOnly.recommendable, false);
assert.ok(phoneOnly.lanes.includes("contacts"));

// No phone → priority blank_contacts.
const noPhone = listingQualityGaps({
  website: "https://example.com",
  address: "123 Main Street",
  email: "hi@example.com",
  shortDescription: "Example Studio teaches kids yoga in Brooklyn with weekly classes for families.",
  longDescription:
    "Example Studio is a Brooklyn yoga school with weekly kids classes, prenatal sessions, and family workshops stated on its official site.",
});
assert.ok(noPhone.gaps.includes("blank_contacts"));
assert.ok(!noPhone.gaps.includes("blank_email"));
assert.equal(noPhone.recommendable, true);

console.log("listingQualityGaps.test.cjs: ok");
