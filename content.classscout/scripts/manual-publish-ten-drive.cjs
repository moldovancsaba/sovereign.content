#!/usr/bin/env node
/**
 * Manual one-shot: publish 10 evidence-backed listings from Drive Provider
 * Research leads (prov-drive-sheets-*). Addresses/phones/emails taken only
 * from official pages fetched 2026-09-22.
 */
require("./_productRoot.cjs").loadProductEnv();
const { renderGeneratedListingImage } = require("./lib/listingEnrichmentImage.cjs");
const { stripUrlsFromPublicCopy } = require("./lib/publicCopyHygiene.cjs");
const { normalizePhone } = require("./lib/extractOfficialPage.cjs");
const { loadCityRegions, cityForBorough } = require("./lib/cityOwnership.cjs");

const BASE = process.env.CATALOG_LOOP_BASE || "https://getyourfield.com";
const KEY = process.env.INGEST_API_KEY;
const now = new Date().toISOString();

/** Ten Drive-sheet leads with official-page street evidence (2026-09-22). */
const OPPORTUNITIES = [
  {
    id: "prov-drive-sheets-jodi-s-gym",
    name: "Jodi's Gym",
    website: "https://www.jodisgym.com/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Upper East Side",
    address: "244 East 84th Street, New York, NY 10028",
    activityTypes: ["Gymnastics"],
    ageRanges: ["0–2", "3–5", "6–8", "9–12"],
    dayTimeTags: ["Weekday", "Weekend", "Morning", "Afternoon", "After-school"],
    phone: "+12127727633",
    email: "ues@jodisgym.com",
    shortDescription:
      "Jodi's Gym offers kids gymnastics classes at 244 East 84th Street on the Upper East Side.",
    longDescription:
      "Jodi's Gym teaches children's gymnastics at 244 East 84th Street, New York, NY 10028. The official site lists this Upper East Side studio address and contact email ues@jodisgym.com; the contact page states phone 212-772-7633.",
  },
  {
    id: "prov-drive-sheets-tiger-strong-nyc",
    name: "Tiger Strong NYC",
    website: "https://tigerstrongnyc.com/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Upper East Side",
    address: "1521 York Avenue, New York, NY 10028",
    activityTypes: ["Taekwondo", "Martial Arts"],
    ageRanges: ["3–5", "6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "Evening", "After-school"],
    phone: "+19174536503",
    email: "info@tigerstrongnyc.com",
    shortDescription:
      "Tiger Strong NYC teaches kids Taekwondo at 1521 York Avenue on the Upper East Side.",
    longDescription:
      "Tiger Strong NYC lists its studio at 1521 York Ave. on the official homepage and publishes contact phone 917-453-6503 and email info@tigerstrongnyc.com. Programs are kids martial arts / Taekwondo on the Upper East Side.",
  },
  {
    id: "prov-drive-sheets-prospect-gymnastics",
    name: "Prospect Gymnastics — Church Avenue",
    website: "https://www.prospectgymnastics.com/",
    category: "Classes",
    borough: "Brooklyn",
    neighborhood: "Kensington",
    address: "1023 Church Avenue, Brooklyn, NY 11218",
    activityTypes: ["Gymnastics"],
    ageRanges: ["0–2", "3–5", "6–8", "9–12"],
    dayTimeTags: ["Weekday", "Weekend", "Morning", "Afternoon", "After-school"],
    phone: "+17184840911",
    email: "info@prospectgymnastics.com",
    shortDescription:
      "Prospect Gymnastics teaches kids gymnastics at 1023 Church Avenue in Brooklyn.",
    longDescription:
      "Prospect Gymnastics publishes studio locations on its official site, including 1023 Church Ave, Brooklyn, NY 11218. Contact blocks list phone 718-484-0911 and email info@prospectgymnastics.com for kids gymnastics programs.",
  },
  {
    id: "prov-drive-sheets-brooklyn-zoo-ny",
    name: "Brooklyn Zoo NY",
    website: "https://brooklynzoony.com/",
    category: "Classes",
    borough: "Brooklyn",
    neighborhood: "East Williamsburg",
    address: "230 Bogart Street, Brooklyn, NY 11206",
    activityTypes: ["Gymnastics", "Parkour"],
    ageRanges: ["3–5", "6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "After-school"],
    phone: "+13479873228",
    email: "info@brooklynzoony.com",
    shortDescription:
      "Brooklyn Zoo NY offers kids gymnastics and ninja/parkour training at 230 Bogart Street in East Williamsburg.",
    longDescription:
      "Brooklyn Zoo NY lists 230 Bogart Street on its official site and contact page, with phone (347) 987-3228 and email info@brooklynzoony.com. The gym publishes kids gymnastics and ninja-style training programs at that East Williamsburg address.",
  },
  {
    id: "prov-drive-sheets-third-street-music-school-settlement",
    name: "Third Street Music School Settlement",
    website: "https://www.thirdstreet.nyc/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "East Village",
    address: "235 East 11th Street, New York, NY 10003",
    activityTypes: ["Music", "Dance"],
    ageRanges: ["0–2", "3–5", "6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "After-school", "Evening"],
    phone: "+12127773240",
    email: "student.services@thirdstreet.nyc",
    shortDescription:
      "Third Street Music School Settlement offers kids music and dance programs at 235 East 11th Street in the East Village.",
    longDescription:
      "Third Street Music School Settlement (thirdstreet.nyc) lists 235 East 11th Street on its official site, with student services email student.services@thirdstreet.nyc and phone 212-777-3240. Programs include music and arts classes for children and teens.",
  },
  {
    id: "prov-drive-sheets-matchpoint-nyc",
    name: "MatchPoint NYC",
    website: "https://matchpoint.nyc/",
    category: "Classes",
    borough: "Brooklyn",
    neighborhood: "Sheepshead Bay",
    address: "2781 Shell Road, Brooklyn, NY 11223",
    activityTypes: ["Tennis", "Swimming", "Gymnastics"],
    ageRanges: ["3–5", "6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "After-school"],
    phone: "+17187690001",
    email: "findyourgame@matchpointnyc.us",
    shortDescription:
      "MatchPoint NYC offers tennis, swim, and gymnastics programs at 2781 Shell Road in Brooklyn.",
    longDescription:
      "MatchPoint NYC publishes its facility address as 2781 Shell Road, Brooklyn NY 11223 on the official site and contact page. Contact lists phone (718) 769-0001 and email findyourgame@matchpointnyc.us for classes and programs.",
  },
  {
    id: "prov-drive-sheets-discovery-programs",
    name: "Discovery Programs",
    website: "https://www.discoveryprograms.com/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Upper West Side",
    address: "251 West 100th Street, New York, NY 10025",
    activityTypes: ["Gymnastics", "Dance", "Art"],
    ageRanges: ["0–2", "3–5", "6–8", "9–12"],
    dayTimeTags: ["Weekday", "Weekend", "Morning", "Afternoon", "After-school"],
    phone: "+12127498717",
    email: "",
    shortDescription:
      "Discovery Programs offers kids enrichment classes at 251 West 100th Street on the Upper West Side.",
    longDescription:
      "Discovery Programs lists 251 West 100th Street at West End Avenue on its official homepage and contact page, with phone 212-749-8717. The studio publishes kids gymnastics, dance, and arts enrichment programs at that Upper West Side address.",
  },
  {
    id: "prov-drive-sheets-downtown-united-soccer-club",
    name: "Downtown United Soccer Club",
    website: "https://dusc.net/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "West Village",
    address: "527 Hudson Street, New York, NY 10014",
    activityTypes: ["Soccer"],
    ageRanges: ["3–5", "6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "After-school"],
    phone: "",
    email: "info@dusc.net",
    shortDescription:
      "Downtown United Soccer Club runs kids soccer programs from 527 Hudson Street in Manhattan.",
    longDescription:
      "Downtown United Soccer Club lists 527 Hudson St. on its official contact page and publishes email info@dusc.net. DUSC is a Manhattan youth soccer club serving downtown and West Village families.",
  },
  {
    id: "prov-drive-sheets-fastbreak-sports",
    name: "Fastbreak Sports",
    website: "https://fastbreaksports.com/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Upper East Side",
    address: "1629 1st Avenue, New York, NY 10028",
    activityTypes: ["Basketball", "Multi-Sport"],
    ageRanges: ["3–5", "6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "After-school"],
    phone: "+12127243278",
    email: "info@fastbreaksports.com",
    shortDescription:
      "Fastbreak Sports offers kids basketball and multi-sport classes at 1629 1st Avenue on the Upper East Side.",
    longDescription:
      "Fastbreak Sports lists 1629 1st Ave, New York, NY 10028 on its official contact page, with phone 212-724-3278 and email info@fastbreaksports.com. Programs cover kids basketball and related youth sports at the Upper East Side location.",
  },
  {
    id: "prov-drive-sheets-apple-seeds",
    name: "apple seeds — Flatiron",
    website: "https://appleseedsplay.com/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Flatiron",
    address: "10 West 25th Street, New York, NY 10001",
    activityTypes: ["Indoor Play", "Music", "Art"],
    ageRanges: ["0–2", "3–5", "6–8"],
    dayTimeTags: ["Weekday", "Weekend", "Morning", "Afternoon"],
    phone: "+12127927590",
    email: "hello@appleseedsplay.com",
    shortDescription:
      "apple seeds offers kids play and enrichment classes at 10 West 25th Street in Flatiron.",
    longDescription:
      "apple seeds publishes multiple Manhattan studio addresses on its official contact page, including 10 west 25th street. Contact lists phone 212-792-7590 and email hello@appleseedsplay.com for kids play and class programs at the Flatiron location.",
  },
];

async function uploadImage(buf, ext, id) {
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

async function upsert(doc) {
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

async function smoke(id) {
  const res = await fetch(`${BASE}/api/public/providers/${id}`, {
    signal: AbortSignal.timeout(20000),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, name: body && body.name, category: body && body.category, borough: body && body.borough };
}

async function publishOne(opp) {
  const shortDescription = stripUrlsFromPublicCopy(opp.shortDescription);
  const longDescription = stripUrlsFromPublicCopy(opp.longDescription);
  const phone = normalizePhone(opp.phone || "");
  const { buf, ext } = renderGeneratedListingImage(opp);
  const image = await uploadImage(buf, ext, opp.id);

  const contactLinks = [];
  if (phone) contactLinks.push({ type: "phone", label: "Phone", value: phone, url: `tel:${phone}` });
  if (opp.email) contactLinks.push({ type: "email", label: "Email", value: opp.email, url: `mailto:${opp.email}` });

  const doc = {
    id: opp.id,
    name: opp.name,
    website: opp.website,
    category: opp.category,
    borough: opp.borough,
    neighborhood: opp.neighborhood,
    address: opp.address,
    activityTypes: opp.activityTypes,
    ageRanges: opp.ageRanges,
    dayTimeTags: opp.dayTimeTags,
    shortDescription,
    longDescription,
    image,
    email: opp.email || "",
    phone: phone || "",
    contactLinks: contactLinks.length
      ? [
          {
            type: "website",
            label: opp.name.slice(0, 80),
            url: opp.website,
            value: opp.website,
          },
          ...contactLinks,
        ]
      : [
          {
            type: "website",
            label: opp.name.slice(0, 80),
            url: opp.website,
            value: opp.website,
          },
        ],
    price: { evidence: "unknown" },
    pricePerClass: 0,
    badges: ["New"],
    rating: 0,
    reviewCount: 0,
    // The region's owner in the city registry — never a hardcoded city (rule 441).
    city: cityForBorough(opp.borough, loadCityRegions()),
    venueModel: "own_premises",
    sourceUrls: [opp.website],
    bookingEnabled: false,
    fieldVerifications: [
      {
        field: phone ? "phone" : opp.email ? "email" : "website",
        verifiedAt: now,
        sourceUrl: opp.website,
        method: "official_page",
        verifiedBy: "catalog-loop",
      },
    ],
  };

  const up = await upsert(doc);
  const sm = await smoke(opp.id);
  return {
    id: opp.id,
    name: opp.name,
    neighborhood: opp.neighborhood,
    borough: opp.borough,
    activityTypes: opp.activityTypes,
    ingest: up.status,
    ingestOk: up.status === 200,
    ingestBody: JSON.stringify(up.body).slice(0, 400),
    smoke: sm.status,
    public: sm.status === 200,
    publicName: sm.name,
  };
}

async function main() {
  if (!KEY) throw new Error("INGEST_API_KEY missing");
  const results = [];
  for (const opp of OPPORTUNITIES) {
    console.error("publishing", opp.id);
    try {
      const r = await publishOne(opp);
      results.push(r);
      console.error(JSON.stringify(r));
    } catch (e) {
      results.push({ id: opp.id, ok: false, error: String(e && e.message ? e.message : e) });
      console.error("FAIL", opp.id, e);
    }
  }
  const report = { at: now, count: results.length, publicOk: results.filter((r) => r.public).length, results };
  require("fs").writeFileSync(
    require("path").join(__dirname, "data", "manual-publish-ten-drive-2026-09-22.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(results.filter((r) => !r.public).length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
