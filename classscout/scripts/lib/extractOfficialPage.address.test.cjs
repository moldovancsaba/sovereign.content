/**
 * Street-address clean / pick / JSON-LD extract — Find gap close (2026-09-22).
 */
const assert = require("assert");
const {
  cleanStreetAddress,
  hasStreetAddress,
  pickStreetAddress,
  extractFromHtml,
} = require("./extractOfficialPage.cjs");

assert.equal(cleanStreetAddress('1023 Church Avenue"}'), "1023 Church Avenue");
assert.equal(cleanStreetAddress('1521 York Ave."'), "1521 York Ave.");
assert.ok(hasStreetAddress("244 East 84th Street"));
assert.ok(hasStreetAddress("273 Bowery"));
assert.ok(hasStreetAddress("262 W. 38th Street"));
assert.equal(hasStreetAddress("2 year old players (24-36 months) is a grea"), false);
assert.equal(hasStreetAddress("45 AM: Students will enjoy an energetic"), false);
assert.equal(hasStreetAddress("149 The Lion King on Broadway"), false);
assert.equal(hasStreetAddress("2026 The New 42nd Street"), false);
assert.ok(hasStreetAddress("1500 Broadway"));
assert.ok(hasStreetAddress("209 W 42nd Street, New York, NY, 10036"));
assert.ok(hasStreetAddress("100 Park Place"));
assert.ok(hasStreetAddress("55 Pl. Brooklyn"));
assert.equal(hasStreetAddress('3 grid-md-col-6 h-100 d-flex pl-md-2 border-left-md-1">'), false);
assert.equal(hasStreetAddress("3 pl-md-2 flex col-6"), false);
assert.equal(hasStreetAddress("12 pl-2 border-1"), false);
assert.ok(hasStreetAddress("55 Pl. Brooklyn")); // Pl. with period is a real abbreviation
assert.equal(
  cleanStreetAddress("66 Greenpoint Avenue&lt;/p&gt;&lt;p&gt;Brooklyn, NY 11222&lt;/p&gt;"),
  "66 Greenpoint Avenue Brooklyn, NY 11222"
);
assert.ok(
  hasStreetAddress(cleanStreetAddress("66 Greenpoint Avenue&lt;/p&gt;&lt;p&gt;Brooklyn, NY 11222"))
);
assert.equal(hasStreetAddress("66 Greenpoint Avenue&lt;/p&gt;"), false); // residual entities before clean
assert.equal(
  hasStreetAddress('327 East 5th Street Brooklyn, NY, 11218 United States","email'),
  false
);
assert.equal(
  cleanStreetAddress('327 East 5th Street Brooklyn, NY, 11218 United States","email'),
  "327 East 5th Street Brooklyn, NY, 11218 United States"
);
assert.ok(
  require("./extractOfficialPage.cjs").isUsableStreetLine(
    cleanStreetAddress('327 East 5th Street Brooklyn, NY, 11218 United States","email')
  )
);

// Expanded NYC street vocabulary + Queens hyphenates + venue-prefix peel.
assert.ok(hasStreetAddress("1040 Grand Concourse, Bronx, NY 10456"));
assert.ok(hasStreetAddress("1000 Richmond Terrace, Staten Island, NY 10301"));
assert.ok(hasStreetAddress("27 Brienna Ct, Staten Island, NY 10309"));
assert.ok(hasStreetAddress("24 Cobek Court, Brooklyn, NY 11223"));
assert.ok(hasStreetAddress("25 Park Pl, New York, NY 10007"));
assert.ok(hasStreetAddress("16 Madison Square West, 12th Floor, New York, NY 10010"));
assert.ok(hasStreetAddress("445 Albee Square W Suite 4-500, Brooklyn, NY 11201"));
assert.ok(hasStreetAddress("67-09 108th Street, Forest Hills, NY 11375"));
assert.ok(hasStreetAddress("83-07 Grand Ave, Elmhurst, NY 11373"));
assert.ok(hasStreetAddress("131-04 Meridian Rd, Flushing, NY 11368"));
assert.equal(
  cleanStreetAddress("Peter Jay Sharp Dock, 3579 Harlem River Drive, New York, NY 10034"),
  "3579 Harlem River Drive, New York, NY 10034"
);
assert.ok(
  hasStreetAddress("Peter Jay Sharp Dock, 3579 Harlem River Drive, New York, NY 10034")
);
assert.ok(hasStreetAddress("Dalton PE Center, 200 East 87th Street, New York, NY 10128"));
assert.equal(
  cleanStreetAddress("One Randall's Island Park, New York, NY 10035"),
  "One Randall's Island Park, New York, NY 10035"
);
assert.ok(hasStreetAddress("One Randall's Island Park, New York, NY 10035"));
assert.equal(hasStreetAddress("Prospect Park, Brooklyn, NY 11225"), false);
assert.equal(hasStreetAddress("Downtown Brooklyn, Brooklyn, NYC"), false);
assert.ok(hasStreetAddress("Cadman Plaza East & Tillary Street, Brooklyn, NY 11201"));
assert.ok(hasStreetAddress("Fort Washington Ave at W 173rd St, New York, NY 10033"));
assert.ok(hasStreetAddress("Parade Ground, Caton Avenue & Parkside Avenue, Brooklyn, NY 11218"));
assert.equal(
  hasStreetAddress("280 Broadway (Lower Manhattan) and 890 Broadway (Union Square)"),
  false
);
assert.equal(hasStreetAddress("2025 and learn about Lacrosse the Brooklyn way.."), false);
assert.ok(hasStreetAddress("100 Park Way, Brooklyn, NY 11215"));
assert.ok(hasStreetAddress("100 Ocean Way, Brooklyn, NY 11215"));

const preferPage = pickStreetAddress(
  [
    "209 W 42nd Street, New York, NY, 10036",
    "2026 The New 42nd Street",
    "149 The Lion King on Broadway",
  ],
  { borough: "Manhattan", neighborhood: "Theater District" }
);
assert.ok(/209 W\.?\s*42nd/i.test(preferPage), `expected page street, got ${preferPage}`);

const picked = pickStreetAddress(
  ["273 Bowery", "5 West 63rd Street, New York, NY 10023"],
  { borough: "Manhattan", neighborhood: "Chinatown" }
);
assert.ok(/273 Bowery/i.test(picked), `expected homepage Bowery first, got ${picked}`);

const ldHtml = `<html><script type="application/ld+json">
{"@type":"Place","address":{"@type":"PostalAddress","streetAddress":"273 Bowery","addressLocality":"New York"}}
</script></html>`;
const fromLd = extractFromHtml(ldHtml, "https://ymcanyc.org/locations/chinatown-ymca");
assert.ok(
  fromLd.streetAddresses.some((a) => /273 Bowery/i.test(a)),
  `JSON-LD street missing: ${JSON.stringify(fromLd.streetAddresses)}`
);

const contactHtml = `<p>Studio: 262 W. 38th Street, New York, NY 10018</p>`;
const fromContact = extractFromHtml(contactHtml, "https://www.broadwayartistsalliance.org/contact");
assert.ok(
  fromContact.streetAddresses.some((a) => /262 W\.?\s*38th/i.test(a)),
  `contact street missing: ${JSON.stringify(fromContact.streetAddresses)}`
);

console.log("extractOfficialPage.address.test.cjs: ok");
