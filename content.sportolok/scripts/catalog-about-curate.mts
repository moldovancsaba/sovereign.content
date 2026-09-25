/**
 * QUARANTINED entrypoint — does not open Mongo.
 * Legacy: ./legacy-mongo/catalog-about-curate.mts
 * Allowed path: ./catalog-about-curate-ingest.ts
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";
refuseAgentMongo("catalog-about-curate.mts");
