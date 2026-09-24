/**
 * uniqueSourceUrls — Find must not send repeated homepage URLs in sourceUrls
 * (ingest providerValidation rejects within-doc duplicates as "duplicate source URL").
 */
const assert = require("assert");

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

const home = "https://www.example.com/";
const deep = [
  "https://www.example.com/",
  "https://www.example.com/contact",
  "https://www.example.com/",
  "https://www.example.com/pricing",
];
const out = uniqueSourceUrls([home, ...deep]);
assert.deepEqual(out, [
  "https://www.example.com/",
  "https://www.example.com/contact",
  "https://www.example.com/pricing",
]);
assert.equal(out.length, 3);

console.log("find-sourceurls-dedupe.test.cjs: ok");
