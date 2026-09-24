/**
 * Durable catalog-loop paths. Prefer CATALOG_LOOP_DATA_DIR; default to
 * scripts/catalog-loop/data (gitignored runtime state). Falls back to /tmp only
 * when explicitly requested via CATALOG_LOOP_USE_TMP=1.
 */
const fs = require("fs");
const path = require("path");

const SCRIPT_DIR = path.join(__dirname, "..");
const USE_TMP = process.env.CATALOG_LOOP_USE_TMP === "1";
const DATA_DIR =
  process.env.CATALOG_LOOP_DATA_DIR ||
  (USE_TMP ? "/tmp" : path.join(SCRIPT_DIR, "data"));

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

ensureDir(DATA_DIR);
ensureDir(path.join(DATA_DIR, "feedback"));
ensureDir(path.join(DATA_DIR, "digests"));

const STATE_PATH = process.env.CATALOG_LOOP_STATE || path.join(DATA_DIR, "state.json");
const EVENTS_PATH = process.env.CATALOG_LOOP_EVENTS || path.join(DATA_DIR, "events.jsonl");
const FEEDBACK_DIR = process.env.CATALOG_LOOP_FEEDBACK_DIR || path.join(DATA_DIR, "feedback");
const DIGESTS_DIR = path.join(DATA_DIR, "digests");
const QUALITY_HOURLY_PATH = path.join(DATA_DIR, "quality-hourly.json");
const RECOMMENDATIONS_PATH =
  process.env.CATALOG_LOOP_RECOMMENDATIONS || path.join(DATA_DIR, "recommendations.json");
const FIND_LOG = path.join(DATA_DIR, "find-cycle-last.json");
const WATCH_LOG = path.join(DATA_DIR, "reclassify-watch-last.json");
const IMPROVE_LOG = path.join(DATA_DIR, "improve-cycle-last.json");
const APPLY_LOG = path.join(DATA_DIR, "apply-last.json");
const SCARCITY_BRIEF_PATH =
  process.env.CATALOG_SCARCITY_BRIEF || path.join(DATA_DIR, "scarcity-research-brief.json");
const SEEDS_PATH =
  process.env.CATALOG_FIND_SEEDS || path.join(SCRIPT_DIR, "find-seeds.json");
const LESSONS_PATH = path.join(SCRIPT_DIR, "lessons.json");

/** Migrate ephemeral /tmp state once when durable file is missing. */
function migrateTmpStateIfNeeded() {
  if (USE_TMP) return;
  if (fs.existsSync(STATE_PATH)) return;
  const tmp = "/tmp/catalog-loop-state.json";
  if (fs.existsSync(tmp)) {
    try {
      fs.copyFileSync(tmp, STATE_PATH);
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  SCRIPT_DIR,
  DATA_DIR,
  STATE_PATH,
  EVENTS_PATH,
  FEEDBACK_DIR,
  DIGESTS_DIR,
  QUALITY_HOURLY_PATH,
  RECOMMENDATIONS_PATH,
  FIND_LOG,
  WATCH_LOG,
  IMPROVE_LOG,
  APPLY_LOG,
  SCARCITY_BRIEF_PATH,
  SEEDS_PATH,
  LESSONS_PATH,
  ensureDir,
  migrateTmpStateIfNeeded,
};
