/**
 * QUARANTINED entrypoint — does not open Mongo.
 * Legacy implementation: ./legacy-mongo/catalog-quality-encode.ts
 * Allowed path: ./catalog-quality-loop-ingest.ts + ../ingest/client.ts
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";

refuseAgentMongo("catalog-quality-encode.ts");
