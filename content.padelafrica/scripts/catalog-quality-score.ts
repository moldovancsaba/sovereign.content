/**
 * QUARANTINED entrypoint — does not open Mongo.
 * Legacy implementation: ./legacy-mongo/catalog-quality-score.ts
 * Allowed path: ./catalog-quality-loop-ingest.ts + ../ingest/client.ts
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";

refuseAgentMongo("catalog-quality-score.ts");
