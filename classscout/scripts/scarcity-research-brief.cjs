#!/usr/bin/env node
/**
 * Hourly scarcity research brief for Find + fair-use discovery.
 *
 * Reads public providers from Mongo, ranks thin public neighborhoods and scarce
 * sport activities, writes searchQueries + findHints to
 * scripts/catalog-loop/data/scarcity-research-brief.json (refreshed each UTC hour
 * from forever.sh / fair-use forever).
 */
require("./_productRoot.cjs").loadProductEnv();
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("./_productRoot.cjs").productRequire("mongodb");
const { DATA_DIR, ensureDir } = require("./lib/paths.cjs");
const { appendEvent } = require("./lib/events.cjs");
const { buildResearchBrief, isPublicProvider } = require("./lib/scarcityResearchBrief.cjs");

const BRIEF_PATH =
  process.env.CATALOG_SCARCITY_BRIEF || path.join(DATA_DIR, "scarcity-research-brief.json");

async function main() {
  ensureDir(DATA_DIR);
  if (!process.env.getyourfield_MONGODB_URI) {
    console.error("getyourfield_MONGODB_URI missing — writing empty brief scaffolding");
    const empty = buildResearchBrief([], { generatedAt: new Date().toISOString() });
    fs.writeFileSync(BRIEF_PATH, JSON.stringify(empty, null, 2));
    process.exit(2);
  }

  const client = new MongoClient(process.env.getyourfield_MONGODB_URI);
  await client.connect();
  const col = client.db("classscoutcluster").collection("providers");
  const rows = await col
    .find(
      {},
      {
        projection: {
          id: 1,
          borough: 1,
          neighborhood: 1,
          activityTypes: 1,
          visibility: 1,
          qualityStatus: 1,
          discoveryTier: 1,
        },
      },
    )
    .toArray();
  await client.close();

  const publicRows = rows.filter(isPublicProvider);
  const brief = buildResearchBrief(publicRows, { generatedAt: new Date().toISOString() });
  brief.totals = {
    providersScanned: rows.length,
    publicProviders: publicRows.length,
  };
  fs.writeFileSync(BRIEF_PATH, JSON.stringify(brief, null, 2));

  appendEvent("scarcity_research_brief", {
    hourUtc: brief.hourUtc,
    thinNeighborhoods: brief.thinNeighborhoods.slice(0, 5).map((n) => ({
      borough: n.borough,
      neighborhood: n.neighborhood,
      count: n.count,
    })),
    scarceSports: brief.scarceSports.slice(0, 5).map((s) => ({
      activity: s.activity,
      count: s.count,
    })),
    searchQueryCount: brief.searchQueries.length,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        path: BRIEF_PATH,
        hourUtc: brief.hourUtc,
        topNeighborhoods: brief.thinNeighborhoods.slice(0, 5),
        topSports: brief.scarceSports.slice(0, 5),
        searchQueries: brief.searchQueries.slice(0, 8),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
