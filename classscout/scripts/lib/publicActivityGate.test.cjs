/**
 * Unit checks for the Find public-activity pre-publish gate.
 */
const assert = require("assert");
const {
  hasPubliclyEnabledActivity,
  isActivityPubliclyEnabled,
  publicTargetBlockedReason,
} = require("./publicActivityGate.cjs");

const gate = {
  disabledActivities: new Set(["Art", "Music", "Sports", "STEM"]),
  enabledActivities: [],
  disabledRegions: new Set(["Queens", "Bronx", "Staten Island"]),
  disabledBrowseCategories: new Set(["birthday-parties"]),
};

assert.strictEqual(isActivityPubliclyEnabled("Art", gate), false);
assert.strictEqual(isActivityPubliclyEnabled("Dance", gate), true);
assert.strictEqual(isActivityPubliclyEnabled("Capoeira", gate), false);
assert.strictEqual(hasPubliclyEnabledActivity(["Art"], gate), false);
assert.strictEqual(hasPubliclyEnabledActivity(["Art", "Dance"], gate), true);
assert.strictEqual(hasPubliclyEnabledActivity(["Martial Arts"], gate), true);
assert.strictEqual(hasPubliclyEnabledActivity([], gate), true);

assert.strictEqual(
  publicTargetBlockedReason(
    {
      publicTarget: true,
      borough: "Brooklyn",
      category: "Drop-In Activities",
      activityTypes: ["Art"],
    },
    gate,
  ),
  "activity_not_public",
);

assert.strictEqual(
  publicTargetBlockedReason(
    {
      publicTarget: true,
      borough: "Brooklyn",
      category: "Classes",
      activityTypes: ["Taekwondo", "Martial Arts"],
    },
    gate,
  ),
  null,
);

assert.strictEqual(
  publicTargetBlockedReason(
    {
      publicTarget: true,
      borough: "Queens",
      category: "Classes",
      activityTypes: ["Swimming"],
    },
    gate,
  ),
  "region_not_public",
);

assert.strictEqual(
  publicTargetBlockedReason(
    { publicTarget: false, inventoryOnly: true, borough: "Brooklyn", category: "Classes", activityTypes: ["Art"] },
    gate,
  ),
  null,
);

// The client's runtime config is the only input — no hardcoded "public" borough or category list. An
// LA region the client has not switched off, and a category it has not disabled, read as public.
assert.strictEqual(
  publicTargetBlockedReason({ publicTarget: true, borough: "Westside", category: "Birthday Parties", activityTypes: ["Dance"] }, gate),
  "activity_not_public",
);
assert.strictEqual(
  publicTargetBlockedReason({ publicTarget: true, borough: "Westside", category: "Classes", activityTypes: ["Dance"] }, gate),
  null,
);

console.log("publicActivityGate.cjs ok");
