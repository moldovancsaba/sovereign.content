#!/usr/bin/env node
/**
 * Reclassify watch — for recently published Find ids, confirm public GET still
 * returns 200 with the expected non-birthday category. If Lite flipped the
 * listing to Birthday Parties (disabled publicly), patch category (+ activity
 * types) back via ingest.
 */
require("./_productRoot.cjs").loadProductEnv();
const fs = require("fs");
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const {
  STATE_PATH,
  SEEDS_PATH,
  WATCH_LOG,
  ensureDir,
  DATA_DIR,
  migrateTmpStateIfNeeded,
} = require("./lib/paths.cjs");
const { appendEvent } = require("./lib/events.cjs");
const {
  fetchPublicRuntimeGate,
  publicTargetBlockedReason,
} = require("./lib/publicActivityGate.cjs");

const BASE = process.env.CATALOG_LOOP_BASE || "https://getyourfield.com";
const KEY = process.env.INGEST_API_KEY;

function loadState() {
  migrateTmpStateIfNeeded();
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { watchIds: [] };
  }
}

function saveState(s) {
  s.updatedAt = new Date().toISOString();
  ensureDir(DATA_DIR);
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

async function main() {
  if (!KEY) throw new Error("INGEST_API_KEY missing");
  ensureDir(DATA_DIR);
  const state = loadState();
  const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8")).seeds || [];
  const byId = new Map(seeds.map((s) => [s.id, s]));
  const watchIds = [...new Set([...(state.watchIds || []), ...(state.foundIds || [])])].filter(
    (id) =>
      byId.has(id) ||
      (state.findAttempts && state.findAttempts[id] && state.findAttempts[id].publicTarget)
  );

  const client = new MongoClient(process.env.getyourfield_MONGODB_URI);
  await client.connect();
  const col = client.db("classscoutcluster").collection("providers");

  const now = new Date().toISOString();
  const report = { at: now, checked: [], repaired: [], skippedConfigHidden: [] };

  let runtimeGate = null;
  try {
    runtimeGate = await fetchPublicRuntimeGate(BASE);
  } catch (e) {
    console.warn("reclassify watch: runtime-config gate unavailable", e.message || e);
  }

  for (const id of watchIds.slice(-40)) {
    const seed = byId.get(id);
    const expectedCategory = (seed && seed.category) || "Classes";
    const expectedActivities = (seed && seed.activityTypes) || null;

    const pub = await fetch(`${BASE}/api/public/providers/${id}?city=nyc`, {
      signal: AbortSignal.timeout(20000),
    });
    let pubBody = null;
    try {
      pubBody = await pub.json();
    } catch {
      pubBody = null;
    }

    const row = await col.findOne(
      { id },
      { projection: { id: 1, category: 1, activityTypes: 1, visibility: 1, qualityStatus: 1, borough: 1 } }
    );
    if (!row) {
      report.checked.push({ id, status: "missing_db" });
      continue;
    }

    const entry = {
      id,
      publicStatus: pub.status,
      publicCategory: pubBody && pubBody.category,
      dbCategory: row.category,
      expectedCategory,
    };

    // Config-disabled activity/region/category → public 404 is expected. Do not treat as a
    // birthday flip (that burned cycles patching category while smoke stayed 404).
    if (pub.status === 404 && runtimeGate) {
      const probe = {
        borough: row.borough || (seed && seed.borough) || "",
        category: row.category || expectedCategory,
        activityTypes: row.activityTypes || expectedActivities || [],
        publicTarget: true,
      };
      // The client's runtime config is the only input (rule 441) — no hardcoded "public" borough or
      // category list; the stale 4-arg call (from before that signature change) silently ignored the
      // extra args, so this was already reading the gate alone.
      const blocked = publicTargetBlockedReason(probe, runtimeGate);
      if (blocked) {
        entry.skipReason = blocked;
        report.skippedConfigHidden.push(entry);
        report.checked.push(entry);
        appendEvent("find_smoke", {
          seedId: id,
          status: 404,
          category: row.category,
          publicTarget: true,
          context: "reclassify_watch_config_hidden",
          reasonCode: blocked,
        });
        continue;
      }
    }

    const flippedToBirthday =
      row.category === "Birthday Parties" ||
      (pub.status === 404 && expectedCategory !== "Birthday Parties");

    if (flippedToBirthday && expectedCategory !== "Birthday Parties") {
      const patch = {
        category: expectedCategory,
      };
      if (expectedActivities) patch.activityTypes = expectedActivities;
      const res = await fetch(`${BASE}/api/ingest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operations: [
            {
              resource: "provider",
              action: "patch",
              id,
              patch: {
                ...patch,
                fieldVerifications: [
                  {
                    field: "category",
                    verifiedAt: now,
                    sourceUrl: (seed && seed.website) || BASE,
                    method: "official_page",
                    verifiedBy: "catalog-loop-reclassify-watch",
                  },
                ],
              },
            },
          ],
        }),
      });
      const body = await res.json().catch(() => ({}));
      entry.repair = { status: res.status, body };
      const smoke2 = await fetch(`${BASE}/api/public/providers/${id}?city=nyc`, {
        signal: AbortSignal.timeout(20000),
      });
      entry.publicStatusAfter = smoke2.status;
      report.repaired.push(entry);
      appendEvent("reclassify_repair", {
        providerId: id,
        from: row.category,
        to: expectedCategory,
        publicStatusAfter: smoke2.status,
      });
      appendEvent("find_smoke", {
        seedId: id,
        status: smoke2.status,
        category: expectedCategory,
        publicTarget: true,
        context: "reclassify_watch",
      });
      console.log("reclassify repaired", id, entry.publicStatusAfter);
    } else {
      report.checked.push(entry);
      if (state.findAttempts && state.findAttempts[id] && state.findAttempts[id].publicTarget) {
        appendEvent("find_smoke", {
          seedId: id,
          status: pub.status,
          category: pubBody && pubBody.category,
          publicTarget: true,
          context: "reclassify_watch",
        });
      }
    }

    if (state.findAttempts && state.findAttempts[id]) {
      state.findAttempts[id].lastWatchAt = now;
      state.findAttempts[id].lastPublicStatus = pub.status;
      state.findAttempts[id].lastPublicCategory = pubBody && pubBody.category;
    }
  }

  fs.writeFileSync(WATCH_LOG, JSON.stringify(report, null, 2));
  saveState(state);
  console.log(
    "reclassify watch",
    JSON.stringify({
      checked: report.checked.length,
      repaired: report.repaired.length,
      skippedConfigHidden: report.skippedConfigHidden.length,
    })
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
