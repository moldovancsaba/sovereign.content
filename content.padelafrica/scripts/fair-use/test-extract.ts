#!/usr/bin/env npx tsx
/**
 * Offline unit checks for fair-use extract / lead quality / seed builder.
 *   npx tsx scripts/fair-use/test-extract.ts
 */
import { extractGenericFacts, harvestPadelClubLinks } from "./lib/extract.ts";
import { isAcceptableLead, isPromisingDetailUrl } from "./lib/leadQuality.ts";
import { buildCandidate } from "./lib/seedBuilder.ts";
import type { SourceMeta } from "./lib/common.ts";

const SAMPLE = `
<html><head><title>Club Atlas Padel | Padel Lands</title>
<meta property="og:title" content="Club Atlas Padel" />
</head><body>
<h1>Club Atlas Padel</h1>
<p>Address: 12 Avenue Hassan II, Casablanca</p>
<p>Morocco padel club with outdoor courts.</p>
<a href="https://www.clubatlaspadel.ma/">Official site</a>
<a href="https://padellands.com/en/countries/morocco/other">Other clubs</a>
<a href="https://facebook.com/clubatlas">FB</a>
</body></html>
`;

const source: SourceMeta = {
  id: "padellands",
  name: "Padel Lands",
  kind: "directory",
  base: "https://padellands.com",
  discoveryPages: ["https://padellands.com/en/"],
};

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", msg);
  } else {
    console.log("ok", msg);
  }
}

const facts = extractGenericFacts(SAMPLE, "https://padellands.com/en/clubs/club-atlas", {
  sourceHost: "padellands.com",
});
assert(facts.name.includes("Club Atlas"), `name=${facts.name}`);
assert(facts.website.includes("clubatlaspadel.ma"), `website=${facts.website}`);
assert(!!facts.cityHint && /casablanca/i.test(facts.cityHint), `city=${facts.cityHint}`);
assert(!!facts.countryHint && /morocco/i.test(facts.countryHint), `country=${facts.countryHint}`);

const lead = isAcceptableLead(facts);
assert(lead.ok, "lead acceptable");

const hub = isAcceptableLead({
  name: "Directory",
  website: "",
  citationUrl: "https://padellands.com/en/",
});
assert(!hub.ok, "hub rejected");

const guide = isAcceptableLead({
  name: "What's is Padel Lands?",
  website: "",
  citationUrl: "https://padellands.com/en/whats-is-padel-lands/",
});
assert(!guide.ok, "guide rejected");

const { candidate, rejectReason } = buildCandidate(facts, source);
assert(!!candidate && !rejectReason, "candidate built");
assert(candidate?.status === "needs_verify", "needs_verify");
assert(candidate?.researchSources.includes(facts.citationUrl), "citation recorded");

const links = harvestPadelClubLinks(
  `<a href="/en/clubs/foo-padel">x</a><a href="https://padellands.com/en/countries/kenya/">k</a>`,
  "https://padellands.com",
  "padellands.com",
);
assert(links.some((u) => /clubs\/foo-padel/i.test(u)), `harvested=${JSON.stringify(links)}`);

assert(
  isPromisingDetailUrl("https://actu-padel.com/directory/padel-club/padel-wifaq-rabat/"),
  "actu club url promising",
);
assert(
  !isPromisingDetailUrl("https://padellands.com/en/pistas-de-padel/espana/andalusia/"),
  "spain courts not promising",
);
assert(
  isPromisingDetailUrl("https://padellands.com/club-el-estudiante/"),
  "padellands club slug promising",
);

if (failed) {
  console.log(JSON.stringify({ ok: false, failed }));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, failed: 0 }));
