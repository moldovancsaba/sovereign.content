#!/usr/bin/env node
/**
 * Catalog Find cycle — evidence-backed publish from find-seeds.json.
 *
 * Per seed: skip if already in Mongo / already published by this loop → fetch
 * official page → deep enrich (pricing/classes/contact pages) for contacts,
 * trial, price, sessions, ages when stated → upload image → upsert → public smoke.
 *
 * Never invents contacts. Emits structured events (quality plan Phase 1).
 */
require("./_productRoot.cjs").loadProductEnv();
const fs = require("fs");
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const {
  STATE_PATH,
  SEEDS_PATH,
  FIND_LOG,
  SCARCITY_BRIEF_PATH,
  ensureDir,
  DATA_DIR,
  migrateTmpStateIfNeeded,
} = require("./lib/paths.cjs");
const { appendEvent, mapSkipReason } = require("./lib/events.cjs");
const {
  shouldRetireFindAttempt,
  isTerminalFindAttempt,
} = require("./lib/findSeedPriority.cjs");
const {
  hasStreetAddress,
  pickStreetAddress,
  extractFromHtml,
  buildTrialPolicy,
  stripBirthdayCopy,
  extractPrice,
  extractSessions,
  extractAgeRanges,
  extractHardContacts,
  isBadTrialPolicy,
} = require("./lib/extractOfficialPage.cjs");
const {
  fetchPublicRuntimeGate,
  publicTargetBlockedReason,
} = require("./lib/publicActivityGate.cjs");
const { renderGeneratedListingImage } = require("./lib/listingEnrichmentImage.cjs");
const { stripUrlsFromPublicCopy, publicCopyHasUnsafeChrome } = require("./lib/publicCopyHygiene.cjs");
const {
  isWeakListingCopy,
  extractAboutEvidence,
  composeListingCopy,
} = require("./lib/composeListingCopy.cjs");
const {
  loadBriefFromDisk,
  prioritizeSeedsByBrief,
} = require("./lib/scarcityResearchBrief.cjs");
const {
  boroughForNeighborhood,
  looksOutsideNyc,
  isPlaceholderEmail,
  isContaminatedPhone,
  decodeHtmlEntities,
  sanitizeActivityTypes,
} = require("./lib/geoConsistency.cjs");
const { deepEnrichOfficialSite } = require("./lib/deepEnrichOfficialSite.cjs");
const { normalizeActivityTypes } = require("./lib/normalizeActivityTypes.cjs");

const { loadCityRegions, cityForBorough } = require("./lib/cityOwnership.cjs");
const { approximateAddressFromPlace } = require("./lib/systemRegions.cjs");

