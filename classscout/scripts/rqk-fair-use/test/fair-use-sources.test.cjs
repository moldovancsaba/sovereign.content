/**
 * Unit tests for fair-use multi-source helpers (no network).
 */
const assert = require("assert");
const {
  decodeHtmlEntities,
  extractGenericFacts,
  pickRealLookingAddress,
  harvestByHrefPattern,
  harvestSitemapLocs,
} = require("../lib/genericExtract.cjs");
const { buildCitationSeed, inferBorough } = require("../lib/seedBuilder.cjs");
const { migrateRootState } = require("../lib/common.cjs");
const { mapActivityTypes, mapAgeRanges } = require("../lib/rqkExtract.cjs");
const { isAcceptableLead } = require("../lib/leadQuality.cjs");
const { isDeadHubUrl } = require("../lib/deadHubPatterns.cjs");
const { stripUrlsFromPublicCopy } = require("../../lib/publicCopyHygiene.cjs");
const rqk = require("../lib/sources/rqk.cjs");
const kidclick = require("../lib/sources/kidclick.cjs");
const sprout = require("../lib/sources/sprout.cjs");
const tinyout = require("../lib/sources/tinyout.cjs");
const macaroni = require("../lib/sources/macaroni-kid-brooklyn-nw.cjs");
const beyondCamps = require("../lib/sources/beyond-camps.cjs");
const classcub = require("../lib/sources/classcub-swim-nyc.cjs");
const uptown = require("../lib/sources/uptown-family-calendar.cjs");
const { ALL, BY_ID, loadEnabledSources } = require("../lib/sources/index.cjs");
const { inferServicesFromBlob } = require("../lib/genericExtract.cjs");

function testGenericExtract() {
  const html = `
    <html><head><title>Acme Dance Studio · kidclick</title></head>
    <body><h1>Acme Dance Studio</h1>
    <p>175 North End Avenue, New York, NY 10282</p>
    <p>Phone (212) 555-0199</p>
    <a href="https://acmedance.example/">Website</a>
    <a href="https://www.facebook.com/acme">fb</a>
    </body></html>`;
  const facts = extractGenericFacts(html, "https://www.kidclick.com/nyc/manhattan/places/acme", {
    sourceHost: "kidclick.com",
  });
  assert.equal(facts.name, "Acme Dance Studio");
  assert.ok(facts.address.includes("175 North End"));
  assert.equal(facts.website, "https://acmedance.example/");
  assert.equal(facts.borough, "Manhattan");
}

function testHarvestKidclick() {
  const html = `
    <a href="/nyc/brooklyn/places/camp-half-blood-brooklyn-abc">x</a>
    <a href="/nyc/events/123-day-camp">y</a>
    <a href="/nyc/manhattan">boro</a>`;
  const urls = kidclick.harvestDetailUrls(html);
  assert.ok(urls.some((u) => u.includes("/places/")));
  assert.ok(urls.some((u) => u.includes("/events/")));
  const expanded = kidclick.expandDetailQueue(
    `<a href="/nyc/manhattan/places/battery-park-city-library-d106b8bfe2589803">p</a>`,
    "https://www.kidclick.com/nyc/events/14673-x/"
  );
  assert.equal(expanded.length, 1);
}

