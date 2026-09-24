/**
 * Curated About overrides — Mongo only (`listing_curated_abouts`).
 * Catalogue content never lives in the git repo; visitors see `listings.description`, and the
 * quality loop prefers these Mongo overrides when re-improving.
 */
import type { Db } from "mongodb";
import { sanitizeAbout } from "./composeAbout";

export const LISTING_CURATED_ABOUTS = "listing_curated_abouts";

export interface CuratedAboutDoc {
  listingId: string;
  description: string;
  updatedAt: string;
  source?: string;
}

/** Load all curated About overrides from Mongo (keyed by listing id). */
export async function loadCuratedAbout(db: Db): Promise<Record<string, string>> {
  const rows = await db
    .collection(LISTING_CURATED_ABOUTS)
    .find({}, { projection: { _id: 0, listingId: 1, description: 1 } })
    .toArray();
  const out: Record<string, string> = {};
  for (const row of rows) {
    const id = typeof row.listingId === "string" ? row.listingId : "";
    const text = typeof row.description === "string" ? row.description.trim() : "";
    if (id && text.length >= 40) out[id] = text;
  }
  return out;
}

/** Upsert one curated About in Mongo. Does not write the git tree. */
export async function upsertCuratedAbout(
  db: Db,
  listingId: string,
  description: string,
  source = "about-curate",
): Promise<void> {
  const cleaned = sanitizeAbout(description);
  if (cleaned.length < 40) throw new Error("curated About too short");
  const now = new Date().toISOString();
  await db.collection(LISTING_CURATED_ABOUTS).updateOne(
    { listingId },
    { $set: { listingId, description: cleaned, updatedAt: now, source } },
    { upsert: true },
  );
}

/**
 * One-shot import of a legacy on-disk map into Mongo (e.g. emptying a former repo fixture).
 * Returns how many rows were upserted. Callers should not keep content in git afterward.
 */
export async function importCuratedAboutMap(
  db: Db,
  map: Readonly<Record<string, string>>,
  source = "legacy-import",
): Promise<number> {
  let n = 0;
  for (const [listingId, description] of Object.entries(map)) {
    if (typeof description !== "string" || description.trim().length < 40) continue;
    await upsertCuratedAbout(db, listingId, description, source);
    n += 1;
  }
  return n;
}
