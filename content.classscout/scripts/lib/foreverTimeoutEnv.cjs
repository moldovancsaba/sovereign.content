/**
 * Env flag refs for `npm run docs:flags` — bash forever scripts also read these.
 * Hang / “clock freeze” guards: rule 455 · docs/catalog-loop-error-playbook.md §3.1
 */
void process.env.CATALOG_STEP_TIMEOUT_IMPROVE;
void process.env.CATALOG_STEP_TIMEOUT_FIND;
void process.env.CATALOG_STEP_TIMEOUT_RECLASSIFY;
void process.env.CATALOG_STEP_TIMEOUT_DEFAULT;
void process.env.FAIR_USE_PASS_TIMEOUT_SEC;
void process.env.CATALOG_MONGO_CONNECT_MS;
void process.env.CATALOG_MONGO_SERVER_SELECTION_MS;
void process.env.CATALOG_MONGO_SOCKET_MS;
