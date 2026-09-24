#!/usr/bin/env node
/**
 * Manual one-shot: publish five researched publicTarget opportunities
 * (evidence from official pages only; generated listing art when no photo).
 */
require("./_productRoot.cjs").loadProductEnv();
const { renderGeneratedListingImage } = require("./lib/listingEnrichmentImage.cjs");
const { stripUrlsFromPublicCopy } = require("./lib/publicCopyHygiene.cjs");
const { normalizePhone } = require("./lib/extractOfficialPage.cjs");
const { loadCityRegions, cityForBorough } = require("./lib/cityOwnership.cjs");

const BASE = process.env.CATALOG_LOOP_BASE || "https://getyourfield.com";
const KEY = process.env.INGEST_API_KEY;
const now = new Date().toISOString();

/** Five new opportunities researched 2026-09-21 against scarcity thin cells. */
const OPPORTUNITIES = [
  {
    id: "prov-manhattan-shaolin-chinatown",
    name: "Manhattan Shaolin",
    website: "https://www.shaolinnewyork.com/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Chinatown",
    address: "118-122 Baxter Street, Suite 202, New York, NY 10013",
    activityTypes: ["Martial Arts"],
    ageRanges: ["6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "Evening"],
    phone: "+16464814595",
    email: "info@shaolinnewyork.com",
    shortDescription:
      "Chinatown Shaolin kungfu and qigong school with small kids, teen, and adult classes near Canal Street.",
    longDescription:
      "Manhattan Shaolin teaches traditional Chinese martial arts (kungfu and qigong) for children ages 6 and up, teens, and adults at 118-122 Baxter Street, Suite 202, between Hester and Canal in Chinatown. The school is run by a disciple of Master Guolin from Shaolin Temple Overseas Headquarters, keeps class sizes small, and does not require contracts. Families from SoHo, the Lower East Side, East Village, and West Village are a short trip away.",
    trialPolicy: null,
    price: { evidence: "unknown" },
    pricePerClass: 0,
    sessions: [
      {
        id: "sess-kids-kungfu",
        title: "Children's kungfu (ages 6+)",
        startDate: "2026-09-01",
        sourceText: "Childrens classes are for ages 6 and up. We teach qigong and kungfu to children, teens and adults.",
      },
    ],
  },
  {
    id: "prov-aims-martial-arts-chinatown",
    name: "AIMS Martial Arts",
    website: "https://aimsmartialarts.com/",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Chinatown",
    address: "34A Monroe Street, New York, NY 10002",
    activityTypes: ["Martial Arts", "Kickboxing", "Boxing"],
    ageRanges: ["6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "Evening", "After-school"],
    phone: "+19296727020",
    email: "info@aimsmartialarts.com",
    shortDescription:
      "Two Bridges / Chinatown Jeet Kune Do school with Juniors (6–9) and Youth (10–14) programs, plus kickboxing and boxing.",
    longDescription:
      "AIMS Martial Arts is a Jeet Kune Do school at 34A Monroe Street in the Two Bridges area of Chinatown. Youth programs include AIMS Juniors for ages 6–9 and AIMS Youth for ages 10–14, alongside adult kickboxing, boxing, grappling, and Filipino martial arts. Membership plans have no contracts and cancel anytime; a $100 registration fee applies at sign-up. Contact (929) 672-7020 or info@aimsmartialarts.com.",
    trialPolicy: null,
    price: {
      evidence: "stated",
      amount: 100,
      currency: "USD",
      unit: null,
      sourceText: "$100 registration fee + tax due when you sign up. Membership plans with no contracts. Cancel anytime.",
    },
    pricePerClass: 0,
    sessions: [
      {
        id: "sess-aims-juniors",
        title: "AIMS Juniors (ages 6–9)",
        startDate: "2026-09-01",
        sourceText: "AIMS Juniors (Ages 6-9). The AIMS Juniors Program builds martial skill and resilience through Jeet Kune Do. Three times per week.",
      },
      {
        id: "sess-aims-youth",
        title: "AIMS Youth (ages 10–14)",
        startDate: "2026-09-01",
        sourceText: "AIMS Youth (Ages 10-14). The AIMS Youth Program builds physical skill and character through Jeet Kune Do fundamentals.",
      },
    ],
  },
  {
    id: "prov-fort-greene-falcons-soccer",
    name: "Fort Greene Falcons Soccer Club",
    website: "https://fgfsoccer.com/",
    category: "Classes",
    borough: "Brooklyn",
    neighborhood: "Fort Greene",
    address: "197 South Oxford Street, Brooklyn, NY 11217",
    activityTypes: ["Soccer"],
    ageRanges: ["0–2", "3–5", "6–8", "9–12"],
    dayTimeTags: ["Weekend", "Morning", "Afternoon"],
    phone: "",
    email: "nicole@fgfsoccer.com",
    shortDescription:
      "Year-round Fort Greene soccer classes for ages 2–9 at South Oxford Park, emphasizing fundamentals and sportsmanship.",
    longDescription:
      "Fort Greene Falcons Soccer Club is a year-round program for boys and girls ages 2–4 and 5–9 based in Fort Greene, Brooklyn. Classes teach passing, dribbling, and kicking with teamwork and sportsmanship. Fall sessions run 10 weeks at South Oxford Park (197 South Oxford Street) on Saturdays: ages 5–9 9:00–10:00 AM; ages 2–4 10:15–11:00 AM and 11:15 AM–12:00 PM; ages 4–6 12:15–1:15 PM. Fall tuition is $375 for the 10-week session. Email nicole@fgfsoccer.com to register.",
    trialPolicy: null,
    price: {
      evidence: "stated",
      amount: 375,
      currency: "USD",
      unit: "session",
      sourceText: "Fall classes are for 10 weeks. Classes begin in September and are $375. Our classes will be held at South Oxford Park in Brooklyn.",
    },
    pricePerClass: 0,
    sessions: [
      {
        id: "sess-fgf-fall-5-9",
        title: "Fall soccer ages 5–9",
        startDate: "2026-09-12",
        endDate: "2026-11-14",
        sourceText: "Saturday 5-9 year old classes from 9:00 am - 10:00 am. Fall classes Sept 12 - Nov 14. $375 for 10 weeks at South Oxford Park.",
      },
      {
        id: "sess-fgf-fall-2-4",
        title: "Fall soccer ages 2–4",
        startDate: "2026-09-12",
        endDate: "2026-11-14",
        sourceText: "Saturday 2-4 year old classes from 10:15 am - 11:00 am and 11:15 am - 12:00 pm at South Oxford Park.",
      },
    ],
  },
  {
    id: "prov-tim-morehouse-fencing-midtown-east",
    name: "Tim Morehouse Fencing Club Midtown East",
    website: "https://www.timmorehousefencing.com/nyc-east-side-49th-2nd-ave",
    category: "Classes",
    borough: "Manhattan",
    neighborhood: "Midtown",
    address: "235 East 49th Street, New York, NY 10017",
    activityTypes: ["Fencing"],
    ageRanges: ["3–5", "6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "Evening", "After-school"],
    phone: "+16466248344",
    email: "info@timmorehousefencing.com",
    shortDescription:
      "Olympian-led fencing classes and camps at 49th & 2nd in Midtown East for ages 4 through teens.",
    longDescription:
      "Tim Morehouse Fencing Club Midtown East trains saber, epee, and foil at 235 East 49th Street near Grand Central. Youth programs include Squires (ages 4–6), Musketeers and Youth Champions (ages 6–12), Teen Program (13+), and a Starter Program for brand-new fencers ages 6–18 ($499 for 4 group classes + 4 pull-out lessons, equipment included). Musketeers meet weekdays 4:20–6:00 PM and Sundays 1:20–3:00 PM. Call (646) 624-8344 or email info@timmorehousefencing.com.",
    trialPolicy: {
      trialAvailable: true,
      trialIsFree: false,
      sourceText: "Most students begin with our $40 one-on-one trial lesson. We welcome complete beginners ages 4 through adult and provide all fencing equipment for the lesson.",
    },
    price: {
      evidence: "stated",
      amount: 499,
      currency: "USD",
      unit: null,
      sourceText: "Starter Program $499 (4 group classes and 4 pull-out lessons, equipment included, ages 6–18). Musketeers and Youth Champions from $599 per month.",
      variants: [
        { label: "Starter package", amount: 499 },
        { label: "Musketeers / Youth monthly", amount: 599 },
      ],
    },
    pricePerClass: 0,
    sessions: [
      {
        id: "sess-tmfc-musketeers",
        title: "Musketeers (ages 6–8)",
        startDate: "2026-09-01",
        sourceText: "Musketeers 4:20–6:00 PM weekdays; Sundays 1:20–3:00 PM. September 2026 – June 2027 at 235 East 49th Street.",
      },
      {
        id: "sess-tmfc-youth",
        title: "Youth Champions (ages 9–12)",
        startDate: "2026-09-01",
        sourceText: "Youth Champions 4:20–6:00 PM weekdays; Sundays 1:20–3:00 PM at Midtown East studio.",
      },
    ],
  },
  {
    id: "prov-champions-martial-arts-greenpoint",
    name: "Champions Martial Arts Greenpoint",
    website: "https://www.championstkd.com/location/greenpoint",
    category: "Classes",
    borough: "Brooklyn",
    neighborhood: "Greenpoint",
    address: "667 Manhattan Avenue, Brooklyn, NY 11222",
    activityTypes: ["Taekwondo", "Martial Arts"],
    ageRanges: ["3–5", "6–8", "9–12", "Teens"],
    dayTimeTags: ["Weekday", "Weekend", "Afternoon", "Evening", "After-school"],
    phone: "+17188854243",
    email: "greenpoint@championstkd.com",
    shortDescription:
      "Greenpoint Taekwondo studio with Little Tigers, kids martial arts, after-school, and summer camp programs.",
    longDescription:
      "Champions Martial Arts Greenpoint teaches Taekwondo and kids martial arts at 667 Manhattan Avenue, Brooklyn, NY 11222. Programs include Little Tigers for young beginners, Kids Martial Arts, Teen & Adult Taekwondo, after-school martial arts, competition team, and summer camp. The studio invites families to try a free class. Call (718) 885-4243 or email greenpoint@championstkd.com.",
    trialPolicy: {
      trialAvailable: true,
      trialIsFree: true,
      sourceText: "Try a free class and experience the benefits firsthand. Just contact us today to schedule your first session.",
    },
    price: { evidence: "unknown" },
    pricePerClass: 0,
    sessions: [
      {
        id: "sess-cma-little-tigers",
        title: "Little Tigers",
        startDate: "2026-09-01",
        sourceText: "Our Little Tigers program builds focus, discipline, and confidence through fun, high-energy martial arts training.",
      },
      {
        id: "sess-cma-kids",
        title: "Kids Martial Arts",
        startDate: "2026-09-01",
        sourceText: "Our Kids Martial Arts program helps children build focus, confidence, and discipline in a fun, structured environment.",
      },
    ],
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
  return { status: res.status, name: body && body.name, category: body && body.category };
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
    price: opp.price,
    pricePerClass: opp.pricePerClass,
    trialPolicy: opp.trialPolicy || undefined,
    sessions: opp.sessions,
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
    ingest: up.status,
    ingestOk: up.status === 200,
    ingestBody: JSON.stringify(up.body).slice(0, 300),
    smoke: sm.status,
    public: sm.status === 200,
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
  console.log(JSON.stringify({ at: now, results }, null, 2));
  const failed = results.filter((r) => !r.public);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