function testHarvestSproutSitemap() {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://sproutnyc.com/places/102nd-street-field-house</loc></url>
    <url><loc>https://sproutnyc.com/event/abc-open-art</loc></url>
    <url><loc>https://sproutnyc.com/search</loc></url>
  </urlset>`;
  const urls = sprout.harvestDetailUrls(xml, "https://sproutnyc.com/sitemaps/events.xml");
  assert.equal(urls.length, 1);
  assert.ok(urls[0].includes("/event/"));
}

function testRqkHarvest() {
  const html = `<a href="/provider/fierce-dragon/r/recABC/">x</a>
    <a href="https://www.raisingqueenskids.com/provider/other/r/recDEF/">y</a>`;
  const urls = rqk.harvestDetailUrls(html);
  assert.ok(urls.length >= 1);
  assert.ok(urls.every((u) => u.includes("/provider/")));
}

function testSeedBuilderInventory() {
  const { seed } = buildCitationSeed(
    {
      name: "Queens Dojo",
      address: "1 Main St, Flushing, NY 11354",
      website: "https://queensdojo.example/",
      citationUrl: "https://www.raisingqueenskids.com/provider/queens-dojo/r/recX/",
      borough: "Queens",
      services: ["Kids Martial Arts"],
    },
    rqk
  );
  assert.ok(seed);
  assert.equal(seed.inventoryOnly, true);
  assert.equal(seed.publicTarget, false);
  assert.equal(seed.borough, "Queens");
  assert.ok(seed.id.startsWith("prov-rqk-"));
  assert.ok(seed.researchSources.includes("https://www.raisingqueenskids.com/provider/queens-dojo/r/recX/"));
  assert.ok(!/https?:\/\//i.test(seed.longDescription));
}

function testSeedBuilderPublic() {
  const { seed } = buildCitationSeed(
    {
      name: "Brooklyn Ballet",
      address: "100 7th Avenue, Brooklyn, NY 11215",
      website: "https://bkballet.example/",
      citationUrl: "https://www.kidclick.com/nyc/brooklyn/places/brooklyn-ballet/",
      borough: "Brooklyn",
      neighborhood: "Park Slope",
      services: ["Ballet", "Dance"],
    },
    kidclick
  );
  assert.ok(seed);
  assert.equal(seed.inventoryOnly, false);
  assert.equal(seed.publicTarget, true);
  assert.ok(seed.activityTypes.includes("Dance"));
  assert.ok(!/https?:\/\//i.test(seed.longDescription));
}

function testSeedBuilderActivityGate() {
  const gate = {
    disabledActivities: new Set(["Art", "Music", "Ballet"]),
    enabledActivities: [],
    disabledRegions: new Set(["Queens"]),
    disabledBrowseCategories: new Set(["birthday-parties"]),
  };
  const artOnly = buildCitationSeed(
    {
      name: "Art Studio BK",
      address: "10 Main St, Brooklyn, NY 11201",
      website: "https://artstudio.example/",
      citationUrl: "https://www.kidclick.com/nyc/brooklyn/places/art-studio/",
      borough: "Brooklyn",
      services: ["Kids Art Classes"],
    },
    kidclick,
    gate
  ).seed;
  assert.equal(artOnly.inventoryOnly, true);
  assert.equal(artOnly.publicTarget, false);

  const danceOk = buildCitationSeed(
    {
      name: "Dance BK",
      address: "10 Main St, Brooklyn, NY 11201",
      website: "https://dance.example/",
      citationUrl: "https://www.kidclick.com/nyc/brooklyn/places/dance-bk/",
      borough: "Brooklyn",
      services: ["Kids Dance"],
    },
    kidclick,
    gate
  ).seed;
  assert.equal(danceOk.inventoryOnly, false);
  assert.equal(danceOk.publicTarget, true);
}

function testNoMartialArtsDefault() {
  assert.deepEqual(mapActivityTypes(["roller skating"], "Pier 2 Free Admission Days"), ["Roller Skating"]);
  assert.deepEqual(mapActivityTypes(["fall fest"], "Back to School Fall Fest"), []);
  assert.deepEqual(mapActivityTypes(["youth beach volleyball"], "QBK Sunnyside"), ["Beach Volleyball"]);
  assert.deepEqual(mapActivityTypes(["capoeira for kids"], "Manhattan Capoeira"), ["Capoeira"]);
  assert.deepEqual(mapActivityTypes(["aikido dojo"], "NY Aikido"), ["Aikido"]);
  assert.deepEqual(mapActivityTypes(["water polo club"], "Aquatic Center"), ["Water Polo"]);
  assert.deepEqual(mapActivityTypes(["Kids Cooking Classes"], "Corey Kids Kitchen"), ["Cooking"]);
  assert.deepEqual(mapActivityTypes(["Baseball / Softball"], "Little League"), ["Softball", "Baseball"]);
  assert.deepEqual(mapActivityTypes(["Fencing"], "NY Fencing Club"), ["Fencing"]);
  assert.deepEqual(mapActivityTypes(["Flag Football"], "NYC Flag Football"), ["Flag Football"]);
  assert.deepEqual(mapActivityTypes(["Theater"], "Kids Drama Studio"), ["Theater"]);
  assert.deepEqual(mapActivityTypes(["Tutoring"], "Math Tutors NYC"), ["Tutoring"]);
  assert.deepEqual(mapActivityTypes(["Sports"], "Asphalt Green"), ["Sports"]);
  const rejected = buildCitationSeed(
    {
      name: "Mystery Program",
      address: "10 Main St, Brooklyn, NY 11201",
      website: "https://mystery.example/",
      citationUrl: "https://sproutnyc.com/places/mystery",
      borough: "Brooklyn",
      services: [],
    },
    sprout
  );
  assert.equal(rejected.seed, null);
  assert.equal(rejected.rejectReason, "no_activity_mapped");
}

function testLeadQuality() {
  const bad = isAcceptableLead(
    { name: "Explore Brooklyn, NY", website: "https://x.com/Beakid_official", citationUrl: "https://beakid.com/ny/brooklyn" },
    { id: "beakid", name: "BeAKid", base: "https://beakid.com" }
  );
  assert.equal(bad.ok, false);
  const event = isAcceptableLead(
    {
      name: "Sundaes on the Overlook",
      website: "https://wollmanrinknyc.com/community-calendar/",
      citationUrl: "https://sproutnyc.com/event/sundaes",
      address: "",
    },
    { id: "sprout", name: "Sprout", base: "https://sproutnyc.com" }
  );
  assert.equal(event.ok, false);
  assert.equal(event.reason, "one_off_event");
  const good = isAcceptableLead(
    {
      name: "Staten Island Children’s Museum",
      website: "https://sichildrensmuseum.org/",
      citationUrl: "https://sproutnyc.com/places/si-museum",
      address: "1000 Richmond Terrace, Staten Island, NY 10301",
    },
    { id: "sprout", name: "Sprout", base: "https://sproutnyc.com" }
  );
  assert.equal(good.ok, true);
  const la = isAcceptableLead(
    { name: "Los Angeles Summer Camp Guide", website: "https://mommypoppins.com/los-angeles/x", citationUrl: "https://mommypoppins.com/los-angeles/x" },
    { id: "mommy-poppins", name: "Mommy Poppins", base: "https://mommypoppins.com" }
  );
  assert.equal(la.ok, false);
}

function testDeadHubsAndCopyHygiene() {
  assert.equal(isDeadHubUrl("https://www.timeout.com/new-york-kids/museums/", "timeout-ny-kids"), true);
  assert.equal(isDeadHubUrl("https://www.parkslopeparents.com/reviews/home-life/plumbers.html/", "park-slope-parents"), true);
  const cleaned = stripUrlsFromPublicCopy(
    "Studio is great.\n\nOfficial website (preferred Find target): https://example.com/.\n\nDiscovery path (citation): https://rqk.example/x."
  );
  assert.ok(!/https?:\/\//i.test(cleaned));
  assert.ok(!/discovery path/i.test(cleaned));
}

function testStateMigration() {
  const raw = {
    queue: ["https://www.raisingqueenskids.com/provider/a/"],
    done: { "https://x": { at: "t" } },
    discoveryCursor: 2,
    leadsAdded: 3,
    lastRqkFetchAt: "2026-09-21T00:00:00.000Z",
  };
  const migrated = migrateRootState(raw);
  assert.ok(migrated.sources.rqk.queue.length === 1);
  assert.equal(migrated.sources.rqk.leadsAdded, 3);
  assert.equal(migrated.sources.rqk.discoveryCursor, 2);
  void harvestByHrefPattern;
  void harvestSitemapLocs;
}

function testNewSourceRegistry() {
  assert.ok(ALL.length >= 31);
  assert.equal(BY_ID.tinyout.id, "tinyout");
  assert.equal(BY_ID["macaroni-kid-brooklyn-nw"].id, "macaroni-kid-brooklyn-nw");
  assert.equal(BY_ID["classcub-swim-nyc"].id, "classcub-swim-nyc");
  const prev = process.env.FAIR_USE_SOURCES;
  process.env.FAIR_USE_SOURCES = "tinyout,beyond-camps";
  const enabled = loadEnabledSources();
  assert.equal(enabled.length, 2);
  assert.equal(enabled[0].id, "tinyout");
  if (prev === undefined) delete process.env.FAIR_USE_SOURCES;
  else process.env.FAIR_USE_SOURCES = prev;
}

function testHarvestTinyoutMacaroniBeyondClasscub() {
  const tinyHtml = `
    <a href="/studios/14th-street-y">Y</a>
    <a href="/studios">index</a>
    <a href="/studios/aca-swim-school">swim</a>`;
  const tinyUrls = tinyout.harvestDetailUrls(tinyHtml);
  assert.ok(tinyUrls.some((u) => u.includes("/studios/14th-street-y")));
  assert.ok(!tinyUrls.some((u) => /\/studios\/?$/i.test(u.replace(/\/$/, "") + "/")));

  const macHtml = `
    <a href="/directory/6a749f10189381edc4f79e8e/gotham-gymnastics">g</a>
    <a href="/directory/category/5c848c332eeace7f1683d3ad/extracurricular-activities">cat</a>`;
  const macUrls = macaroni.harvestDetailUrls(macHtml);
  assert.equal(macUrls.length, 1);
  assert.ok(macUrls[0].includes("gotham-gymnastics"));

  const beyondHtml = `
    <a href="/providers/aikido-of-park-slope">a</a>
    <a href="/providers/aikido-of-park-slope/camps/aikido-summer-camp-6062">camp</a>
    <a href="/providers">all</a>`;
  const beyondUrls = beyondCamps.harvestDetailUrls(beyondHtml);
  assert.ok(beyondUrls.some((u) => /\/providers\/aikido-of-park-slope\/?$/i.test(u)));
  assert.ok(!beyondUrls.some((u) => /\/camps\//i.test(u)));

  const cubHtml = `
    <a href="/provider/penguin-city-swim-new-york-ny">p</a>
    <a href="https://www.penguincityswim.com">site</a>`;
  const cubUrls = classcub.harvestDetailUrls(cubHtml);
  assert.equal(cubUrls.length, 1);
}

function testUptownOfficialHarvest() {
  const html = `
    <a href="https://www.funfitnyc.com/">FunFit</a>
    <a href="https://www.instagram.com/x/">ig</a>
    <a href="https://www.eventbrite.com/e/foo">ev</a>
    <a href="https://broadwaypac.com/classes/">bpac</a>`;
  const urls = uptown.harvestDetailUrls(html, "https://www.uptownfamilycalendar.com/class-directory");
  assert.ok(urls.some((u) => /funfitnyc\.com/i.test(u)));
  assert.ok(urls.some((u) => /broadwaypac\.com/i.test(u)));
  assert.ok(!urls.some((u) => /instagram|eventbrite/i.test(u)));
}

/**
 * Board issue 943 — `name` used to be pulled straight from raw `html` and never entity-decoded, so
 * "&amp;"/"&#x27;" rendered live on production names ("Victory Music &amp; Dance Company",
 * "Brooklyn Children&#x27;s Theatre").
 */
function testNameEntityDecoding() {
  assert.equal(decodeHtmlEntities("Victory Music &amp; Dance Company Inc."), "Victory Music & Dance Company Inc.");
  assert.equal(decodeHtmlEntities("Brooklyn Children&#x27;s Theatre"), "Brooklyn Children's Theatre");
  assert.equal(decodeHtmlEntities("Brooklyn Children&#39;s Theatre"), "Brooklyn Children's Theatre");

  const html = `<html><body><h1>Victory Music &amp; Dance Company Inc.</h1></body></html>`;
  assert.equal(extractGenericFacts(html, "https://example.com/victory-music").name, "Victory Music & Dance Company Inc.");

  const html2 = `<html><body><h1>Brooklyn Children&#x27;s Theatre</h1></body></html>`;
  assert.equal(extractGenericFacts(html2, "https://example.com/bct").name, "Brooklyn Children's Theatre");
}

