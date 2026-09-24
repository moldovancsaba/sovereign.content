#!/usr/bin/env node
/**
 * Multi-lane improve scan — evidence from official pages only.
 * Modes: trial | sessions | contacts | price | age
 *
 * Usage:
 *   node improve-scan.mjs <mode> <input.json> <offset> <limit> <out.json>
 * input.json: array of { id, name, website, ... }
 */
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  extractFromHtml,
  extractHardContacts,
  extractSessions,
  extractPrice,
  extractAgeRanges,
  buildTrialPolicy,
  isBadTrialPolicy,
  stripHtml,
} = require("./lib/extractOfficialPage.cjs");

const UA = "Mozilla/5.0 (compatible; ClassScoutCatalogLoop/1.0; +https://getyourfield.com)";

async function fetchText(url) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(18000),
    });
    const text = await r.text();
    return { ok: r.ok, status: r.status, url: r.url, text: text.slice(0, 400_000) };
  } catch (e) {
    return { ok: false, status: 0, url, text: "", error: String(e.message || e) };
  }
}

function candidateUrls(website, mode) {
  let u;
  try {
    u = new URL(website);
  } catch {
    return [];
  }
  const o = u.origin;
  const common = [website, `${o}/`];
  if (mode === "trial") {
    return [
      ...new Set([
        ...common,
        `${o}/pricing`,
        `${o}/prices`,
        `${o}/faq`,
        `${o}/faqs`,
        `${o}/trial`,
        `${o}/new-students`,
        `${o}/classes`,
        `${o}/programs`,
        `${o}/membership`,
        `${o}/register`,
        `${o}/registration`,
      ]),
    ];
  }
  if (mode === "sessions") {
    return [
      ...new Set([
        ...common,
        `${o}/classes`,
        `${o}/programs`,
        `${o}/schedule`,
        `${o}/calendar`,
        `${o}/camps`,
        `${o}/sessions`,
      ]),
    ];
  }
  if (mode === "price") {
    return [...new Set([...common, `${o}/pricing`, `${o}/prices`, `${o}/tuition`, `${o}/fees`])];
  }
  if (mode === "age") {
    return [...new Set([...common, `${o}/classes`, `${o}/programs`, `${o}/ages`, `${o}/about`])];
  }
  // contacts — homepage + contact
  return [...new Set([...common, `${o}/contact`, `${o}/contact-us`, `${o}/about`])];
}

const TRIAL_RES = [
  /\b(free\s+trial(?:\s+class)?)\b/i,
  /\b(trial\s+class)\b/i,
  /\b(try\s+(?:a|one)\s+class)\b/i,
  /\b(intro(?:ductory)?\s+(?:offer|class|rate|special))\b/i,
  /\b(drop[-\s]?in(?:s)?\s+(?:welcome|available|allowed|rate))\b/i,
  /\bno\s+trial\b/i,
  /\bmembership\s+required\b/i,
  /\bsibling\s+discount\b/i,
];

function extractTrialFromText(text, sourceUrl) {
  const hits = [];
  for (const re of TRIAL_RES) {
    const m = text.match(re);
    if (m) hits.push(m[0]);
  }
  if (!hits.length) return null;
  const lower = text.toLowerCase();
  const free = /\bfree\s+trial\b/i.test(text);
  const dropIn = /\bdrop[-\s]?in/i.test(text) && /\b(welcome|available|allowed|ok|okay)\b/i.test(text);
  const sibling = /\bsibling\s+discount\b/i.test(text);
  const idx = lower.search(/trial|drop[-\s]?in|intro(?:ductory)?\s+(?:offer|class)/i);
  const sourceText = idx >= 0 ? text.slice(Math.max(0, idx - 40), idx + 120).trim() : hits[0];
  const policy = {
    trialAvailable: /\bno\s+trial\b/i.test(text) ? false : /\btrial\b/i.test(text) ? true : undefined,
    trialIsFree: free || undefined,
    dropInAllowed: dropIn || undefined,
    siblingDiscount: sibling || undefined,
    sourceText: sourceText.slice(0, 240),
  };
  for (const k of Object.keys(policy)) if (policy[k] === undefined) delete policy[k];
  if (!policy.sourceText) return null;
  if (
    policy.trialAvailable === undefined &&
    policy.dropInAllowed === undefined &&
    policy.siblingDiscount === undefined
  ) {
    return null;
  }
  if (isBadTrialPolicy(policy)) return null;
  return { trialPolicy: policy, sourceUrl };
}

