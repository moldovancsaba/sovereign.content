/**
 * Mongo + in-memory stores for the listing quality loop.
 * Store seam keeps score/improve/encode unit-testable without a live DB.
 */
import type { Db } from "mongodb";
import {
  ABOUT_QUALITY_TARGET,
  LISTING_QUALITY_LESSONS,
  LISTING_QUALITY_RECOMMENDATIONS,
  type OperatorFeedbackHint,
  type QualityLesson,
  type QualityListingSnapshot,
  type QualityRecommendation,
  type QualityStatus,
} from "./types";

export interface ListingQualityStore {
  listPublishedSnapshots(limit: number): Promise<QualityListingSnapshot[]>;
  getSnapshot(listingId: string): Promise<QualityListingSnapshot | null>;
  upsertRecommendations(recs: QualityRecommendation[]): Promise<void>;
  listOpenRecommendations(limit: number): Promise<QualityRecommendation[]>;
  listAppliedRecommendations(limit: number): Promise<QualityRecommendation[]>;
  markRecommendation(id: string, patch: Partial<QualityRecommendation>): Promise<void>;
  writeListingDescription(listingId: string, description: string, updatedAt: string): Promise<void>;
  insertLesson(lesson: QualityLesson): Promise<void>;
  listLessons(limit: number): Promise<QualityLesson[]>;
  countByStatus(): Promise<Partial<Record<QualityStatus, number>>>;
  /** Card-scoped instruction/negative `/stats` feedback mapped to published listing ids. */
  listActionableOperatorFeedback(limit: number): Promise<OperatorFeedbackHint[]>;
}

function snapshotFromDoc(doc: Record<string, unknown>): QualityListingSnapshot {
  const venue = (doc.venue as Record<string, unknown> | undefined) || {};
  const address = (venue.address as Record<string, unknown> | undefined) || {};
  const territory = (address.territory as Record<string, unknown> | undefined) || {};
  const schedule = (doc.schedule as Record<string, unknown> | undefined) || {};
  const locality =
    (typeof address.locality === "string" && address.locality) ||
    (typeof territory.settlement === "string" && territory.settlement) ||
    undefined;
  const region =
    (typeof address.region === "string" && address.region) ||
    (typeof territory.region === "string" && territory.region) ||
    undefined;
  const countryCode =
    (typeof address.countryCode === "string" && address.countryCode) ||
    (typeof territory.country === "string" && territory.country) ||
    undefined;
  return {
    id: String(doc.id),
    name: String(doc.name ?? ""),
    description: String(doc.description ?? ""),
    website: typeof doc.website === "string" ? doc.website : undefined,
    phone: typeof doc.phone === "string" ? doc.phone : undefined,
    venueModel: typeof doc.venueModel === "string" ? doc.venueModel : undefined,
    locality,
    region,
    countryCode,
    line1: typeof address.line1 === "string" ? address.line1 : undefined,
    seasonNote: typeof schedule.seasonNote === "string" ? schedule.seasonNote : undefined,
    activityTypes: Array.isArray(doc.activityTypes) ? (doc.activityTypes as string[]) : undefined,
    updatedAt: String(doc.updatedAt ?? new Date(0).toISOString()),
  };
}

/**
 * @deprecated Mongo store is QUARANTINED in the agent home.
 * Use ingest (`content.padelafrica/ingest/client.ts`) for listing writes.
 * Set ALLOW_MONGO_QUALITY_STORE=1 only for offline unit experiments — never against shared DB.
 */
