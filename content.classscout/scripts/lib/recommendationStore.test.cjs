const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-rec-"));
process.env.CATALOG_LOOP_RECOMMENDATIONS = path.join(tmp, "recommendations.json");
process.env.CATALOG_LOOP_DATA_DIR = tmp;
process.env.CATALOG_RECOMMEND_MAX_ATTEMPTS = "2";
process.env.CATALOG_RECOMMEND_EXHAUSTED_COOLDOWN_MS = String(7 * 24 * 60 * 60 * 1000);
process.env.CATALOG_RECOMMEND_RETRY_COOLDOWN_MS = String(3 * 60 * 60 * 1000);

delete require.cache[require.resolve("./paths.cjs")];
delete require.cache[require.resolve("./listingQualityGaps.cjs")];
delete require.cache[require.resolve("./recommendationStore.cjs")];
const {
  loadRecommendations,
  saveRecommendations,
  upsertOpenRecommendation,
  settleRecommendationAfterAttempt,
  openRecommendations,
  eligibleOpenRecommendations,
  recommendationSortKey,
} = require("./recommendationStore.cjs");

let doc = loadRecommendations();
assert.equal(openRecommendations(doc).length, 0);

assert.equal(
  upsertOpenRecommendation(doc, {
    providerId: "prov-a",
    gaps: ["bad_address", "blank_trial"],
    lanes: ["address", "trial"],
    priority: 10,
    name: "A",
  }).action,
  "created"
);
assert.equal(
  upsertOpenRecommendation(doc, {
    providerId: "prov-b",
    gaps: ["blank_price"],
    lanes: ["price"],
    priority: 50,
    name: "B",
  }).action,
  "created"
);
saveRecommendations(doc);

doc = loadRecommendations();
assert.equal(openRecommendations(doc).length, 2);
const sorted = openRecommendations(doc).slice().sort(recommendationSortKey);
assert.equal(sorted[0].providerId, "prov-a");

// Progress clearing bad_address → resolved_priority
let settled = settleRecommendationAfterAttempt(
  doc,
  "prov-a",
  ["blank_trial", "blank_price"],
  ["trial", "price"],
  30
);
assert.equal(settled.outcome, "resolved_priority");
assert.equal(openRecommendations(doc).find((r) => r.providerId === "prov-a"), undefined);

// Exhaust without progress
assert.equal(
  settleRecommendationAfterAttempt(doc, "prov-b", ["blank_price"], ["price"], 50).outcome,
  "attempted"
);
assert.equal(
  settleRecommendationAfterAttempt(doc, "prov-b", ["blank_price"], ["price"], 50).outcome,
  "exhausted"
);
assert.equal(openRecommendations(doc).length, 0);

// Exhausted must not reopen on audit upsert
assert.equal(
  upsertOpenRecommendation(doc, {
    providerId: "prov-b",
    gaps: ["blank_price"],
    lanes: ["price"],
    priority: 50,
  }).action,
  "skipped_exhausted"
);
assert.equal(openRecommendations(doc).length, 0);

// resolved_priority must not reopen on soft blanks alone
doc.recommendations.push({
  id: "rec:prov-c",
  providerId: "prov-c",
  status: "closed",
  closeReason: "resolved_priority",
  gaps: ["blank_price"],
  lanes: ["price"],
  priority: 50,
  attempts: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  closedAt: new Date().toISOString(),
  lastAttemptAt: null,
  source: "audit",
  name: "C",
});
assert.equal(
  upsertOpenRecommendation(doc, {
    providerId: "prov-c",
    gaps: ["blank_price"],
    lanes: ["price"],
    priority: 50,
  }).action,
  "skipped_resolved"
);
assert.equal(
  upsertOpenRecommendation(doc, {
    providerId: "prov-c",
    gaps: ["bad_address", "blank_price"],
    lanes: ["address", "price"],
    priority: 10,
  }).action,
  "reopened"
);

// Force reopen (operator path)
assert.equal(
  upsertOpenRecommendation(
    doc,
    { providerId: "prov-b", gaps: ["blank_price"], lanes: ["price"], priority: 50 },
    { forceReopen: true }
  ).action,
  "reopened"
);

// Retry cooldown hides recently attempted
for (const r of openRecommendations(doc)) {
  r.lastAttemptAt = new Date().toISOString();
}
assert.equal(eligibleOpenRecommendations(doc).length, 0);

saveRecommendations(doc);
assert.ok(fs.existsSync(process.env.CATALOG_LOOP_RECOMMENDATIONS));
console.log("recommendationStore.test.cjs: ok");