/**
 * Board issue 938 — `source.boroughDefault` used to short-circuit BEFORE the neighborhood-keyword
 * inference ran, so tinyout/drive-sheets records with no literal borough word on the page (very common
 * — a page names "Boerum Hill", never "Brooklyn") fell straight to the source's hardcoded Manhattan
 * default instead of resolving from the neighborhood text already in `facts`.
 */
function testInferBoroughDefaultIsLastResort() {
  const tinyoutLike = { boroughDefault: "Manhattan" };
  assert.equal(inferBorough({ borough: "Queens" }, tinyoutLike), "Queens");
  assert.equal(inferBorough({ neighborhood: "Boerum Hill" }, tinyoutLike), "Brooklyn");
  assert.equal(inferBorough({ name: "Fort Greene Falcons Soccer Club" }, tinyoutLike), "Brooklyn");
  assert.equal(inferBorough({ address: "123 Bay Ridge Pkwy" }, tinyoutLike), "Brooklyn");
  assert.equal(inferBorough({ neighborhood: "Richmond Hill" }, tinyoutLike), "Queens");
  assert.equal(inferBorough({ neighborhood: "Westchester Square" }, tinyoutLike), "Bronx");
  // The source default is still the LAST resort when nothing else resolves.
  assert.equal(inferBorough({}, tinyoutLike), "Manhattan");
  assert.equal(inferBorough({}, {}), "Brooklyn");
}

