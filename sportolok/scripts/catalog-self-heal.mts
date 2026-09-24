/**
 * Agent-owned catalog status (no in-app LLM).
 *
 *   MONGODB_URI=... MONGODB_DB=sportolok node scripts/agent-catalog-status.mjs
 */
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required");
  process.exit(1);
}
const dbName = process.env.MONGODB_DB || "sportolok";

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const listings = db.collection("listings");

const cardFeedback = db.collection("card_feedback");

const [
  total,
  published,
  reviewReady,
  withMedia,
  emptyMedia,
  emptyMediaWithWebsite,
  thinDescription,
  cardsByState,
  unprocessedFeedback,
] = await Promise.all([
  listings.countDocuments({}),
  listings.countDocuments({ lifecycleState: "PUBLISHED" }),
  listings.countDocuments({ lifecycleState: "REVIEW_READY" }),
  listings.countDocuments({ "media.0": { $exists: true } }),
  listings.countDocuments({ $or: [{ media: { $exists: false } }, { media: { $size: 0 } }] }),
  listings.countDocuments({
    $and: [
      { website: { $regex: "^https?://" } },
      { $or: [{ media: { $exists: false } }, { media: { $size: 0 } }] },
    ],
  }),
  listings.countDocuments({
    $or: [
      { description: { $exists: false } },
      { description: null },
      { description: "" },
      { description: { $regex: "^.{0,80}$" } },
    ],
  }),
  db
    .collection("content_cards")
    .aggregate([{ $group: { _id: "$state", n: { $sum: 1 } } }, { $sort: { n: -1 } }])
    .toArray(),
  cardFeedback.countDocuments({ processedAt: { $exists: false } }),
]);

const needsWork = await listings
  .find(
    {
      lifecycleState: { $in: ["PUBLISHED", "REVIEW_READY"] },
      $or: [
        { media: { $size: 0 } },
        { description: { $exists: false } },
        { description: null },
        { description: "" },
        { description: { $regex: "^.{0,80}$" } },
      ],
    },
    {
      projection: {
        _id: 0,
        id: 1,
        name: 1,
        website: 1,
        lifecycleState: 1,
        media: 1,
        description: 1,
        city: 1,
      },
    },
  )
  .sort({ updatedAt: 1 })
  .limit(20)
  .toArray();

// Fetch latest unprocessed feedback
const latestFeedback = await cardFeedback
  .find({ processedAt: { $exists: false } })
  .sort({ createdAt: -1 })
  .limit(5)
  .toArray();

const report = {
  db: dbName,
  totals: {
    total,
    published,
    reviewReady,
    withMedia,
    emptyMedia,
    emptyMediaWithWebsite,
    thinDescription,
    unprocessedFeedback,
  },
  openOperatorFeedback: latestFeedback.map((f: any) => ({
    feedbackId: f.feedbackId,
    scope: f.scope,
    sentiment: f.sentiment,
    message: f.message.slice(0, 100) + (f.message.length > 100 ? "..." : ""),
    cardId: f.cardId || null,
    createdAt: f.createdAt,
  })),
  contentCards: Object.fromEntries(cardsByState.map((r) => [r._id ?? "null", r.n])),
  nextWork: needsWork.map((d) => ({
    id: d.id,
    name: d.name,
    lifecycleState: d.lifecycleState,
    city: d.city,
    website: d.website || null,
    mediaCount: Array.isArray(d.media) ? d.media.length : 0,
    descriptionLen: typeof d.description === "string" ? d.description.length : 0,
  })),
};

console.log(JSON.stringify(report, null, 2));
await client.close();
