/**
 * Agent-home scripts must not open shared Mongo — even if MONGODB_URI is present.
 */
export function refuseAgentMongo(scriptName: string): never {
  throw new Error(
    `[QUARANTINE] ${scriptName} refused: content.sportolok agent home must not open Mongo. ` +
      `Use ingest-backed scripts (catalog-about-curate-ingest / catalog-media-curate-ingest / ` +
      `catalog-quality-loop-ingest / fair-use:enrich) + ingest/client.ts (POST /api/ingest). ` +
      `See src/QUARANTINE.md and fleet/RULES.md.`,
  );
}

export function exitIfMongoEnv(scriptName: string): void {
  if (process.env.MONGODB_URI || process.env.ALLOW_AGENT_MONGO === "1") {
    if (process.env.ALLOW_AGENT_MONGO === "1" && process.env.SOVEREIGN_CORE_OVERRIDE === "1") {
      console.error(
        JSON.stringify({
          warning: "SOVEREIGN_CORE_OVERRIDE set — Mongo allowed for this process only",
          scriptName,
        }),
      );
      return;
    }
    console.error(
      JSON.stringify({
        error: "agent_mongo_refused",
        scriptName,
        hint: "Unset MONGODB_URI; use INGEST_API_KEY + ingest path",
      }),
    );
    process.exit(2);
  }
}