/**
 * Board issue 941 — an unmatched/empty ageText used to default to the wide bucket ["3–5","6–8","9–12"]
 * (roughly "3–12") instead of empty ("Age not confirmed" downstream), exactly the pattern the audit
 * found repeatedly on live listings.
 */
function testMapAgeRangesNoLongerDefaultsToWideBucket() {
  assert.deepEqual(mapAgeRanges(""), []);
  assert.deepEqual(mapAgeRanges(undefined), []);
  assert.deepEqual(mapAgeRanges("call for details"), []);
  // Real evidence still resolves — unaffected by this fix, which only changes the no-match fallback.
  assert.deepEqual(mapAgeRanges("ages 6 to 8"), ["6–8"]);
}

/**
 * Board issue 940 — the address regex used to have a second, looser fallback (no NY/zip requirement)
 * that matched "Street"/"Avenue"/etc. wherever they appeared in page prose, not only in a real address.
 * Confirmed reproduced live: "2016 Wall Street Journal survey of 900+ executives: 92%" was published as
 * Trail Blazers' address.
 */
function testAddressRejectsNonAddressProseAndMarkup() {
  const journalHtml = `<html><body><h1>Trail Blazers</h1><p>2016 Wall Street Journal survey of 900+ executives: 92% said outdoor time matters.</p></body></html>`;
  assert.equal(extractGenericFacts(journalHtml, "https://example.com/trail-blazers").address, "");

  const realHtml = `<html><body><h1>Real Studio</h1><p>123 West 76th Street, New York, NY 10023</p></body></html>`;
  assert.equal(extractGenericFacts(realHtml, "https://example.com/real-studio").address, "123 West 76th Street, New York, NY 10023");

  assert.equal(pickRealLookingAddress(['3 grid-md-col-6 h-100 d-flex pl-md-2 border-left-md-1">']), "");
  assert.equal(pickRealLookingAddress(['United States","email']), "");
  assert.equal(pickRealLookingAddress(["209 W 42nd Street, New York, NY 10036"]), "209 W 42nd Street, New York, NY 10036");
}

