/**
 * Fill empty listing media from website imagery or the listing page Open Graph card
 * (page snapshot). Rehosts to R2 (primary) / ImgBB (backup) when configured; otherwise
 * attaches the discovered https URL (source passthrough) so the catalogue is not left blank.
 *
 *   VERTICAL=padel-africa MONGODB_URI=... MONGODB_DB=padel-africa \
 *     npx tsx scripts/catalog-media-curate.ts [--limit 20] [--listing-id ID] [--dry-run]
 *     [--policy allow_og_scrape|generated_art_only]
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";
import { existsSync, readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
import { runMediaCurate, resolveMediaCuratePolicy } from "../src/lib/catalogHygiene/mediaCurate";
import { intArg } from "./listing-quality-cli";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

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

async function main() {
  refuseAgentMongo("catalog-media-curate.ts");
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI required");
  const dryRun = process.argv.includes("--dry-run");
  const limit = intArg(process.argv, "--limit", 15);
  const listingId = listingIdArg();
  const policyFlag = (() => {
    const i = process.argv.indexOf("--policy");
    return i >= 0 ? process.argv[i + 1] : undefined;
  })();
  const publicOrigin =
    process.env.PUBLIC_SITE_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://padel-africa.doneisbetter.com";

  const client = await MongoClient.connect(uri);
  const db = client.db(process.env.MONGODB_DB ?? "management");
  const serving = await resolveServingRefresh();

  const summary = await runMediaCurate(db, {
    limit,
    dryRun,
    listingId,
    publicOrigin,
    policy: resolveMediaCuratePolicy(policyFlag),
    allowSourcePassthrough: true,
    onApplied: serving
      ? async (id) => {
          const doc = await db.collection("listings").findOne({ id }, { projection: { _id: 0 } });
          if (!doc) return;
          const listing = serving.parseListing(doc);
          const derived = serving.deriveServingDoc(listing, serving.pack, serving.territory, new Date().toISOString());
          await serving.writeServingDoc(db, derived);
        }
      : undefined,
  });

  console.log(JSON.stringify({ dryRun, limit, publicOrigin, ...summary }, null, 2));
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