const BASE = process.env.CATALOG_LOOP_BASE || "https://getyourfield.com";
const KEY = process.env.INGEST_API_KEY;
const BATCH = Math.max(1, Number(process.env.CATALOG_FIND_BATCH || 4));
/** Optional comma-separated seed ids — process only these (ops delivery / retry after URL swap). */
const ONLY_SEED_IDS = new Set(
  String(process.env.CATALOG_FIND_SEED_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
const { isDryRun } = require("./lib/cliFlags.cjs");
const DRY = isDryRun();
/** All cities/boroughs/areas in the registry — client hides via runtime disabledRegions. */

function loadState() {
  migrateTmpStateIfNeeded();
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { cycle: 0, foundIds: [], findCursor: 0, findAttempts: {}, watchIds: [] };
  }
}

function saveState(s) {
  s.updatedAt = new Date().toISOString();
  ensureDir(DATA_DIR);
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Dedupe sourceUrls the way ingest validates them (trim + lower case), keep first occurrence. */
function uniqueSourceUrls(urls) {
  const out = [];
  const seen = new Set();
  for (const raw of urls || []) {
    const u = String(raw || "").trim();
    if (!u) continue;
    const key = u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out.slice(0, 12);
}

function recordSkip(seed, attempt, state, reason, extra = {}) {
  const reasonCode = extra.reasonCode || mapSkipReason(reason);
  attempt.tries = (attempt.tries || 0) + (extra.countTry === false ? 0 : 1);
  attempt.lastError = reason;
  attempt.lastReasonCode = reasonCode;
  // Terminal Find failures (no street / 404 / blocked; fetch after 3 tries) — leave later batches.
  if (extra.done === true || shouldRetireFindAttempt(attempt, reasonCode)) {
    attempt.done = true;
    attempt.retiredAt = attempt.retiredAt || new Date().toISOString();
    attempt.retireReason = reasonCode;
  }
  state.findAttempts[seed.id] = attempt;
  appendEvent("find_skip", {
    seedId: seed.id,
    website: seed.website,
    host: hostOf(seed.website),
    reason,
    reasonCode,
    publicTarget: seed.publicTarget !== false && !seed.inventoryOnly,
    ...extra,
  });
  return { id: seed.id, ok: false, skipped: true, reason, reasonCode };
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      // Browser-shaped UA — many club sites block the short ClassScoutCatalogLoop token.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  const html = await res.text();
  return { status: res.status, html, finalUrl: res.url };
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ClassScoutCatalogLoop/1.0)" },
    redirect: "follow",
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error("image too small");
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let ext = "jpg";
  if (ct.includes("png") || url.toLowerCase().includes(".png")) ext = "png";
  else if (ct.includes("webp") || url.toLowerCase().includes(".webp")) ext = "webp";
  return { buf, ext };
}

async function uploadImage(buf, ext, id) {
  if (DRY) {
    return `https://dry-run.invalid/catalog-loop/${encodeURIComponent(id)}.${ext || "png"}`;
  }
  const form = new FormData();
  form.append("file", new Blob([buf]), `${id}.${ext}`);
  const res = await fetch(`${BASE}/api/ingest/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(`upload ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body.url;
}

async function alreadyInCatalog(col, seed) {
  if (await col.findOne({ id: seed.id }, { projection: { id: 1 } })) return "id";
  const website = String(seed.website || "").trim();
  if (website) {
    const variants = [website, website.replace(/\/$/, ""), `${website.replace(/\/$/, "")}/`];
    const bySource = await col.findOne(
      {
        $or: [
          { website: { $in: variants } },
          { sourceUrls: { $in: variants } },
        ],
      },
      { projection: { id: 1 } }
    );
    if (bySource) return `sourceUrl:${bySource.id}`;
  }
  const host = hostOf(seed.website);
  if (host) {
    const byWeb = await col.findOne(
      {
        website: { $regex: host.replace(/\./g, "\\."), $options: "i" },
        name: { $regex: seed.name.split("—")[0].trim().slice(0, 24), $options: "i" },
      },
      { projection: { id: 1, name: 1 } }
    );
    if (byWeb) return `website:${byWeb.id}`;
  }
  const byName = await col.findOne(
    { name: { $regex: `^${seed.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
    { projection: { id: 1 } }
  );
  if (byName) return `name:${byName.id}`;
  return null;
}

async function publicSmoke(id, citySlug) {
  const city = String(citySlug || "nyc").trim() || "nyc";
  const res = await fetch(`${BASE}/api/public/providers/${encodeURIComponent(id)}?city=${encodeURIComponent(city)}`, {
    signal: AbortSignal.timeout(20000),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  // Detail API wraps the listing: `{ provider: { … } }` (list endpoints return bare rows).
  const provider = (body && body.provider) || body || null;
  return {
    status: res.status,
    category: provider && provider.category,
    name: provider && provider.name,
    city,
  };
}

async function upsertProvider(doc) {
  if (DRY) {
    return { status: 200, body: { ok: true, dryRun: true, id: doc && doc.id } };
  }
  const res = await fetch(`${BASE}/api/ingest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operations: [{ resource: "provider", action: "upsert", document: doc }],
    }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function processSeed(col, seed, state, now, runtimeGate, cityRegions) {
  const attempt = (state.findAttempts && state.findAttempts[seed.id]) || { tries: 0, skips: [] };
  // Rewrite non-canonical tags (bare "Skating") before the public gate + upsert — otherwise
  // ingest succeeds and public detail 404s (unreviewed labels are hidden).
  let activityTypes = normalizeActivityTypes(
    seed.activityTypes,
    // Do not pass longDescription — it often echoes a false tinyout "Skating" service line.
    [seed.name, seed.address, seed.researchNote, seed.website].filter(Boolean).join(" ")
  );
  const name = decodeHtmlEntities(seed.name);
  const fromNbh = boroughForNeighborhood(seed.neighborhood, seed.borough);
  const borough = fromNbh || seed.borough;
  const sanitized = sanitizeActivityTypes({
    name,
    activityTypes,
    shortDescription: seed.shortDescription,
    longDescription: seed.longDescription,
  });
  if (sanitized) activityTypes = sanitized;
  seed = {
    ...seed,
    name,
    borough,
    activityTypes,
  };
  // NYC contamination guard only — LA/Boston system regions legitimately look "outside NYC"
  // (CA/MA zips, area names). Demoting them made lasting-public impossible after multi-city open.
  const seedCity = cityForBorough(seed.borough, cityRegions);
  if (looksOutsideNyc(seed) && (!seedCity || seedCity === "nyc")) {
    seed = { ...seed, publicTarget: false, inventoryOnly: true };
  }
  // Client may hide regions/activities — Find still writes; lasting-public is a KPI label only (rule 441).
  if (
    seed.publicTarget !== false &&
    !seed.inventoryOnly &&
    runtimeGate &&
    publicTargetBlockedReason(seed, runtimeGate)
  ) {
    seed = { ...seed, publicTarget: false, inventoryOnly: true };
  }
  // Unknown region (no registered city owns it) — data-quality stop.
  if (!seedCity) {
    return recordSkip(seed, attempt, state, "region_unknown", { reasonCode: "region_unknown", done: true });
  }
  const wantsPublic = seed.publicTarget !== false && !seed.inventoryOnly;

  appendEvent("find_attempt", {
    seedId: seed.id,
    website: seed.website,
    host: hostOf(seed.website),
    publicTarget: wantsPublic,
    inventoryOnly: Boolean(seed.inventoryOnly),
  });

  if (seed.paused) {
    return recordSkip(seed, attempt, state, "paused_seed", { countTry: false });
  }

  // Lasting-public only: need the runtime gate. Inventory Find proceeds without it.
  if (wantsPublic && !runtimeGate) {
    return recordSkip(seed, attempt, state, "runtime_gate_unavailable");
  }

  const dup = await alreadyInCatalog(col, seed);
  if (dup) {
    attempt.done = true;
    attempt.reason = `exists:${dup}`;
    state.findAttempts[seed.id] = attempt;
    if (!(state.foundIds || []).includes(seed.id) && dup.startsWith("id")) {
      state.foundIds = [...new Set([...(state.foundIds || []), seed.id])];
    }
    return recordSkip(seed, attempt, state, attempt.reason, { countTry: false });
  }

  let page;
  try {
    page = await fetchPage(seed.website);
  } catch (e) {
    return recordSkip(seed, attempt, state, `fetch:${e.message || e}`);
  }
  if (page.status >= 400 || /cdn-cgi\/challenge|just a moment|cf-browser-verification/i.test(page.html)) {
    const reason =
      page.status === 404 ? `http_404` : `http_${page.status}_or_blocked`;
    return recordSkip(seed, attempt, state, reason);
  }

  const extracted = extractFromHtml(page.html, seed.website);

  // Deep enrich BEFORE the street gate: contact/location pages often hold the only
  // usable address, and with the old order those pages were never consulted on skip.
  const htmlCache = new Map();
  htmlCache.set(seed.website, {
    ok: true,
    status: page.status,
    url: page.finalUrl || seed.website,
    text: page.html,
    blocked: false,
  });
  let deep = null;
  try {
    deep = await deepEnrichOfficialSite(
      { id: seed.id, name: seed.name, website: seed.website },
      { htmlCache, maxPages: Number(process.env.CATALOG_FIND_DEEP_PAGES || 8) }
    );
    appendEvent("find_deep_enrich", {
      seedId: seed.id,
      pages: (deep && deep.pages) || [],
      fieldsFound: (deep && deep.fieldsFound) || [],
      streetCount: (deep && deep.streetAddresses && deep.streetAddresses.length) || 0,
    });
  } catch (e) {
    console.warn("find deep enrich failed", seed.id, e.message || e);
    deep = null;
  }

  // Page streets first; seed.address last. Tinyout junk that still looks like a street
  // ("149 The Lion King on Broadway") must lose to an official footer / JSON-LD line.
  const pageCandidates = [
    ...(extracted.streetAddresses || []),
    ...((deep && deep.streetAddresses) || []),
  ];
  let address = pickStreetAddress(
    [...pageCandidates, seed.address].filter(Boolean),
    seed
  );
  let addressPrecision = "exact";
  if (seed.requiresAddressFromPage) {
    const fromPage = pickStreetAddress(pageCandidates, seed);
    if (fromPage) address = fromPage;
  }
  if (!hasStreetAddress(address)) {
    // Quality path: neighborhood/borough as approximate when no usable street (owner 2026-09-23).
    const approx = approximateAddressFromPlace(seed);
    if (approx) {
      address = approx;
      addressPrecision = "approximate";
    } else {
      return recordSkip(seed, attempt, state, "address_unusable");
    }
  }

  if (seed.needsNycLocationConfirm) {
    const blob = `${page.html}`.toLowerCase();
    if (!/(manhattan|brooklyn|new york,\s*ny|nyc)/i.test(blob)) {
      return recordSkip(seed, attempt, state, "not_nyc_confirmed");
    }
  }

  let imgbb;
  let imageSource = "page";
  try {
    const imageUrl = (deep && deep.imageUrl) || extracted.imageUrl;
    let pageImageError = "";
    if (imageUrl) {
      try {
        const { buf, ext } = await downloadImage(imageUrl);
        imgbb = await uploadImage(buf, ext, seed.id);
      } catch (e) {
        pageImageError = String(e.message || e);
      }
    }
    if (!imgbb) {
      // No usable photograph (missing, relative-URL fail, or too small) — generated 1200×800 art.
      const generated = renderGeneratedListingImage(seed);
      imgbb = await uploadImage(generated.buf, generated.ext, seed.id);
      imageSource = "generated_enrichment";
      appendEvent("find_image_fallback", {
        seedId: seed.id,
        reason: pageImageError ? `page_image_failed:${pageImageError.slice(0, 120)}` : "no_page_image",
        pageImageUrl: imageUrl || "",
        width: 1200,
        height: 800,
      });
    }
  } catch (e) {
    return recordSkip(seed, attempt, state, `image:${e.message || e}`);
  }

  const hardHome = extractHardContacts(page.html);
  let phone =
    (deep && deep.phone) || hardHome.phones[0] || extracted.phones[0] || "";
  let email =
    (deep && deep.email) || hardHome.emails[0] || extracted.emails[0] || "";
  if (isContaminatedPhone(phone)) phone = "";
  if (isPlaceholderEmail(email)) email = "";

  let trialPolicy =
    (deep && deep.trialPolicy) || buildTrialPolicy(extracted.trialSnippets || []);
  if (trialPolicy && isBadTrialPolicy(trialPolicy)) trialPolicy = null;

  const priceFromDeep = deep && deep.price && deep.price.evidence !== "unknown" ? deep.price : null;
  const priceFromHome = extractPrice(page.html, seed.website);
  const price =
    priceFromDeep ||
    (priceFromHome && priceFromHome.price) ||
    { evidence: "unknown", sourceText: "" };
  const pricePerClass =
    typeof (deep && deep.pricePerClass) === "number"
      ? deep.pricePerClass
      : priceFromHome && typeof priceFromHome.pricePerClass === "number"
        ? priceFromHome.pricePerClass
        : 0;

  const sessionsFromDeep = deep && Array.isArray(deep.sessions) ? deep.sessions : [];
  const sessionsHome = extractSessions(page.html, seed.id);
  const sessions = sessionsFromDeep.length ? sessionsFromDeep : sessionsHome;

  const agesFromDeep = deep && Array.isArray(deep.ageRanges) ? deep.ageRanges : [];
  const agesHome = extractAgeRanges(page.html);
  const ageRanges =
    (seed.ageRanges && seed.ageRanges.length ? seed.ageRanges : null) ||
    (agesFromDeep.length ? agesFromDeep : null) ||
    (agesHome.length ? agesHome : null) ||
    seed.ageRanges ||
    [];

  const contactLinks = [
    {
      type: "website",
      label: seed.name.slice(0, 80),
      url: seed.website,
      value: seed.website,
    },
  ];
  if (phone) contactLinks.push({ type: "phone", label: "Phone", value: phone, url: `tel:${phone}` });
  if (email) contactLinks.push({ type: "email", label: "Email", value: email, url: `mailto:${email}` });

  let shortDescription = stripUrlsFromPublicCopy(stripBirthdayCopy(seed.shortDescription)).slice(0, 400);
  let longDescription = stripUrlsFromPublicCopy(stripBirthdayCopy(seed.longDescription)).slice(0, 8000);
  const aboutFromHome = extractAboutEvidence(page.html);
  const aboutText =
    (deep && deep.aboutText) || aboutFromHome.aboutText || "";
  const aboutSource =
    (deep && deep.aboutSource) || aboutFromHome.source || null;
  if (isWeakListingCopy(shortDescription, longDescription) || aboutText) {
    const composed = composeListingCopy({
      name: seed.name,
      borough: seed.borough,
      neighborhood: seed.neighborhood,
      address,
      activityTypes: seed.activityTypes,
      aboutText,
      aboutSource,
      services: seed.activityTypes,
    });
    if (composed && composed.quality === "page_evidence") {
      shortDescription = composed.shortDescription;
      longDescription = composed.longDescription;
    } else if (composed && isWeakListingCopy(shortDescription, longDescription)) {
      shortDescription = composed.shortDescription;
      longDescription = composed.longDescription;
    }
  }
  if (!longDescription || publicCopyHasUnsafeChrome(longDescription)) {
    return recordSkip(seed, attempt, state, "ingest:public_copy_unsafe_after_strip");
  }
  if (!(seed.activityTypes || []).length) {
    return recordSkip(seed, attempt, state, "no_activity_mapped");
  }

  const doc = {
    id: seed.id,
    name: seed.name,
    category: seed.category,
    borough: seed.borough,
    neighborhood: seed.neighborhood,
    city: seedCity,
    address,
    activityTypes: seed.activityTypes,
    ageRanges,
    dayTimeTags: seed.dayTimeTags,
    pricePerClass,
    price,
    shortDescription,
    longDescription,
    rating: 0,
    reviewCount: 0,
    badges: seed.publicTarget ? ["New"] : [],
    image: imgbb,
    email: email || "",
    website: seed.website,
    phone: phone || "",
    contactLinks,
    venueModel: "own_premises",
    sourceUrls: uniqueSourceUrls([seed.website, ...((deep && deep.pages) || []).slice(0, 8)]),
    fieldVerifications: [
      {
        field: phone ? "phone" : email ? "email" : "website",
        verifiedAt: now,
        sourceUrl: seed.website,
        method: "official_page",
        verifiedBy: "catalog-loop",
      },
    ],
    bookingEnabled: false,
  };
  // Belt-and-suspenders with ingest rule 447 — city must match the borough's owning city.
  if (doc.city !== seedCity) {
    return recordSkip(seed, attempt, state, `city_borough_mismatch:${doc.city}!=${seedCity}`, {
      reasonCode: "city_borough_mismatch",
    });
  }
  // Approximate place addresses stay address-only; geo backfill adds approximate pins later.
  if (trialPolicy) doc.trialPolicy = trialPolicy;
  if (sessions.length) doc.sessions = sessions;

  const hiddenBy = wantsPublic && runtimeGate ? publicTargetBlockedReason(seed, runtimeGate) : null;
  const isPublicTarget = wantsPublic && !hiddenBy;

  const upsert = await upsertProvider(doc);
  if (upsert.status !== 200 || !upsert.body || upsert.body.ok === false) {
    const bodySlice = JSON.stringify(upsert.body).slice(0, 300);
    appendEvent("ingest_reject", {
      seedId: seed.id,
      status: upsert.status,
      body: bodySlice,
    });
    // Within-document "duplicate source URL" (providerValidation) is NOT a catalog hit —
    // it used to fire when deep.pages repeated seed.website, then wrongly marked the seed done.
    // Only mark done when Mongo already holds this venue (exists:* skips) or ingest names another id.
    if (/already exists|duplicate id|id already/i.test(bodySlice)) {
      attempt.reason = "duplicate_existing";
      state.findAttempts[seed.id] = attempt;
      return recordSkip(seed, attempt, state, "ingest:duplicate_existing", {
        countTry: false,
        done: true,
        reasonCode: "duplicate_existing",
      });
    }
    return recordSkip(
      seed,
      attempt,
      state,
      `ingest:${upsert.status}:${bodySlice}`
    );
  }

  if (DRY) {
    appendEvent("find_publish", {
      seedId: seed.id,
      publicTarget: isPublicTarget,
      dryRun: true,
      address,
      phone: Boolean(phone),
      email: Boolean(email),
      imageSource,
    });
    return {
      ok: true,
      dryRun: true,
      seedId: seed.id,
      address,
      phone: Boolean(phone),
      email: Boolean(email),
    };
  }

  const smokeCity = seedCity || doc.city || "nyc";
  const smoke = await publicSmoke(seed.id, smokeCity);
  appendEvent("find_publish", {
    seedId: seed.id,
    publicTarget: isPublicTarget,
    address,
    phone: Boolean(phone),
    email: Boolean(email),
    imageSource,
  });
  appendEvent("find_smoke", {
    seedId: seed.id,
    status: smoke.status,
    category: smoke.category,
    publicTarget: isPublicTarget,
    city: smokeCity,
  });

  if (isPublicTarget && smoke.status !== 200) {
    attempt.tries += 1;
    attempt.lastError = `smoke_not_public:${smoke.status}`;
    attempt.lastReasonCode = "smoke_not_public";
    attempt.publicStatus = smoke.status;
    attempt.publicTarget = isPublicTarget;
    state.findAttempts[seed.id] = attempt;
    appendEvent("find_skip", {
      seedId: seed.id,
      reason: attempt.lastError,
      reasonCode: "smoke_not_public",
      publicTarget: true,
    });
    // Still record as published inventory — but not a lasting-public win.
  }

  attempt.done = true;
  attempt.publishedAt = now;
  attempt.publicStatus = smoke.status;
  attempt.publicCategory = smoke.category;
  attempt.publicTarget = isPublicTarget;
  state.findAttempts[seed.id] = attempt;
  state.foundIds = [...new Set([...(state.foundIds || []), seed.id])];
  if (isPublicTarget && smoke.status === 200) {
    state.watchIds = [...new Set([...(state.watchIds || []), seed.id])];
    state.findPublicNew = (state.findPublicNew || 0) + 1;
  } else {
    state.findInventoryNew = (state.findInventoryNew || 0) + 1;
  }

  return {
    id: seed.id,
    ok: true,
    publicTarget: isPublicTarget,
    smoke,
    phone: Boolean(phone),
    email: Boolean(email),
    address,
    image: imgbb,
  };
}

async function main() {
  if (!DRY && !KEY) throw new Error("INGEST_API_KEY missing");
  ensureDir(DATA_DIR);

  const { shouldDeferFind, readSelfHealStatus } = require("./lib/selfHeal.cjs");
  if (shouldDeferFind()) {
    const status = readSelfHealStatus() || {};
    const out = {
      at: new Date().toISOString(),
      dryRun: DRY,
      deferred: true,
      reason: "self_heal_debt_hot",
      attempted: 0,
      published: 0,
      publicPublished: 0,
      selfHeal: {
        weakAboutOpen: status.weakAboutOpen,
        priorityOpen: status.priorityOpen,
        softAboutCount: status.softAboutCount,
        briefs: status.briefs || [],
      },
      results: [],
    };
    fs.writeFileSync(FIND_LOG, JSON.stringify(out, null, 2));
    console.log(JSON.stringify({ findCycle: true, dryRun: DRY, deferred: true, ...out.selfHeal }));
    appendEvent("find_deferred_self_heal", {
      weakAboutOpen: status.weakAboutOpen,
      priorityOpen: status.priorityOpen,
    });
    return;
  }

  console.log(JSON.stringify({ findCycle: true, dryRun: DRY, batch: BATCH }));
  const seedsDoc = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
  const seeds = seedsDoc.seeds || [];
  const state = loadState();
  state.findAttempts = state.findAttempts || {};
  const now = new Date().toISOString();

  // Revive seeds wrongly marked done when ingest rejected within-doc duplicate sourceUrls
  // (homepage repeated in deep.pages). That is not a catalog collision.
  let revivedFalseDup = 0;
  let revivedInventoryGate = 0;
  for (const [id, att] of Object.entries(state.findAttempts)) {
    if (!att || !att.done) continue;
    if (att.reason === "duplicate_source_url" || att.lastError === "ingest:duplicate_source_url") {
      delete att.done;
      att.falseDuplicateRevived = true;
      att.revivedAt = now;
      att.tries = Math.min(Number(att.tries) || 0, 1);
      state.findAttempts[id] = att;
      revivedFalseDup += 1;
      continue;
    }
    // Runtime-disabled region/activity used to hard-skip + retire. Owner 2026-09-23: still Find
    // those as inventory — clear done so the demotion path can run.
    const gateCode = att.retireReason || att.lastReasonCode || "";
    if (
      (gateCode === "region_not_public" || gateCode === "activity_not_public") &&
      !att.publishedAt &&
      !att.inventoryGateRevived
    ) {
      delete att.done;
      delete att.retiredAt;
      delete att.retireReason;
      att.inventoryGateRevived = true;
      att.revivedAt = now;
      att.tries = Math.min(Number(att.tries) || 0, 1);
      state.findAttempts[id] = att;
      revivedInventoryGate += 1;
    }
  }
  if (revivedFalseDup) {
    console.log("find revived false duplicate_source_url", revivedFalseDup);
    appendEvent("find_revive_false_duplicate", { count: revivedFalseDup, at: now });
  }
  if (revivedInventoryGate) {
    console.log("find revived inventory-gate skips", revivedInventoryGate);
    appendEvent("find_revive_inventory_gate", { count: revivedInventoryGate, at: now });
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const col = client.db("classscoutcluster").collection("providers");

  const cityRegions = loadCityRegions();
  let runtimeGate = null;
  try {
    runtimeGate = await fetchPublicRuntimeGate(BASE);
  } catch (e) {
    console.warn("find cycle: runtime-config gate unavailable, continuing without pre-check", e.message || e);
  }

  const pending = [];
  const cursor = Number(state.findCursor) || 0;
  const n = seeds.length;
  if (!n) {
    console.log("find cycle no seeds");
    await client.close();
    return;
  }
  const foundSet = new Set(state.foundIds || []);
  // Crash mid-batch used to lose in-memory `done` marks; anything already in foundIds is done.
  let syncedFound = 0;
  for (const id of foundSet) {
    const att = state.findAttempts[id] || { tries: 0, skips: [] };
    if (!att.done) {
      att.done = true;
      att.lastReasonCode = att.lastReasonCode || "already_found";
      att.syncedFromFoundIds = true;
      state.findAttempts[id] = att;
      syncedFound += 1;
    }
  }
  if (syncedFound) {
    console.log("find synced foundIds → done", syncedFound);
    appendEvent("find_sync_found_ids", { count: syncedFound, at: now });
  }

  for (let i = 0; i < n; i++) {
    const idx = (cursor + i) % n;
    const seed = seeds[idx];
    if (!seed || !seed.id || seed.paused) continue;
    if (ONLY_SEED_IDS.size > 0 && !ONLY_SEED_IDS.has(seed.id)) continue;
    if (foundSet.has(seed.id)) continue;
    const att = state.findAttempts[seed.id];
    if (att && att.done) continue;
    // Already hit a terminal skip (no street / 404 / blocked / fetch) — leave the batch.
    // Ops URL swaps clear the attempt object entirely before retrying with CATALOG_FIND_SEED_IDS.
    if (isTerminalFindAttempt(att)) {
      att.done = true;
      att.retiredAt = att.retiredAt || now;
      att.retireReason = att.lastReasonCode || "terminal";
      state.findAttempts[seed.id] = att;
      continue;
    }
    // Image-download failures used to burn the try budget before generated-art fallback existed.
    // Revive exhausted no_image attempts once so Find can publish with enrichment art.
    if (att && att.tries >= 5) {
      if (att.lastReasonCode === "no_image" && !att.imageFallbackRevived) {
        att.tries = 0;
        att.imageFallbackRevived = true;
        att.revivedAt = new Date().toISOString();
        state.findAttempts[seed.id] = att;
      } else {
        continue;
      }
    }
    // Include inventory seeds for disabled regions/activities — Find + Improve still run;
    // lasting-public is decided at upsert via publicTargetBlockedReason demotion.
    pending.push({ seed, idx, attempt: att || null });
  }

  // Prefer seeds that fill thin neighborhoods / scarce sports from the hourly brief,
  // then street-ready / fair-use leads over address-less Drive harvest (rule 438).
  const brief = loadBriefFromDisk(fs, SCARCITY_BRIEF_PATH);
  const ordered = prioritizeSeedsByBrief(pending, brief);

  // Preflight Mongo for a wider candidate window so already-catalog rows do not burn the batch
  // (mid-batch crash used to leave published seeds unmarked — durable Find progress).
  const candidateWindow = ordered.slice(0, Math.max(BATCH * 4, BATCH));
  const candidateIds = candidateWindow.map((c) => c.seed.id);
  const existingIds = new Set();
  if (candidateIds.length) {
    const rows = await col
      .find({ id: { $in: candidateIds } }, { projection: { id: 1 } })
      .toArray();
    for (const row of rows) existingIds.add(row.id);
  }
  let preflightDup = 0;
  const ready = [];
  for (const item of candidateWindow) {
    if (existingIds.has(item.seed.id)) {
      const attempt = state.findAttempts[item.seed.id] || { tries: 0, skips: [] };
      attempt.done = true;
      attempt.reason = "exists:id";
      attempt.lastReasonCode = "duplicate_existing";
      attempt.preflightDup = true;
      state.findAttempts[item.seed.id] = attempt;
      foundSet.add(item.seed.id);
      state.foundIds = [...foundSet];
      preflightDup += 1;
      appendEvent("find_skip", {
        seedId: item.seed.id,
        website: item.seed.website,
        host: hostOf(item.seed.website),
        reason: "exists:id",
        reasonCode: "duplicate_existing",
        preflight: true,
        publicTarget: item.seed.publicTarget !== false && !item.seed.inventoryOnly,
      });
      continue;
    }
    ready.push(item);
    if (ready.length >= BATCH) break;
  }
  if (preflightDup) {
    console.log("find preflight catalog dups marked done", preflightDup);
  }

  const batch = ready.slice(0, BATCH);
  const results = [];
  for (const { seed, idx } of batch) {
    console.log("find attempt", seed.id, seed.website);
    let r;
    try {
      r = await processSeed(col, seed, state, now, runtimeGate, cityRegions);
    } catch (e) {
      const attempt = state.findAttempts[seed.id] || { tries: 0, skips: [] };
      r = recordSkip(seed, attempt, state, `fetch:${e.message || e}`, {
        reasonCode: "fetch_error",
      });
      console.error("find seed threw", seed.id, e.message || e);
    }
    results.push(r);
    console.log("find result", JSON.stringify(r));
    // Advance cursor past this seed's original index so non-scarce rotation still progresses.
    state.findCursor = (idx + 1) % n;
    // Persist after every seed so a mid-batch crash cannot re-queue already-handled ids.
    if (!DRY) saveState(state);
  }

  const published = results.filter((r) => r.ok);
  const out = {
    at: now,
    dryRun: DRY,
    attempted: results.length,
    published: published.length,
    publicPublished: published.filter((r) => r.publicTarget && r.smoke && r.smoke.status === 200)
      .length,
    results,
  };
  fs.writeFileSync(FIND_LOG, JSON.stringify(out, null, 2));
  if (!DRY) saveState(state);
  console.log(
    "find cycle",
    JSON.stringify({
      dryRun: DRY,
      attempted: out.attempted,
      published: out.published,
      publicPublished: out.publicPublished,
    })
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
