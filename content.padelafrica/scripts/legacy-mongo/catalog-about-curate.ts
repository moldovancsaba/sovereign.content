/**
 * Cloud Agent About curate — same skill as fixing one listing by hand:
 * draft grounded About copy from listing facts + research sourceText, upsert Mongo
 * `listing_curated_abouts`, apply to `listings.description` (and serving when pack loads).
 * Catalogue content never touches the git tree.
 *
 *   npm run catalog:about-curate -- --limit 10
 *   npm run catalog:about-curate -- --listing-id research-nga-ven-003 --about "…"
 *   npm run catalog:about-curate -- --list --limit 20
 *   npm run catalog:about-curate -- --import-legacy-file   # one-shot: JSON → Mongo, then empty file
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";
import { draftAboutFromEvidence } from "../src/lib/listingQuality/curateAbout";
import { loadCuratedAbout, upsertCuratedAbout, importCuratedAboutMap } from "../src/lib/listingQuality/curatedAbout";
import { scoreAboutQuality } from "../src/lib/listingQuality/score";
import { ABOUT_QUALITY_TARGET } from "../src/lib/listingQuality/types";
import { mongoListingQualityStore } from "../src/lib/listingQuality/store";
import { validatePublicDescription } from "../src/lib/catalogHygiene/descriptionQuality";
import { intArg } from "./listing-quality-cli";

const LEGACY_FILE = "scripts/data/osm-padel-africa-about.json";

async function resolveServingRefresh() {
  try {
    const { resolveVertical } = await import("../src/lib/vertical/resolve");
    const { resolveTerritory } = await import("../src/lib/geo/territoryResolve");
    const { parseListing } = await import("../src/lib/entity/listing");
    const { deriveServingDoc } = await import("../src/lib/servingModel/deriveServingDoc");
    const { writeServingDoc } = await import("../src/lib/servingModel/writeServingDoc");
    const { pack } = resolveVertical(process.env.VERTICAL?.trim() || "management-console");
    const territory = resolveTerritory(pack.territory, null);
    return { pack, territory, parseListing, deriveServingDoc, writeServingDoc };
  } catch {
    return null;
  }
}

function listingIdArg(): string | undefined {
  const i = process.argv.indexOf("--listing-id");
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function aboutArg(): string | undefined {
  const i = process.argv.indexOf("--about");
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  refuseAgentMongo("catalog-about-curate.ts");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dryRun = process.argv.includes("--dry-run");
  const listOnly = process.argv.includes("--list");
  const importLegacy = process.argv.includes("--import-legacy-file");
  const limit = intArg(process.argv, "--limit", 10);
  const onlyId = listingIdArg();
  const explicitAbout = aboutArg();

  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "management");

  if (importLegacy) {
    const abs = resolve(LEGACY_FILE);
    let map: Record<string, string> = {};
    if (existsSync(abs)) {
      try {
        map = JSON.parse(readFileSync(abs, "utf8")) as Record<string, string>;
      } catch {
        map = {};
      }
    }
    const imported = dryRun ? Object.keys(map).length : await importCuratedAboutMap(db, map, "legacy-file-import");
    if (!dryRun) writeFileSync(abs, "{}\n", "utf8");
    console.log(JSON.stringify({ dryRun, imported, emptiedFile: !dryRun, path: LEGACY_FILE }, null, 2));
    await client.close();
    return;
  }

  const store = mongoListingQualityStore(db);
  const curatedById = await loadCuratedAbout(db);
  const serving = await resolveServingRefresh();

  const snapshots = onlyId
    ? [await store.getSnapshot(onlyId)].filter(Boolean)
    : await store.listPublishedSnapshots(500);

  type Candidate = {
    listingId: string;
    name: string;
    scoreBefore: number;
    descriptionLen: number;
    hasSource: boolean;
    snap: NonNullable<(typeof snapshots)[number]>;
    sourceText?: string;
  };
  const scored: Candidate[] = [];
  for (const snap of snapshots) {
    if (!snap) continue;
    const report = scoreAboutQuality(snap.description, snap.locality);
    if (report.score >= ABOUT_QUALITY_TARGET && report.kinds.length === 0 && !onlyId) continue;
    const cardId = snap.id.startsWith("l-") ? snap.id.slice(2) : snap.id;
    const card =
      (await db.collection("content_cards").findOne({ listingId: snap.id })) ||
      (await db.collection("content_cards").findOne({ id: cardId }));
    const sourceText =
      card && typeof (card as { rawPayload?: { sourceText?: string } }).rawPayload?.sourceText === "string"
        ? (card as { rawPayload: { sourceText: string } }).rawPayload.sourceText
        : undefined;
    scored.push({
      listingId: snap.id,
      name: snap.name,
      scoreBefore: report.score,
      descriptionLen: (snap.description || "").length,
      hasSource: Boolean(sourceText),
      snap,
      sourceText,
    });
  }
  scored.sort((a, b) => a.scoreBefore - b.scoreBefore || a.descriptionLen - b.descriptionLen);
  const candidates = onlyId ? scored : scored.slice(0, limit);

  if (listOnly) {
    console.log(
      JSON.stringify(
        {
          dryRun,
          candidates: candidates.map(({ snap: _s, sourceText: _t, ...rest }) => rest),
        },
        null,
        2,
      ),
    );
    await client.close();
    return;
  }

  const results: Array<Record<string, unknown>> = [];
  for (const cand of candidates) {
    const snap = cand.snap;
    const sourceText = cand.sourceText;

    let description: string;
    let tactic: string;
    let score: number;
    if (explicitAbout && onlyId) {
      description = explicitAbout.trim();
      const gate = validatePublicDescription(description, "description");
      if (gate || description.length < 120) {
        results.push({ listingId: cand.listingId, status: "rejected", error: gate || "too short" });
        continue;
      }
      tactic = "explicit_about";
      score = scoreAboutQuality(description, snap.locality).score;
    } else {
      const drafted = draftAboutFromEvidence(snap, {
        sourceText,
        curatedById,
        listingNounSingular: serving?.pack.listingNoun?.singular,
      });
      description = drafted.description;
      tactic = drafted.tactic;
      score = drafted.score;
    }

    if (description === snap.description && score >= cand.scoreBefore) {
      results.push({
        listingId: cand.listingId,
        status: "unchanged",
        tactic,
        scoreBefore: cand.scoreBefore,
        scoreAfter: score,
      });
      continue;
    }

    if (dryRun) {
      results.push({
        listingId: cand.listingId,
        status: "dry-run",
        tactic,
        scoreBefore: cand.scoreBefore,
        scoreAfter: score,
        descriptionPreview: description.slice(0, 180),
      });
      continue;
    }

    await upsertCuratedAbout(db, cand.listingId, description, "about-curate");
    const now = new Date().toISOString();
    await store.writeListingDescription(cand.listingId, description, now);
    if (serving) {
      const doc = await db.collection("listings").findOne({ id: cand.listingId }, { projection: { _id: 0 } });
      if (doc) {
        const listing = serving.parseListing(doc);
        const servingDoc = serving.deriveServingDoc(listing, serving.pack, serving.territory, now);
        await serving.writeServingDoc(db, servingDoc);
      }
    }
    results.push({
      listingId: cand.listingId,
      status: "applied",
      tactic,
      scoreBefore: cand.scoreBefore,
      scoreAfter: score,
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        limit,
        store: "mongodb:listing_curated_abouts",
        considered: candidates.length,
        applied: results.filter((r) => r.status === "applied").length,
        results,
      },
      null,
      2,
    ),
  );
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
