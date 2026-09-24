/**
 * Fair-use source registry.
 */
const rqk = require("./rqk.cjs");
const sprout = require("./sprout.cjs");
const kidclick = require("./kidclick.cjs");
const mommyPoppins = require("./mommy-poppins.cjs");
const activityHero = require("./activity-hero.cjs");
const brooklynBridgeParents = require("./brooklyn-bridge-parents.cjs");
const parkSlopeParents = require("./park-slope-parents.cjs");
const beakid = require("./beakid.cjs");
const amazinkids = require("./amazinkids.cjs");
const newYorkLovesKids = require("./new-york-loves-kids.cjs");
const timeoutNyKids = require("./timeout-ny-kids.cjs");
const tinyout = require("./tinyout.cjs");
const macaroniKidBrooklynNw = require("./macaroni-kid-brooklyn-nw.cjs");
const uptownFamilyCalendar = require("./uptown-family-calendar.cjs");
const beyondCamps = require("./beyond-camps.cjs");
const classcubSwimNyc = require("./classcub-swim-nyc.cjs");
const discoverDycd = require("./discover-dycd.cjs");
const ymcaNyc = require("./ymca-nyc.cjs");
const nycParksRecreation = require("./nyc-parks-recreation.cjs");
const newYorkFamilyDirectory = require("./new-york-family-directory.cjs");
const acesGuide = require("./aces-guide.cjs");
const campmatchNy = require("./campmatch-ny.cjs");
const kidsOutAndAboutQueens = require("./kids-out-and-about-queens.cjs");
const growingUpNyc = require("./growing-up-nyc.cjs");
const goldfishSwimLocations = require("./goldfish-swim-locations.cjs");
const littleGymNy = require("./little-gym-ny.cjs");
const soccerStarsNyc = require("./soccer-stars-nyc.cjs");
const brooklynArborDirectory = require("./brooklyn-arbor-directory.cjs");
const jccManhattanPrograms = require("./jcc-manhattan-programs.cjs");
const asphaltGreen = require("./asphalt-green.cjs");
const classcubNycCategories = require("./classcub-nyc-categories.cjs");

const ALL = [
  rqk,
  mommyPoppins,
  sprout,
  kidclick,
  activityHero,
  brooklynBridgeParents,
  parkSlopeParents,
  beakid,
  amazinkids,
  newYorkLovesKids,
  timeoutNyKids,
  tinyout,
  macaroniKidBrooklynNw,
  uptownFamilyCalendar,
  beyondCamps,
  classcubSwimNyc,
  discoverDycd,
  ymcaNyc,
  nycParksRecreation,
  newYorkFamilyDirectory,
  acesGuide,
  campmatchNy,
  kidsOutAndAboutQueens,
  growingUpNyc,
  goldfishSwimLocations,
  littleGymNy,
  soccerStarsNyc,
  brooklynArborDirectory,
  jccManhattanPrograms,
  asphaltGreen,
  classcubNycCategories,
];

const BY_ID = Object.fromEntries(ALL.map((s) => [s.id, s]));

const REGISTRY_PATH = require("path").join(__dirname, "..", "..", "sources.json");

function loadRegistryMeta() {
  try {
    return JSON.parse(require("fs").readFileSync(REGISTRY_PATH, "utf8"));
  } catch {
    return { defaultCooldownSec: 300, sources: [] };
  }
}

function sourceCooldownSec(source) {
  if (source && typeof source.cooldownSec === "number" && source.cooldownSec > 0) {
    return source.cooldownSec;
  }
  const reg = loadRegistryMeta();
  const row = (reg.sources || []).find((s) => s && s.id === source.id);
  if (row && typeof row.cooldownSec === "number" && row.cooldownSec > 0) return row.cooldownSec;
  return Number(reg.defaultCooldownSec || process.env.FAIR_USE_DEFAULT_COOLDOWN_SEC || 300);
}

/** Seconds remaining before source may fetch again (0 = ready). */
function sourceCooldownRemainingSec(source, srcState, nowMs = Date.now()) {
  const cooldown = sourceCooldownSec(source);
  const last = srcState && srcState.lastFetchAt ? Date.parse(srcState.lastFetchAt) : 0;
  if (!last || !Number.isFinite(last)) return 0;
  const elapsed = (nowMs - last) / 1000;
  return Math.max(0, Math.ceil(cooldown - elapsed));
}

function loadEnabledSources() {
  const raw = process.env.FAIR_USE_SOURCES || "";
  const list = !raw.trim()
    ? ALL
    : raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((id) => BY_ID[id])
        .filter(Boolean);
  if (raw.trim()) {
    const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const unknown = ids.filter((id) => !BY_ID[id]);
    if (unknown.length) {
      console.warn(
        JSON.stringify({
          ok: false,
          warning: "fair_use_sources_not_delivered",
          dropped: unknown,
          note: "Ids in FAIR_USE_SOURCES with no adapter under lib/sources/ were dropped.",
        })
      );
    }
  }
  const reg = loadRegistryMeta();
  return list.map((s) => {
    const row = (reg.sources || []).find((r) => r && r.id === s.id);
    const cooldownSec = sourceCooldownSec({
      ...s,
      cooldownSec: (row && row.cooldownSec) || s.cooldownSec,
    });
    return { ...s, cooldownSec };
  });
}

module.exports = {
  ALL,
  BY_ID,
  loadEnabledSources,
  loadRegistryMeta,
  sourceCooldownSec,
  sourceCooldownRemainingSec,
};