export function mongoListingQualityStore(db: Db): ListingQualityStore {
  if (process.env.ALLOW_MONGO_QUALITY_STORE !== "1") {
    throw new Error(
      "QUARANTINE: mongoListingQualityStore is disabled in content.padelafrica. " +
        "Write via POST /api/ingest (ingest/client.ts). See src/QUARANTINE.md. " +
        "Refusing Mongo against shared DB (management PRs #222/#227 correction).",
    );
  }
  return {
    async listPublishedSnapshots(limit) {
      const rows = await db
        .collection("listings")
        .find(
          { lifecycleState: "PUBLISHED" },
          {
            projection: {
              _id: 0,
              id: 1,
              name: 1,
              description: 1,
              website: 1,
              phone: 1,
              venueModel: 1,
              "venue.address": 1,
              "schedule.seasonNote": 1,
              activityTypes: 1,
              updatedAt: 1,
            },
          },
        )
        .sort({ updatedAt: 1 })
        .limit(Math.max(1, limit))
        .toArray();
      return rows.map((r) => snapshotFromDoc(r as Record<string, unknown>));
    },

    async getSnapshot(listingId) {
      const doc = await db.collection("listings").findOne(
        { id: listingId, lifecycleState: "PUBLISHED" },
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            description: 1,
            website: 1,
            phone: 1,
            venueModel: 1,
            "venue.address": 1,
            "schedule.seasonNote": 1,
            activityTypes: 1,
            updatedAt: 1,
          },
        },
      );
      return doc ? snapshotFromDoc(doc as Record<string, unknown>) : null;
    },

    async upsertRecommendations(recs) {
      for (const rec of recs) {
        const existing = await db.collection(LISTING_QUALITY_RECOMMENDATIONS).findOne(
          { id: rec.id },
          {
            projection: {
              _id: 0,
              status: 1,
              createdAt: 1,
              appliedAt: 1,
              resultScore: 1,
              tactic: 1,
            },
          },
        );
        // Terminal applied/failed stay closed — except soft applies that never cleared the
        // About target (audit 2026-09-24): those may reopen when score still finds debt.
        if (existing && rec.status === "open") {
          const status = existing.status as string | undefined;
          const resultScore =
            typeof existing.resultScore === "number" ? (existing.resultScore as number) : undefined;
          const softApplied =
            status === "applied" && resultScore !== undefined && resultScore < ABOUT_QUALITY_TARGET;
          if ((status === "applied" || status === "failed") && !softApplied) {
            continue;
          }
        }
        const { createdAt, ...rest } = rec;
        // Reopening skipped / soft-applied: drop stale improve fields so improve runs clean.
        const clearingTerminal =
          existing &&
          rec.status === "open" &&
          (existing.status === "skipped" ||
            (existing.status === "applied" &&
              typeof existing.resultScore === "number" &&
              (existing.resultScore as number) < ABOUT_QUALITY_TARGET));
        const $set: Record<string, unknown> = { ...rest };
        const $unset: Record<string, "" | 1> | undefined = clearingTerminal
          ? { resultScore: "", tactic: "", appliedAt: "", error: "", proposedDescription: "" }
          : undefined;
        await db.collection(LISTING_QUALITY_RECOMMENDATIONS).updateOne(
          { id: rec.id },
          {
            $set,
            ...($unset ? { $unset } : {}),
            $setOnInsert: { createdAt: (existing?.createdAt as string | undefined) ?? createdAt },
          },
          { upsert: true },
        );
      }
    },

    async listOpenRecommendations(limit) {
      const rows = await db
        .collection(LISTING_QUALITY_RECOMMENDATIONS)
        .find({ status: "open" }, { projection: { _id: 0 } })
        .sort({ scoreBefore: 1, updatedAt: 1 })
        .limit(Math.max(1, limit))
        .toArray();
      const order = { high: 0, medium: 1, low: 2 } as const;
      return (rows as unknown as QualityRecommendation[]).sort(
        (a, b) => order[a.severity] - order[b.severity] || a.scoreBefore - b.scoreBefore,
      );
    },

    async listAppliedRecommendations(limit) {
      const rows = await db
        .collection(LISTING_QUALITY_RECOMMENDATIONS)
        .find({ status: "applied" }, { projection: { _id: 0 } })
        .sort({ appliedAt: -1, updatedAt: -1 })
        .limit(Math.max(1, limit))
        .toArray();
      return rows as unknown as QualityRecommendation[];
    },

    async markRecommendation(id, patch) {
      const { id: _ignore, createdAt: _c, ...rest } = patch as QualityRecommendation;
      await db.collection(LISTING_QUALITY_RECOMMENDATIONS).updateOne({ id }, { $set: { ...rest, updatedAt: new Date().toISOString() } });
    },

    async writeListingDescription(listingId, description, updatedAt) {
      await db.collection("listings").updateOne({ id: listingId, lifecycleState: "PUBLISHED" }, { $set: { description, updatedAt } });
    },

    async insertLesson(lesson) {
      await db.collection(LISTING_QUALITY_LESSONS).updateOne({ id: lesson.id }, { $set: lesson }, { upsert: true });
    },

    async listLessons(limit) {
      const rows = await db
        .collection(LISTING_QUALITY_LESSONS)
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(Math.max(1, limit))
        .toArray();
      return rows as unknown as QualityLesson[];
    },

    async countByStatus() {
      const rows = await db.collection(LISTING_QUALITY_RECOMMENDATIONS).aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray();
      const out: Partial<Record<QualityStatus, number>> = {};
      for (const row of rows) out[row._id as QualityStatus] = row.n as number;
      return out;
    },

    async listActionableOperatorFeedback(limit) {
      const bounded = Math.max(1, Math.min(limit, 100));
      const rows = await db
        .collection("card_feedback")
        .find(
          {
            scope: "card",
            sentiment: { $in: ["instruction", "negative"] },
            cardId: { $type: "string", $ne: "" },
          },
          { projection: { _id: 0, feedbackId: 1, cardId: 1, message: 1, sentiment: 1, createdAt: 1 } },
        )
        .sort({ createdAt: -1 })
        .limit(bounded * 3)
        .toArray();

      const hints: OperatorFeedbackHint[] = [];
      const seenListing = new Set<string>();
      for (const row of rows) {
        if (hints.length >= bounded) break;
        const cardId = String(row.cardId || "").trim();
        const feedbackId = String(row.feedbackId || "").trim();
        const sentiment = row.sentiment === "negative" ? "negative" : "instruction";
        if (!cardId || !feedbackId) continue;

        let listingId: string | null = null;
        const direct = await db.collection("listings").findOne(
          { id: cardId, lifecycleState: "PUBLISHED" },
          { projection: { _id: 0, id: 1 } },
        );
        if (direct?.id) {
          listingId = String(direct.id);
        } else {
          const card = await db.collection("content_cards").findOne(
            { id: cardId },
            { projection: { _id: 0, listingId: 1 } },
          );
          const linked = typeof card?.listingId === "string" ? card.listingId.trim() : "";
          if (linked) {
            const published = await db.collection("listings").findOne(
              { id: linked, lifecycleState: "PUBLISHED" },
              { projection: { _id: 0, id: 1 } },
            );
            if (published?.id) listingId = String(published.id);
          }
        }
        if (!listingId || seenListing.has(listingId)) continue;
        seenListing.add(listingId);
        hints.push({
          feedbackId,
          listingId,
          message: String(row.message || "").slice(0, 2000),
          sentiment,
          createdAt: String(row.createdAt || new Date(0).toISOString()),
        });
      }
      return hints;
    },
  };
}

