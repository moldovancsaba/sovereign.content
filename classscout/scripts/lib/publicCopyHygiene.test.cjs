const assert = require("assert");
const {
  stripUrlsFromPublicCopy,
  publicCopyHasUnsafeChrome,
  TRANSLATE_CONSENT_RE,
  MARKETPLACE_HUB_COPY_RE,
  HERO_CTA_COPY_RE,
  STORE_POLICY_CHATBOT_RE,
} = require("./publicCopyHygiene.cjs");

const consent =
  "We use a third-party service to translate the website content that may collect data about your activity. Please review the details in the privacy policy and accept the service to view the translations.";

assert.ok(TRANSLATE_CONSENT_RE.test(consent));
assert.ok(publicCopyHasUnsafeChrome(consent));
assert.equal(stripUrlsFromPublicCopy(consent), "");

const mixed =
  "Brooklyn USA Basketball. We use a third-party service to translate the website content that may collect data about your activity — Brownsville, Brooklyn.";
const cleaned = stripUrlsFromPublicCopy(mixed);
assert.ok(!/third-party service to translate/i.test(cleaned));
assert.ok(cleaned.includes("Brooklyn USA Basketball") || cleaned.includes("Brownsville") || cleaned.length === 0);

assert.equal(publicCopyHasUnsafeChrome("https://example.com/about"), true);
assert.equal(publicCopyHasUnsafeChrome("A real youth basketball program in Brooklyn."), false);

const hub =
  "Discover kids classes, camps, and events across all five NYC boroughs — updated daily from parks, studios, and venues citywide.";
assert.ok(MARKETPLACE_HUB_COPY_RE.test(hub));
assert.ok(publicCopyHasUnsafeChrome(hub));
assert.equal(stripUrlsFromPublicCopy(hub), "");
assert.ok(
  !/across all five/i.test(
    stripUrlsFromPublicCopy(
      "Addabbo Playground. Discover kids classes, camps, and events across all five NYC boroughs — updated daily from parks, studios, and venues citywide — Manhattan."
    )
  )
);

const hero =
  "Stretch. Jump. Swing. Climb. Tumble. Flip. Bounce!!! Register for Classes View Class Schedules";
assert.ok(HERO_CTA_COPY_RE.test(hero));
assert.ok(publicCopyHasUnsafeChrome(hero));
assert.ok(!/Register for Classes/i.test(stripUrlsFromPublicCopy(hero)));

const chatbot =
  "Used to get facts about the stores policies, products, or services.\\nSome examples of questions you can ask are:\\n - What is your return policy?\\n - What is your shipping policy?\\n - What is your phone number?\\n - What are your hours of operation?\\";
assert.ok(STORE_POLICY_CHATBOT_RE.test(chatbot));
assert.ok(publicCopyHasUnsafeChrome(chatbot));
assert.ok(!/Used to get facts/i.test(stripUrlsFromPublicCopy(chatbot)));
assert.ok(
  publicCopyHasUnsafeChrome(
    "Additional information about the request such as user demographics, mood, location, or other relevant details."
  )
);

console.log("publicCopyHygiene.cjs ok");
