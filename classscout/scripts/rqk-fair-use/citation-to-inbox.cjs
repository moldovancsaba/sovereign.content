#!/usr/bin/env node
/**
 * Save a WebFetch / citation markdown snapshot into the fair-use inbox.
 * Mobile-friendly path: agent fetches via citation tool; no operator file drops.
 *
 * Usage:
 *   node citation-to-inbox.cjs --source rqk --url URL --file /tmp/page.md
 *   node citation-to-inbox.cjs --source rqk --url URL  (reads markdown from stdin)
 */
const fs = require("fs");
const path = require("path");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function markdownToExtractableHtml(md, pageUrl) {
  const text = String(md || "");
  // Prefer first markdown H1
  const h1 = (text.match(/^#\s+(.+)$/m) || [])[1] || "Provider";
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Keep label lines the RQK extractor already understands (Address / Phone / Website…)
  return `<!DOCTYPE html><html><head><link rel="canonical" href="${pageUrl}" />
<title>${h1.replace(/</g, "")}</title></head><body>
<h1>${h1.replace(/</g, "")}</h1>
<pre>${escaped}</pre>
</body></html>`;
}

const sourceId = arg("--source", "rqk");
const pageUrl = arg("--url", "");
const file = arg("--file", "");
const name = arg("--name", "lead");

if (!pageUrl) {
  console.error("need --url");
  process.exit(2);
}

const md = file ? fs.readFileSync(file, "utf8") : fs.readFileSync(0, "utf8");
const dataDir =
  process.env.RQK_DATA_DIR ||
  path.join(__dirname, "..", "data", "rqk-fair-use");
const inboxDir = path.join(dataDir, "inbox", sourceId);
fs.mkdirSync(inboxDir, { recursive: true });
const htmlPath = path.join(inboxDir, `${name}.html`);
const jsonPath = path.join(inboxDir, `${name}.json`);
fs.writeFileSync(htmlPath, markdownToExtractableHtml(md, pageUrl));
fs.writeFileSync(jsonPath, JSON.stringify({ url: pageUrl }, null, 2));
console.log(JSON.stringify({ ok: true, htmlPath, jsonPath, sourceId, pageUrl }));
