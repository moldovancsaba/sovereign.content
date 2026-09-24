/**
 * Will this listing be publicly SHOWN? — a KPI label for Find, never a reason not to write it.
 *
 * Live public detail (`readProviderDetail` → `isProviderConfigEnabled`) 404s a listing whose region,
 * category or every canonical activity tag the client has switched off. That is display: the listing is
 * still collected and stored, and appears the moment the client switches its cell on — no re-Find
 * (brief: docs/briefs/produce-all-client-show-hide-classscout-dev.md). Find used to SKIP such seeds
 * before upsert, and also held its own hardcoded "public" borough and category lists; both made the
 * client's hide lists into ingest policy. Now the client's runtime config is the only input, and the
 * answer only separates "lasting public" from "inventory" in the KPIs.
 *
 * Kept in plain CJS beside the loop scripts; mirrors `isActivityEnabled` + `hasEnabledActivityTag`
 * for the closed seed vocabulary (seeds already use canonical spellings).
 */

const DARK_BY_DEFAULT_ACTIVITY_TAGS = new Set(["Capoeira"]);

const CATEGORY_TO_SLUG = {
  Classes: "classes",
  Camps: "camps",
  "Drop-In Activities": "drop-in-activities",
  "Birthday Parties": "birthday-parties",
  "Meet-up Groups": "meet-up-groups",
  "Family-Friendly Services": "family-friendly-services",
};

/**
 * @typedef {{
 *   disabledActivities: Set<string>,
 *   enabledActivities: string[],
 *   disabledRegions: Set<string>,
 *   disabledBrowseCategories: Set<string>,
 * }} PublicRuntimeGate
 */

/**
 * @param {string} base
 * @returns {Promise<PublicRuntimeGate>}
 */
async function fetchPublicRuntimeGate(base) {
  const res = await fetch(`${base}/api/public/runtime-config`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`runtime-config ${res.status}`);
  const body = await res.json();
  const settings = (body && body.settings) || {};
  return {
    disabledActivities: new Set(settings.disabledActivityTypes || []),
    enabledActivities: Array.isArray(settings.enabledActivityTypes)
      ? settings.enabledActivityTypes
      : [],
    disabledRegions: new Set(settings.disabledRegions || []),
    disabledBrowseCategories: new Set(settings.disabledBrowseCategories || []),
  };
}

/**
 * @param {string} tag
 * @param {PublicRuntimeGate} gate
 */
function isActivityPubliclyEnabled(tag, gate) {
  if (gate.disabledActivities.has(tag)) return false;
  if (gate.enabledActivities.length > 0) return gate.enabledActivities.includes(tag);
  if (DARK_BY_DEFAULT_ACTIVITY_TAGS.has(tag)) return false;
  return true;
}

/**
 * At least one activity tag must be publicly enabled — same OR semantics as
 * `hasEnabledActivityTag` for canonical seed tags.
 *
 * @param {string[] | null | undefined} activityTypes
 * @param {PublicRuntimeGate} gate
 */
function hasPubliclyEnabledActivity(activityTypes, gate) {
  const tags = Array.isArray(activityTypes) ? activityTypes.filter(Boolean) : [];
  if (tags.length === 0) return gate.enabledActivities.length === 0;
  return tags.some((tag) => isActivityPubliclyEnabled(tag, gate));
}

/**
 * @param {string} category
 * @param {PublicRuntimeGate} gate
 */
function isCategoryPubliclyEnabled(category, gate) {
  const slug = CATEGORY_TO_SLUG[category] || String(category || "").toLowerCase();
  return !gate.disabledBrowseCategories.has(slug);
}

/**
 * @param {string} borough
 * @param {PublicRuntimeGate} gate
 */
function isRegionPubliclyEnabled(borough, gate) {
  return !gate.disabledRegions.has(borough);
}

/**
 * Why the client's runtime config will not show this seed publicly, or null when it will (smoke 200
 * expected). A LABEL: the caller still writes the listing either way.
 *
 * @param {{ borough?: string, category?: string, activityTypes?: string[], publicTarget?: boolean, inventoryOnly?: boolean }} seed
 * @param {PublicRuntimeGate} gate
 */
function publicTargetBlockedReason(seed, gate) {
  if (seed.publicTarget === false || seed.inventoryOnly) return null;
  if (!isRegionPubliclyEnabled(seed.borough || "", gate)) return "region_not_public";
  if (!isCategoryPubliclyEnabled(seed.category || "", gate)) return "activity_not_public";
  if (!hasPubliclyEnabledActivity(seed.activityTypes, gate)) return "activity_not_public";
  return null;
}

module.exports = {
  DARK_BY_DEFAULT_ACTIVITY_TAGS,
  CATEGORY_TO_SLUG,
  fetchPublicRuntimeGate,
  isActivityPubliclyEnabled,
  hasPubliclyEnabledActivity,
  isCategoryPubliclyEnabled,
  isRegionPubliclyEnabled,
  publicTargetBlockedReason,
};
