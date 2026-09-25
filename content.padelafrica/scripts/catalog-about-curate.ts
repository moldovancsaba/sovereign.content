/**
 * QUARANTINED entrypoint — does not open Mongo.
 * Legacy implementation: ./legacy-mongo/catalog-about-curate.ts
 * Allowed path: ./catalog-quality-loop-ingest.ts + ../ingest/client.ts
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";

refuseAgentMongo("catalog-about-curate.ts");
