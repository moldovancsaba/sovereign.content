#!/usr/bin/env node
/**
 * Publish eligible publicTarget listings that jobs left unpublished:
 * clean public copy (no page chrome), snapshot listing art when no photo,
 * upload via /api/ingest/upload, upsert, public smoke.
 */
require("./_productRoot.cjs").loadProductEnv();
const { renderGeneratedListingImage } = require("./lib/listingEnrichmentImage.cjs");
const { stripUrlsFromPublicCopy } = require("./lib/publicCopyHygiene.cjs");
const { normalizePhone } = require("./lib/extractOfficialPage.cjs");
const { loadCityRegions, cityForBorough } = require("./lib/cityOwnership.cjs");

const BASE = process.env.CATALOG_LOOP_BASE || "https://getyourfield.com";
const KEY = process.env.INGEST_API_KEY;
const now = new Date().toISOString();

/** Evidence-backed opportunities ready for lasting-public ingest. */
const OPPORTUNITIES = [
  {
    id: "prov-dance-with-miss-rachel-uws",
    name: "Dance with Miss Rachel — Upper West Side",
    website: "https://www.dancewithmissrachel.com/upper-west-side.html",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Upper West Side",
    address: "529 Columbus Avenue, New York, NY 10024",
    activityTypes: ["Dance", "Ballet"],
    ageRanges: ["0–2", "3–5", "6–8", "9–12"],
    dayTimeTags: ["Weekday", "Weekend", "Morning", "Afternoon"],
    phone: "+16464704551",
    email: "info@dancewithmissrachel.com",
    shortDescription:
      "Dance with Miss Rachel offers ballet, tap, hip hop, and musical-theater classes for toddlers through grade-school kids at 529 Columbus Avenue on the Upper West Side.",
    longDescription:
      "Dance with Miss Rachel teaches kids dance on the Upper West Side at 529 Columbus Avenue, New York, NY 10024. Official contact pages list this Columbus Avenue studio for families. Class offerings include ballet, tap, hip hop, and musical theater for toddlers through grade school.",
  },
  {
    id: "prov-dance-with-miss-rachel-ues",
    name: "Dance with Miss Rachel — Upper East Side",
    website: "https://www.dancewithmissrachel.com/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Upper East Side",
    address: "266 East 78th Street, New York, NY 10075",
    activityTypes: ["Dance", "Ballet"],
    ageRanges: ["0–2", "3–5", "6–8", "9–12"],
    dayTimeTags: ["Weekday", "Weekend", "Morning", "Afternoon"],
    phone: "+16464501347",
    email: "info@dancewithmissrachel.com",
    shortDescription:
      "Dance with Miss Rachel offers kids ballet and creative movement classes at 266 East 78th Street on the Upper East Side.",
    longDescription:
      "Dance with Miss Rachel lists an Upper East Side studio at 266 East 78th Street, New York, NY 10075 on its official contact page. Programs cover toddler through grade-school ballet, tap, hip hop, and musical-theater classes at that address.",
  },
  {
    id: "prov-five-iron-golf-ues",
    name: "Five Iron Golf — Upper East Side Junior League",
    website: "https://fiveirongolf.com/locations/nyc-upper-east-side",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Upper East Side",
    address: "1681 Third Avenue, New York, NY 10128",
    activityTypes: ["Golf"],
    ageRanges: ["6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "After-school"],
    phone: "+18005135153",
    email: "uppereastside@fiveirongolf.com",
    shortDescription:
      "Five Iron Golf runs a beginner-friendly junior golf league for ages 7–13 at 1681 Third Avenue on the Upper East Side.",
    longDescription:
      "Five Iron Golf’s Upper East Side location at 1681 Third Avenue, New York, NY 10128 publishes a junior league for ages 7–13 with weekly practices and Saturday match play. The official location page states the address and describes the league as fun, structured, and beginner-friendly.",
  },
  {
    id: "prov-loftlinks-little-champs",
    name: "LoftLinks — Little Champs",
    website: "https://loftlinks.com/loftlinks-swing-academy-lilchamps/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Upper East Side",
    address: "177 East 87th Street, Suite 200, New York, NY 10128",
    activityTypes: ["Golf"],
    ageRanges: ["6–8", "9–12"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "After-school"],
    phone: "+16466092642",
    email: "info@loftlinks.com",
    shortDescription:
      "LoftLinks offers Little Champs golf lessons for ages 6–9 at 177 East 87th Street on the Upper East Side.",
    longDescription:
      "LoftLinks publishes Little Champs golf lessons for kids ages 6–9 at 177 East 87th Street, Suite 200, New York, NY 10128. The official Little Champs page describes age-appropriate instruction; the site contact block states the Upper East Side studio address.",
  },
  {
    id: "prov-usa-shaolin-temple-allen-st",
    name: "USA Shaolin Temple — Kung Fu for Kids",
    website: "https://usashaolintemple.com/kung-fu-for-kids/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Lower East Side",
    address: "102 Allen Street, New York, NY 10002",
    activityTypes: ["Martial Arts"],
    ageRanges: ["3–5", "6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "After-school"],
    phone: "",
    email: "",
    shortDescription:
      "USA Shaolin Temple offers daily kung fu classes for kids and youth at 102 Allen Street on the Lower East Side.",
    longDescription:
      "USA Shaolin Temple publishes kung fu for kids at 102 Allen Street, New York, NY 10002. The official kids page states daily youth classes at the NYC temple plus school field-trip workshops covering Shaolin martial arts basics.",
  },
  {
    id: "prov-rod-rodgers-dance-youth",
    name: "Rod Rodgers Dance Company — Youth Program",
    website: "https://www.rodrodgersdance.org/copy-of-youth-program",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "East Village",
    address: "62 East 4th Street, New York, NY 10003",
    activityTypes: ["Dance"],
    ageRanges: ["6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "Evening"],
    phone: "",
    email: "",
    shortDescription:
      "Rod Rodgers Dance Company runs a youth dance program with classes and workshops at 62 East 4th Street in the East Village.",
    longDescription:
      "Rod Rodgers Dance Company publishes a youth program at 62 East 4th Street, New York, NY 10003. The official youth program page describes dance classes, workshops, and performances for young students, with studio contact and hours listed on the same site.",
  },
];

async function uploadImage(buf, ext, id) {
  const form = new FormData();
  form.append("file", new Blob([buf], { type: `image/${ext === "jpg" ? "jpeg" : ext}` }), `${id}.${ext}`);
  form.append("filename", `${id}.${ext}`);
  const res = await fetch(`${BASE}/api/ingest/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) {
    throw new Error(`upload ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  }
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
  return { status: res.status, name: body && body.name, category: body && body.category };
}

async function publishOne(opp) {
  const shortDescription = stripUrlsFromPublicCopy(opp.shortDescription);
  const longDescription = stripUrlsFromPublicCopy(opp.longDescription);
  if (!shortDescription || !longDescription) {
    throw new Error("empty public copy after strip");
  }
  const phone = normalizePhone(opp.phone || "");
  const { buf, ext } = renderGeneratedListingImage(opp);
  const image = await uploadImage(buf, ext, opp.id);

  const contactLinks = [
    {
      type: "website",
      label: opp.name.slice(0, 80),
      url: opp.website,
      value: opp.website,
    },
  ];
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
    contactLinks,
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
        field: phone ? "phone" : "website",
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
    neighborhood: opp.neighborhood,
    imageHost: String(image).includes("r2.dev") ? "r2" : String(image).includes("ibb.co") ? "imgbb" : "other",
    ingest: up.status,
    ingestOk: up.status === 200 && up.body && up.body.ok !== false,
    ingestBody: JSON.stringify(up.body).slice(0, 280),
    smoke: sm.status,
    public: sm.status === 200,
  };
}

async function main() {
  if (!KEY) throw new Error("INGEST_API_KEY missing");
  const results = [];
  for (const opp of OPPORTUNITIES) {
    process.stderr.write(`publishing ${opp.id}\n`);
    try {
      const r = await publishOne(opp);
      results.push(r);
      process.stderr.write(`${JSON.stringify(r)}\n`);
    } catch (e) {
      const row = { id: opp.id, ok: false, error: String(e && e.message ? e.message : e) };
      results.push(row);
      process.stderr.write(`FAIL ${JSON.stringify(row)}\n`);
    }
  }
  console.log(JSON.stringify({ at: now, results }, null, 2));
  process.exit(results.some((r) => !r.public) ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
