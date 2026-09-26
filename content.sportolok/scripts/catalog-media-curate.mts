/**
 * QUARANTINED entrypoint — does not open Mongo.
 * Legacy: ./legacy-mongo/catalog-media-curate.mts
 * Allowed path: ./catalog-media-curate-ingest.ts
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";
refuseAgentMongo("catalog-media-curate.mts");
