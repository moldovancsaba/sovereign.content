/**
 * Build a ClassScout find-seed from fair-use citation facts.
 */
const { slugifyId, mapActivityTypes, mapAgeRanges } = require("./rqkExtract.cjs");
const {
  fetchPublicRuntimeGate,
  hasPubliclyEnabledActivity,
  isRegionPubliclyEnabled,
} = require("../../lib/publicActivityGate.cjs");
const { stripUrlsFromPublicCopy } = require("../../lib/publicCopyHygiene.cjs");

/** Cached gate for a single fair-use cycle (optional; without it every seed reads as public — a label only). */
let cachedGate = null;

async function ensureGate(base) {
  if (cachedGate) return cachedGate;
  try {
    cachedGate = await fetchPublicRuntimeGate(base || process.env.CATALOG_LOOP_BASE || "https://getyourfield.com");
  } catch {
    cachedGate = null;
  }
  return cachedGate;
}

/**
 * Board issue 938: `source.boroughDefault` used to short-circuit BEFORE this neighborhood-keyword
 * inference ever ran, so every tinyout/drive-sheets record whose page never says the borough word
 * outright (very common — a page names "Boerum Hill" or "Fort Greene", never "Brooklyn") fell straight
 * to the per-source hardcoded default (tinyout and drive-sheets both default to "Manhattan"), even
 * though the neighborhood text right there in `facts` would have resolved correctly. The default now
 * runs LAST, after real evidence has had its chance, matching what this function's own final line
 * always claimed but the early return made unreachable.
 *
 * Known residual gap, NOT fixed here: a venue genuinely outside NYC (Westchester, Newark NJ, Rockland
 * County — several were found live) has no NYC borough keyword to match and still falls to the source
 * default. That is a "should this even be a published NYC listing" question, not a borough-labeling
 * one — tracked separately, not solved by widening this keyword list.
 */
function inferBorough(facts, source) {
  if (facts.borough) return facts.borough;
  const blob = `${facts.address || ""} ${facts.neighborhood || ""} ${facts.name || ""}`.toLowerCase();
  if (/manhattan|upper west|upper east|midtown|harlem|chelsea|tribeca|soho|inwood|washington heights/.test(blob)) return "Manhattan";
  if (/brooklyn|park slope|williamsburg|dumbo|bushwick|greenpoint|cobble hill|boerum hill|fort greene|bay ridge|sunset park|prospect heights|gowanus|brighton beach|gravesend|carroll gardens/.test(blob)) return "Brooklyn";
  if (/queens|astoria|flushing|forest hills|bayside|lic|long island city|richmond hill|jamaica/.test(blob)) return "Queens";
  if (/bronx|throggs neck|westchester square|morrisania/.test(blob)) return "Bronx";
  if (/staten island|richmond valley/.test(blob)) return "Staten Island";
  return source.boroughDefault || "Brooklyn";
}

/**
 * @returns {{ seed: object|null, rejectReason: string|null }}
 */
function buildCitationSeed(facts, source, gate) {
  const name = facts.name || "Unknown provider";
  const borough = inferBorough(facts, source);
  const citationUrl = facts.citationUrl || facts.rqkUrl || "";
  let website = facts.website || "";
  try {
    const { isJunkWebsite, hostOf } = require("./leadQuality.cjs");
    const srcHost = hostOf(source.base);
    if (!website || isJunkWebsite(website, srcHost) || hostOf(website) === srcHost) {
      website = citationUrl || website;
    }
    // Never use wa.me / citation host as Find website when it is still the source.
    if (isJunkWebsite(website, srcHost) || hostOf(website) === srcHost) {
      website = "";
    }
  } catch {
    website = website || "";
  }

  const activityTypes = mapActivityTypes(facts.services || facts.activityHints || [], name);
  if (!activityTypes.length) {
    return { seed: null, rejectReason: "no_activity_mapped" };
  }

  const ageRanges = mapAgeRanges(facts.ageRange || (facts.ageHints || []).join(" "));
  // The client's runtime config alone says whether a region is shown (rule 441) — no hardcoded "public"
  // borough list. It only labels the seed inventory; Find writes it either way.
  const regionOk = !gate || isRegionPubliclyEnabled(borough, gate);
  const activityOk = !gate || hasPubliclyEnabledActivity(activityTypes, gate);
  const inventoryOnly =
    Boolean(source.inventoryOnly) ||
    !regionOk ||
    !activityOk ||
    Boolean(facts.inventoryOnly) ||
    !website;

  const id = `prov-${source.id}-${slugifyId(name)}`;
  const shortDescription = stripUrlsFromPublicCopy(
    `${name} offers kids programs in ${borough}${
      facts.neighborhood ? ` (${facts.neighborhood})` : ""
    }${facts.address ? ` at ${facts.address}` : ""}.`
  ).slice(0, 400);

  // Public copy must not contain URLs — ingest rejects chrome/URL descriptions.
  const longDescription = stripUrlsFromPublicCopy(
    [
      `${name} is listed on ${source.name} as a family program.`,
      facts.address ? `Address stated on that listing: ${facts.address}.` : "",
      facts.ageRange ? `Listed age range: ${facts.ageRange}.` : "",
      facts.services && facts.services.length
        ? `Listed services include: ${facts.services.slice(0, 6).join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n")
  ).slice(0, 4000);

  let inventoryNote = "";
  if (inventoryOnly) {
    if (!activityOk && regionOk) {
      inventoryNote = " Inventory-only while every tagged activity is config-disabled.";
    } else if (!website) {
      inventoryNote = " Inventory-only until an official provider website is confirmed.";
    } else {
      inventoryNote = " Inventory-only while public toggles hide this borough/cell.";
    }
  }

  const researchNote = stripUrlsFromPublicCopy(
    `Discovered via ${source.name} fair-use one-lead research. Official provider website is the Find target; ${source.name} is citation only.${inventoryNote}`
  );

  return {
    seed: {
      id,
      website: website || citationUrl,
      name,
      category: "Classes",
      borough,
      neighborhood: facts.neighborhood || borough,
      address: facts.address || "",
      activityTypes,
      ageRanges,
      dayTimeTags: facts.dayTimeTags || ["Weekday", "Weekend", "Afternoon", "After-school"],
      publicTarget: !inventoryOnly,
      inventoryOnly,
      requiresAddressFromPage: !facts.address,
      researchSources: [citationUrl, website].filter(Boolean),
      researchNote,
      shortDescription,
      longDescription,
    },
    rejectReason: null,
  };
}

module.exports = { buildCitationSeed, inferBorough, ensureGate };
