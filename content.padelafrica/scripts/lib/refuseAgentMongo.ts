/**
 * Agent-home scripts must not open shared Mongo — even if MONGODB_URI is present.
 * Import and call at the top of `main()` for any legacy catalog:* CLI copy.
 */
export function refuseAgentMongo(scriptName: string): never {
  throw new Error(
    `[QUARANTINE] ${scriptName} refused: content.padelafrica agent home must not open Mongo. ` +
      `Use scripts/catalog-quality-loop-ingest.ts + ingest/client.ts (POST /api/ingest). ` +
      `See src/QUARANTINE.md and fleet/RULES.md.`,
  );
}

/** Call when a script still documents MONGODB_URI — exits nonzero with JSON. */
export function exitIfMongoEnv(scriptName: string): void {
  if (process.env.MONGODB_URI || process.env.ALLOW_AGENT_MONGO === "1") {
    // Even ALLOW is refused unless explicitly overridden for emergency core debugging.
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