/** In-memory store for unit tests. */
export function memoryListingQualityStore(
  seed: QualityListingSnapshot[] = [],
  feedbackSeed: OperatorFeedbackHint[] = [],
): ListingQualityStore {
  const listings = new Map(seed.map((s) => [s.id, { ...s }]));
  const recs = new Map<string, QualityRecommendation>();
  const lessons: QualityLesson[] = [];
  const feedback = [...feedbackSeed];

  return {
    async listPublishedSnapshots(limit) {
      return [...listings.values()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).slice(0, limit);
    },
    async getSnapshot(id) {
      return listings.get(id) ?? null;
    },
    async upsertRecommendations(rows) {
      for (const r of rows) {
        const prev = recs.get(r.id);
        if (prev && r.status === "open") {
          const softApplied =
            prev.status === "applied" &&
            prev.resultScore !== undefined &&
            prev.resultScore < ABOUT_QUALITY_TARGET;
          if ((prev.status === "applied" || prev.status === "failed") && !softApplied) {
            continue;
          }
        }
        const clearingTerminal =
          prev &&
          r.status === "open" &&
          (prev.status === "skipped" ||
            (prev.status === "applied" &&
              prev.resultScore !== undefined &&
              prev.resultScore < ABOUT_QUALITY_TARGET));
        const next: QualityRecommendation = {
          ...r,
          createdAt: prev?.createdAt ?? r.createdAt,
        };
        if (clearingTerminal) {
          delete next.resultScore;
          delete next.tactic;
          delete next.appliedAt;
          delete next.error;
          delete next.proposedDescription;
        }
        recs.set(r.id, next);
      }
    },
    async listOpenRecommendations(limit) {
      const order = { high: 0, medium: 1, low: 2 } as const;
      return [...recs.values()]
        .filter((r) => r.status === "open")
        .sort((a, b) => order[a.severity] - order[b.severity] || a.scoreBefore - b.scoreBefore)
        .slice(0, limit);
    },
    async listAppliedRecommendations(limit) {
      return [...recs.values()]
        .filter((r) => r.status === "applied")
        .sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || ""))
        .slice(0, limit);
    },
    async markRecommendation(id, patch) {
      const prev = recs.get(id);
      if (!prev) return;
      recs.set(id, { ...prev, ...patch, id, updatedAt: new Date().toISOString() });
    },
    async writeListingDescription(listingId, description, updatedAt) {
      const row = listings.get(listingId);
      if (!row) return;
      listings.set(listingId, { ...row, description, updatedAt });
    },
    async insertLesson(lesson) {
      lessons.unshift(lesson);
    },
    async listLessons(limit) {
      return lessons.slice(0, limit);
    },
    async countByStatus() {
      const out: Partial<Record<QualityStatus, number>> = {};
      for (const r of recs.values()) out[r.status] = (out[r.status] ?? 0) + 1;
      return out;
    },
    async listActionableOperatorFeedback(limit) {
      return feedback
        .filter((f) => listings.has(f.listingId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, Math.max(1, limit));
    },
  };
}
