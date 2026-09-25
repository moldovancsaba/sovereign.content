/**
 * Shared Mongo client options for catalog-loop runners.
 * Unbounded socket waits freeze forever.sh (outer loop has no progress clock).
 * Observed 2026-09-24/25: Mongo `write ETIMEDOUT` during Improve deep-enrich
 * left the loop quiet for ~6h until the child finally returned.
 */
function catalogMongoOptions(extra = {}) {
  return {
    serverSelectionTimeoutMS: Number(process.env.CATALOG_MONGO_SERVER_SELECTION_MS || 15_000),
    connectTimeoutMS: Number(process.env.CATALOG_MONGO_CONNECT_MS || 15_000),
    socketTimeoutMS: Number(process.env.CATALOG_MONGO_SOCKET_MS || 60_000),
    ...extra,
  };
}

module.exports = { catalogMongoOptions };
