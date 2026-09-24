const assert = require("assert");
const {
  isWeakListingCopy,
  extractAboutEvidence,
  composeListingCopy,
} = require("./composeListingCopy.cjs");

assert.equal(
  isWeakListingCopy(
    "Bend + Bloom Kids Yoga offers kids programs in Brooklyn (Park Slope).",
    "Bend + Bloom Kids Yoga is listed on ClassScout Provider Research (Drive) as a family program.\n\nListed services include: Yoga, kids yoga."
  ),
  true
);

assert.equal(
  isWeakListingCopy(
    "Brooklyn yoga studio with kids and prenatal classes among weekly sessions.",
    "A Brooklyn-based studio offering over 65 yoga classes per week, including prenatal and kids classes."
  ),
  false
);

const html = `
<meta property="og:description" content="A Brooklyn-based studio offering over 65 inspiring yoga classes per week, including Prenatal + Kids classes. Retreats to Cuba and Mexico, as well Workshops and Teacher Trainings."/>
<meta name="description" content="A Brooklyn-based studio offering over 65 inspiring yoga classes per week, including Prenatal + Kids classes." />
`;
const about = extractAboutEvidence(html);
assert.ok(about.aboutText.includes("Brooklyn-based studio"));
assert.equal(about.source, "og:description");

const composed = composeListingCopy({
  name: "Bend + Bloom Kids Yoga",
  borough: "Brooklyn",
  neighborhood: "Park Slope",
  address: "198 5th ave Brooklyn 11217",
  activityTypes: ["Yoga"],
  aboutText: about.aboutText,
  aboutSource: about.source,
});
assert.ok(composed);
assert.equal(composed.quality, "page_evidence");
assert.ok(composed.shortDescription.length >= 40);
assert.ok(composed.longDescription.includes("Brooklyn-based studio"));
assert.ok(!/listed on classscout/i.test(composed.longDescription));
assert.ok(!/offers kids programs in/i.test(composed.shortDescription));
assert.ok(!/</.test(composed.shortDescription));
assert.ok(!/</.test(composed.longDescription));
// Brand already in about → do not force "Name: lowercase…"
assert.ok(!/^Bend \+ Bloom Kids Yoga:/i.test(composed.shortDescription));

