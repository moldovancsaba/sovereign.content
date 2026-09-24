#!/usr/bin/env node
/**
 * Tier A auto-encode: after N≥3 identical signatures in 24h, pause matching seeds
 * and/or record lessons (quality plan §5.3). Never touches Tier C product policy.
 *
 * Signatures covered:
 * - host + http_blocked|http_not_found|fetch_error|no_street_address (Find skips)
 * - host + ingest_reject when body mentions URLs / scraped chrome (Find)
 * - fair_use_reject reasonCode dead_hub_url|guide_or_hub_name|one_off_event (discovery)
 */
const fs = require("fs");
const { SEEDS_PATH, LESSONS_PATH, migrateTmpStateIfNeeded } = require("./lib/paths.cjs");
const { readEventsSince, appendEvent, mapSkipReason } = require("./lib/events.cjs");

const THRESHOLD = Math.max(3, Number(process.env.CATALOG_LOOP_TIER_A_THRESHOLD || 3));

function hostOf(urlOrHost) {
  if (!urlOrHost) return "";
  try {
    return new URL(urlOrHost).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return String(urlOrHost)
      .replace(/^www\./, "")
      .toLowerCase();
  }
}

function findSkipSignature(e) {
  const code = e.reasonCode || mapSkipReason(e.reason);
  if (["http_blocked", "http_not_found", "fetch_error", "no_street_address"].includes(code)) {
    const host = hostOf(e.host || e.website || e.seedId);
    return host ? `${host}::${code}` : null;
  }
  if (code === "ingest_reject" || /ingest_reject|without URLs|scraped page chrome/i.test(String(e.reason || e.body || ""))) {
    const host = hostOf(e.host || e.website || e.seedId);
    return host ? `${host}::ingest_reject_chrome` : null;
  }
  return null;
}

function fairUseSignature(e) {
  const code = e.reasonCode || e.reason;
  if (!["dead_hub_url", "guide_or_hub_name", "one_off_event", "brand_or_chrome_name"].includes(code)) {
    return null;
  }
  const sourceId = e.sourceId || "fair-use";
  return `${sourceId}::fair_use::${code}`;
}

function main() {
  migrateTmpStateIfNeeded();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const events = readEventsSince(since);
  const sigCount = new Map();

  for (const e of events) {
    let key = null;
    if (e.type === "find_skip" || e.type === "ingest_reject") {
      key = findSkipSignature(e);
    } else if (e.type === "fair_use_reject") {
      key = fairUseSignature(e);
    }
    if (!key) continue;
    sigCount.set(key, (sigCount.get(key) || 0) + 1);
  }

  const toPause = [...sigCount.entries()].filter(([, n]) => n >= THRESHOLD);
  if (!toPause.length) {
    console.log(JSON.stringify({ paused: 0, checked: sigCount.size, signatures: [] }));
    return;
  }

  const seedsDoc = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
  const lessonsDoc = JSON.parse(fs.readFileSync(LESSONS_PATH, "utf8"));
  let paused = 0;
  const now = new Date().toISOString();
  const lessonNotes = [];

  for (const [key, n] of toPause) {
    const parts = key.split("::");
    // fair_use:: form: sourceId::fair_use::code — lesson only (no host to pause)
    if (parts[1] === "fair_use") {
      const [sourceId, , code] = parts;
      const lid = `lesson-auto-fair-use-${sourceId}-${code}`;
      lessonsDoc.lessons = lessonsDoc.lessons || [];
      if (!lessonsDoc.lessons.some((l) => l.id === lid)) {
        lessonsDoc.lessons.push({
          id: lid,
          incidentAt: now.slice(0, 10),
          summary: `Fair-use source ${sourceId} hit ${n}× ${code} in 24h — tighten harvest / dead-hub list.`,
          failureMode: code,
          encode: {
            tier: "A",
            actions: [
              `Review ${sourceId} discovery/queue patterns`,
              `Ensure deadHubPatterns.cjs covers repeated 404 hubs`,
              `Reject ${code} at leadQuality before seed append`,
            ],
          },
          status: "encoded",
        });
        appendEvent("lesson_encoded", { lessonId: lid, tier: "A", sourceId, reasonCode: code, count24h: n });
        lessonNotes.push(lid);
      }
      continue;
    }

    const [host, code] = parts;
    for (const seed of seedsDoc.seeds || []) {
      if (!seed || seed.paused) continue;
      const sh = hostOf(seed.website);
      if (sh !== host) continue;
      // ingest_reject_chrome: also strip unsafe copy so a later unpause can succeed
      if (code === "ingest_reject_chrome") {
        const { stripUrlsFromPublicCopy } = require("./lib/publicCopyHygiene.cjs");
        seed.shortDescription = stripUrlsFromPublicCopy(seed.shortDescription || "");
        seed.longDescription = stripUrlsFromPublicCopy(seed.longDescription || "");
        seed.researchNote = stripUrlsFromPublicCopy(seed.researchNote || "");
      }
      seed.paused = true;
      seed.pauseReason = `tier_a:${code}:n=${n}`;
      seed.pausedAt = now;
      paused += 1;
      appendEvent("seed_paused", {
        seedId: seed.id,
        host,
        reasonCode: code,
        count24h: n,
        tier: "A",
      });
      lessonsDoc.lessons = lessonsDoc.lessons || [];
      const lid = `lesson-auto-${host.replace(/\W+/g, "-")}-${code}`;
      if (!lessonsDoc.lessons.some((l) => l.id === lid)) {
        lessonsDoc.lessons.push({
          id: lid,
          incidentAt: now.slice(0, 10),
          summary: `Auto-paused seeds on ${host} after ${n}× ${code} in 24h.`,
          failureMode: code,
          encode: {
            tier: "A",
            actions: [`paused seed(s) matching host ${host}`, `reason ${code}`],
          },
          status: "encoded",
          relatedIds: [seed.id],
        });
        appendEvent("lesson_encoded", { lessonId: lid, tier: "A", host, reasonCode: code });
        lessonNotes.push(lid);
      }
    }
  }

  if (paused || lessonNotes.length) {
    seedsDoc.updatedAt = now;
    fs.writeFileSync(SEEDS_PATH, JSON.stringify(seedsDoc, null, 2) + "\n");
    lessonsDoc.updatedAt = now;
    fs.writeFileSync(LESSONS_PATH, JSON.stringify(lessonsDoc, null, 2) + "\n");
  }
  console.log(
    JSON.stringify({
      paused,
      lessons: lessonNotes.length,
      signatures: toPause.map(([k, n]) => ({ k, n })),
    })
  );
}

main();