const mode = process.argv[2] || "trial";
const inputPath = process.argv[3];
const offset = Number(process.argv[4] || 0);
const limit = Number(process.argv[5] || 40);
const outPath = process.argv[6] || `/tmp/catalog-loop-${mode}-batch.json`;

const items = JSON.parse(fs.readFileSync(inputPath, "utf8")).slice(offset, offset + limit);
const results = [];

for (const item of items) {
  if (!item.website || !/^https?:/i.test(item.website)) {
    results.push({ id: item.id, lane: mode, notes: "no_website" });
    continue;
  }
  process.stderr.write(`${mode} ${item.id}\n`);
  let best = null;
  const pages = [];
  for (const url of candidateUrls(item.website, mode)) {
    const res = await fetchText(url);
    pages.push({ url, status: res.status, ok: res.ok });
    if (!res.ok || !res.text) continue;
    const text = stripHtml(res.text);
    const sourceUrl = res.url || url;

    if (mode === "trial") {
      const found = extractTrialFromText(text, sourceUrl);
      if (found && (!best || (found.trialPolicy.trialAvailable && !best.trialPolicy.trialAvailable))) {
        best = found;
      }
      // also try HTML snippet path
      if (!best) {
        const fromHtml = extractFromHtml(res.text, item.website);
        const policy = buildTrialPolicy(fromHtml.trialSnippets);
        if (policy && !isBadTrialPolicy(policy)) best = { trialPolicy: policy, sourceUrl };
      }
    } else if (mode === "sessions") {
      const sessions = extractSessions(res.text, item.id);
      if (sessions.length && (!best || sessions.length > best.sessions.length)) {
        best = { sessions, sourceUrl };
      }
    } else if (mode === "contacts") {
      const hard = extractHardContacts(res.text);
      const soft = extractFromHtml(res.text, item.website);
      const phones = [...new Set([...(hard.phones || []), ...(soft.phones || [])])];
      const emails = [...new Set([...(hard.emails || []), ...(soft.emails || [])])];
      if ((phones.length || emails.length) && !best) {
        best = { phone: phones[0] || "", email: emails[0] || "", sourceUrl };
      }
    } else if (mode === "price") {
      const found = extractPrice(res.text, sourceUrl);
      if (found && found.price && !best) best = found;
    } else if (mode === "age") {
      const ages = extractAgeRanges(res.text);
      if (ages.length && (!best || ages.length > best.ageRanges.length)) {
        best = { ageRanges: ages, sourceUrl };
      }
    }
  }

  results.push({
    id: item.id,
    name: item.name,
    website: item.website,
    lane: mode,
    ...(best || { notes: "not_stated" }),
    pages: pages.filter((p) => p.ok).map((p) => p.url),
  });
}

const withEvidence = results.filter((r) => {
  if (mode === "trial") return Boolean(r.trialPolicy);
  if (mode === "sessions") return Array.isArray(r.sessions) && r.sessions.length;
  if (mode === "contacts") return Boolean(r.phone || r.email);
  if (mode === "price") return Boolean(r.price);
  if (mode === "age") return Array.isArray(r.ageRanges) && r.ageRanges.length;
  return false;
}).length;

fs.writeFileSync(
  outPath,
  JSON.stringify(
    { at: new Date().toISOString(), mode, offset, limit, withEvidence, results },
    null,
    2
  )
);
console.log(JSON.stringify({ wrote: outPath, n: results.length, withEvidence, mode }, null, 2));