const dirtyHtml = composeListingCopy({
  name: "Bend + Bloom Kids Yoga",
  borough: "Brooklyn",
  neighborhood: "Park Slope",
  address: "198 5th ave Brooklyn 11217",
  activityTypes: ["Yoga"],
  aboutText:
    "<p>Bend &amp; Bloom is a serene studio offering over 50 inspiring yoga classes per week. Kids indulge in yoga fun while parents enjoy their own practice.</p>",
});
assert.ok(dirtyHtml);
assert.equal(dirtyHtml.quality, "page_evidence");
assert.ok(!/</.test(dirtyHtml.shortDescription));
assert.ok(!/</.test(dirtyHtml.longDescription));
assert.ok(!/&amp;|&lt;|&gt;|&#/.test(dirtyHtml.shortDescription + dirtyHtml.longDescription));
assert.ok(/Bend & Bloom|Bend \+ Bloom/i.test(dirtyHtml.longDescription));

assert.equal(
  isWeakListingCopy(
    'Bend + Bloom Kids Yoga: <p>Bend & Bloom is a serene studio offering over 50 inspiring yoga classes per week — Park Slope, Brooklyn.',
    "<p>Bend & Bloom is a serene studio offering over 50 inspiring yoga classes per week.</p>\n\nBend + Bloom Kids Yoga is listed for families in Park Slope, Brooklyn."
  ),
  true
);

assert.equal(
  isWeakListingCopy(
    "Contact Us GET In Touch Whether you’re looking for a trusted Brooklyn preschool, daycare, infant and toddler care program.",
    "Contact Us GET In Touch Whether you’re looking for a trusted Brooklyn preschool, daycare, infant and toddler care program."
  ),
  true
);

const cleanedContact = composeListingCopy({
  name: "Brooklyn Preschool of Science",
  borough: "Brooklyn",
  neighborhood: "Park Slope",
  address: "65 Park Place",
  activityTypes: ["STEM"],
  aboutText:
    "Contact Us GET In Touch Whether you’re looking for a trusted Brooklyn preschool, daycare, infant and toddler care program, or an innovative early childhood education center, the team at Brooklyn Preschool of Science is here to help.",
});
assert.ok(cleanedContact);
assert.equal(cleanedContact.quality, "page_evidence");
assert.ok(!/^contact us/i.test(cleanedContact.shortDescription));
assert.ok(/trusted Brooklyn preschool/i.test(cleanedContact.longDescription));

const fallback = composeListingCopy({
  name: "Dance Atlantic",
  borough: "Brooklyn",
  neighborhood: "Boerum Hill",
  activityTypes: ["Dance"],
});
assert.ok(fallback);
assert.equal(fallback.quality, "place_fallback");
assert.ok(/Dance/i.test(fallback.shortDescription));

// Cynthia King case: about is good, but never append Address-on-record / JSON scrap.
const ck = composeListingCopy({
  name: "Cynthia King Dance Studio",
  borough: "Brooklyn",
  neighborhood: "Flatbush",
  address: '327 East 5th Street Brooklyn, NY, 11218 United States","email',
  activityTypes: ["Dance"],
  aboutText:
    "Cynthia King Dance Studio is committed to providing a fertile training ground for dancers of all ages and abilities, embracing traditional to emerging styles and inspiring dancers to strive for both technical excellence and meaningful artistry.",
});
assert.ok(ck);
assert.equal(ck.quality, "page_evidence");
assert.ok(!/address on record/i.test(ck.longDescription));
assert.ok(!/serves families in/i.test(ck.longDescription));
assert.ok(!/email/i.test(ck.longDescription));
assert.ok(!/"/.test(ck.longDescription));
assert.ok(/fertile training ground/i.test(ck.longDescription));

assert.equal(
  isWeakListingCopy(
    ck.shortDescription,
    'Cynthia King Dance Studio is committed to providing a fertile training ground.\n\nCynthia King Dance Studio serves families in Flatbush, Brooklyn.\n\nAddress on record: 327 East 5th Street Brooklyn, NY, 11218 United States","email.'
  ),
  true
);

assert.equal(
  isWeakListingCopy(
    "Contact Darfight Martial Arts, Brooklyn, New York.",
    "Contact Darfight Martial Arts, Brooklyn, New York. We look forward to answering any of your questions regarding {martial_arts_styles}."
  ),
  true
);

const darfight = composeListingCopy({
  name: "Darfight Martial Arts Judo Kids Program",
  borough: "Brooklyn",
  neighborhood: "Brighton Beach",
  address: "130 Brighton Beach Ave 2nd Floor, Brooklyn, NY, 11235",
  activityTypes: ["Judo", "Martial Arts"],
  aboutText:
    "Learn Judo and Brazilian Jiu Jitsu in Brooklyn. Kids classes welcome beginners at the Brighton Beach studio.",
});
assert.ok(darfight);
assert.ok(!/\{[a-z_]+\}/i.test(darfight.shortDescription + darfight.longDescription));
assert.ok(/Judo|Brazilian Jiu Jitsu/i.test(darfight.longDescription));

// "cookie decorating" must not be treated as consent-banner chrome.
const cookieParty = extractAboutEvidence(
  `<meta property="og:description" content="Cutest Cookies is the perfect venue to host your child's next birthday party! Your child and their guests will make their own pizza and decorate themed cookies."/>`
);
assert.ok(cookieParty.aboutText.includes("birthday party"));
assert.ok(/cookie/i.test(cookieParty.aboutText));

// Google Website Translator consent chrome must never ship as About.
assert.equal(
  isWeakListingCopy(
    "Brooklyn USA Basketball. We use a third-party service to translate the website content that may collect data about your activity — Brownsville, Brooklyn.",
    "We use a third-party service to translate the website content that may collect data about your activity. Please review the details in the privacy policy and accept the service to view the translations."
  ),
  true
);

const translateHtml = `
<meta name="description" content="We use a third-party service to translate the website content that may collect data about your activity. Please review the details in the privacy policy and accept the service to view the translations." />
<meta property="og:description" content="Join us at Brooklyn USA Basketball! We nurture young talent through leagues, teams, events, and clinics." />
`;
const translateAbout = extractAboutEvidence(translateHtml);
assert.ok(translateAbout.aboutText.includes("nurture young talent"));
assert.ok(!/third-party service to translate/i.test(translateAbout.aboutText));

assert.equal(
  isWeakListingCopy(
    "Addabbo Playground. Discover kids classes, camps, and events across all five NYC boroughs — updated daily from parks, studios, and venues citywide — Manhattan.",
    "Discover kids classes, camps, and events across all five NYC boroughs — updated daily from parks, studios, and venues citywide."
  ),
  true
);

const venueMeta = extractAboutEvidence(
  `<meta property="og:description" content="Kids classes and events at Addabbo Playground, Queens. 5 upcoming."/>`
);
assert.ok(venueMeta.aboutText.includes("Addabbo Playground"));
assert.ok(!/across all five/i.test(venueMeta.aboutText));


assert.equal(
  isWeakListingCopy(
    "Bounce Gymnastics Inc.. Stretch. Jump. Swing. Climb. Tumble. Flip. Bounce!!! Register for Classes View Class Schedules — Manhattan.",
    "Stretch. Jump. Swing. Climb. Tumble. Flip. Bounce!!! Register for Classes View Class Schedules"
  ),
  true
);
const bounceHtml = `
<meta property="og:description" content="Stretch. Jump. Swing. Climb. Tumble. Flip. Bounce!!! Register for Classes View Class Schedules"/>
<p>Welcome to Bounce Gymnastics! Bounce Gymnastics offers a variety of programs to suit your child's needs. From infant developmental programs to high school cheerleading, Bounce Gymnastics provides it all.</p>
`;
const bounceAbout = extractAboutEvidence(bounceHtml);
assert.ok(bounceAbout.aboutText.includes("offers a variety of programs"));
assert.ok(!/Register for Classes/i.test(bounceAbout.aboutText));

// Shopify storefront chatbot FAQ chrome in JSON-LD must never win About.
assert.equal(
  isWeakListingCopy(
    "Genius Gems NYC. Used to get facts about the stores policies, products, or services.\\nSome examples of questions you can ask are:\\n - What is your return policy? — Chelsea, Manhattan.",
    "Used to get facts about the stores policies, products, or services.\\nSome examples of questions you can ask are:\\n - What is your return policy?\\n - What is your shipping policy?\\n - What is your phone number?\\n - What are your hours of operation?\\"
  ),
  true
);
const chatbotHtml = `
<meta property="og:description" content="Genius Gems Chelsea NYC Home Page"/>
<script type="application/ld+json">{"description":"Used to get facts about the stores policies, products, or services. Some examples of questions you can ask are: - What is your return policy?"}</script>
<script type="application/ld+json">{"description":"Additional information about the request such as user demographics, mood, location, or other relevant details that could help in tailoring the response appropriately."}</script>
<h2>A Magnetic Experience in Chelsea, Manhattan</h2>
<title>Indoor STEM Play Space in Chelsea, NYC | Genius Gems</title>
`;
const chatbotAbout = extractAboutEvidence(chatbotHtml);
assert.ok(/Magnetic Experience|STEM Play Space/i.test(chatbotAbout.aboutText), chatbotAbout.aboutText);
assert.ok(!/Used to get facts|return policy|user demographics/i.test(chatbotAbout.aboutText));

console.log("composeListingCopy.test.cjs: ok");