function testInferServicesAndCampMap() {
  assert.ok(inferServicesFromBlob("Gotham Gymnastics Park Slope").includes("Gymnastics"));
  assert.ok(inferServicesFromBlob("Penguin City Swim").includes("Swimming"));
  // Bare "camp" must not become the Camps category-as-activity leak.
  assert.ok(!mapActivityTypes(["Camp"], "Brooklyn Day Camp").includes("Camps"));
  assert.ok(mapActivityTypes(["Camp", "Soccer"], "Brooklyn Soccer Camp").includes("Soccer"));
}

testGenericExtract();
testHarvestKidclick();
testHarvestSproutSitemap();
testRqkHarvest();
testSeedBuilderInventory();
testSeedBuilderPublic();
testSeedBuilderActivityGate();
testNoMartialArtsDefault();
testLeadQuality();
testDeadHubsAndCopyHygiene();
testStateMigration();
testNewSourceRegistry();
testHarvestTinyoutMacaroniBeyondClasscub();
testUptownOfficialHarvest();
testInferServicesAndCampMap();
testNameEntityDecoding();
testInferBoroughDefaultIsLastResort();
testMapAgeRangesNoLongerDefaultsToWideBucket();
testAddressRejectsNonAddressProseAndMarkup();
console.log("fair-use multi-source tests ok");
