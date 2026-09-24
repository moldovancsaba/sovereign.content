const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "self-heal-"));
process.env.CATALOG_LOOP_DATA_DIR = tmp;
process.env.CATALOG_SELF_HEAL_WEAK_ABOUT_THRESHOLD = "2";
process.env.CATALOG_SELF_HEAL_PRIORITY_THRESHOLD = "5";
delete process.env.CATALOG_SELF_HEAL_FORCE_FIND;
delete process.env.CATALOG_SELF_HEAL_DEFER_FIND;

// Re-require paths + modules after env is set.
delete require.cache[require.resolve("./paths.cjs")];
delete require.cache[require.resolve("./recommendationStore.cjs")];
delete require.cache[require.resolve("./selfHeal.cjs")];

const { RECOMMENDATIONS_PATH, ensureDir, DATA_DIR } = require("./paths.cjs");
const { saveRecommendations } = require("./recommendationStore.cjs");
const {
  evaluateSelfHeal,
  writeSelfHealStatus,
  shouldDeferFind,
  readSelfHealStatus,
} = require("./selfHeal.cjs");

ensureDir(DATA_DIR);
saveRecommendations({
  updatedAt: new Date().toISOString(),
  recommendations: [
    {
      providerId: "a",
      status: "open",
      gaps: ["weak_description"],
      priorityGaps: ["weak_description"],
      openedAt: new Date().toISOString(),
    },
    {
      providerId: "b",
      status: "open",
      gaps: ["weak_description", "blank_contacts"],
      priorityGaps: ["weak_description", "blank_contacts"],
      openedAt: new Date().toISOString(),
    },
  ],
});

assert.ok(fs.existsSync(RECOMMENDATIONS_PATH));

const hot = evaluateSelfHeal();
assert.equal(hot.weakAboutOpen, 2);
assert.equal(hot.debtHot, true);
assert.equal(hot.deferFind, true);
assert.ok(hot.briefs.length >= 1);

writeSelfHealStatus(hot);
assert.equal(shouldDeferFind(), true);
assert.equal(readSelfHealStatus().deferFind, true);

process.env.CATALOG_SELF_HEAL_FORCE_FIND = "1";
assert.equal(shouldDeferFind(), false);
delete process.env.CATALOG_SELF_HEAL_FORCE_FIND;

const cool = evaluateSelfHeal({
  openRecs: [
    {
      providerId: "c",
      status: "open",
      gaps: ["blank_price"],
      priorityGaps: [],
    },
  ],
  softAboutCount: 0,
});
assert.equal(cool.debtHot, false);
assert.equal(cool.deferFind, false);

const feedbackHot = evaluateSelfHeal({
  openRecs: [
    {
      providerId: "d",
      status: "open",
      gaps: ["bad_address"],
      priorityGaps: ["bad_address"],
      source: "operator_feedback",
    },
  ],
  softAboutCount: 0,
});
assert.equal(feedbackHot.operatorFeedbackOpen, 1);
assert.equal(feedbackHot.operatorFeedbackHot, true);
assert.equal(feedbackHot.deferFind, true);
assert.ok(feedbackHot.briefs.some((b) => b.reason === "operator_feedback"));
assert.ok(
  String(feedbackHot.note || "").toLowerCase().includes("never paste"),
  "self-heal must warn that operator notes never paste into About"
);

fs.rmSync(tmp, { recursive: true, force: true });
console.log("selfHeal.test.cjs: ok");
