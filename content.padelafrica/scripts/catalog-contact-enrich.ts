/**
 * QUARANTINED entrypoint — does not open Mongo.
 * Legacy implementation: ./legacy-mongo/catalog-contact-enrich.ts
 * Allowed path: ./catalog-quality-loop-ingest.ts + ../ingest/client.ts
 */
import { refuseAgentMongo } from "./lib/refuseAgentMongo.ts";

refuseAgentMongo("catalog-contact-enrich.ts");
