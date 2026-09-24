/**
 * Shared fair-use helpers for the multi-source one-lead feeder.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const UA =
  "ClassScoutCatalogResearch/1.0 (+https://getyourfield.com; fair-use one-lead research)";

const DATA_DIR =
  process.env.RQK_DATA_DIR ||
  process.env.FAIR_USE_DATA_DIR ||
  path.join(__dirname, "..", "..", "data", "rqk-fair-use");

const SEEDS_PATH =
  process.env.CATALOG_FIND_SEEDS ||
  path.join(__dirname, "..", "..", "find-seeds.json");

function ensureDir(dir = DATA_DIR) {
  fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isBlocked(status, html) {
  return (
    status === 403 ||
    status === 429 ||
    /cf-browser-verification|just a moment|cdn-cgi\/challenge/i.test(String(html || ""))
  );
}

async function fetchPage(url, { accept = "text/html,application/xhtml+xml" } = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: accept,
      "Accept-Language": "en-US,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  let body = buf;
  const enc = (res.headers.get("content-encoding") || "").toLowerCase();
  if (enc.includes("gzip") || (buf[0] === 0x1f && buf[1] === 0x8b)) {
    try {
      body = zlib.gunzipSync(buf);
    } catch {
      body = buf;
    }
  }
  const text = body.toString("utf8").replace(/\0/g, "");
  return {
    status: res.status,
    html: text,
    finalUrl: res.url,
    blocked: isBlocked(res.status, text),
    headers: res.headers,
  };
}

async function checkRobotsAllowed(base) {
  const robotsUrl = String(base).replace(/\/$/, "") + "/robots.txt";
  try {
    const page = await fetchPage(robotsUrl, { accept: "text/plain,*/*" });
    if (page.status >= 400) return { ok: false, reason: `robots_http_${page.status}` };
    const body = page.html;
    if (
      /User-agent:\s*\*\s*\nDisallow:\s*\/\s*$/im.test(body) &&
      !/User-agent:\s*\*\s*\nAllow:\s*\//im.test(body)
    ) {
      return { ok: false, reason: "robots_star_disallow_all" };
    }
    return { ok: true, body };
  } catch (e) {
    return { ok: false, reason: `robots_error_${e.message || e}` };
  }
}

function emptySourceState(bootstrapQueue = []) {
  return {
    queue: [...bootstrapQueue],
    done: {},
    discoveryCursor: 0,
    leadsAdded: 0,
    discoveryRuns: 0,
    lastFetchAt: null,
    lastError: null,
  };
}

function migrateRootState(raw) {
  if (raw && raw.sources && typeof raw.sources === "object") {
    return raw;
  }
  // Legacy RQK-only state shape → wrap under sources.rqk
  if (raw && (raw.queue || raw.done)) {
    return {
      sources: {
        rqk: {
          queue: raw.queue || [],
          done: raw.done || {},
          discoveryCursor: raw.discoveryCursor || 0,
          leadsAdded: raw.leadsAdded || 0,
          discoveryRuns: raw.discoveryRuns || 0,
          lastFetchAt: raw.lastRqkFetchAt || null,
        },
      },
      passCount: 0,
      lastPassAt: null,
      lastRqkFetchAt: raw.lastRqkFetchAt || null,
    };
  }
  return { sources: {}, passCount: 0, lastPassAt: null };
}

function loadRootState() {
  ensureDir();
  const p = path.join(DATA_DIR, "state.json");
  try {
    return migrateRootState(JSON.parse(fs.readFileSync(p, "utf8")));
  } catch {
    return { sources: {}, passCount: 0, lastPassAt: null };
  }
}

function saveRootState(state) {
  ensureDir();
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(DATA_DIR, "state.json"), JSON.stringify(state, null, 2));
}

function getSourceState(root, sourceId, bootstrapQueue = []) {
  if (!root.sources[sourceId]) {
    root.sources[sourceId] = emptySourceState(bootstrapQueue);
  }
  const s = root.sources[sourceId];
  s.queue = [...new Set(s.queue || [])].filter((u) => !s.done[u]);
  return s;
}

function appendSeed(seed) {
  const doc = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
  doc.seeds = doc.seeds || [];
  if (
    doc.seeds.some(
      (s) =>
        s.id === seed.id ||
        (s.website && seed.website && String(s.website).replace(/\/$/, "") === String(seed.website).replace(/\/$/, ""))
    )
  ) {
    return { added: false, reason: "duplicate_seed" };
  }
  doc.seeds.push(seed);
  doc.updatedAt = new Date().toISOString();
  fs.writeFileSync(SEEDS_PATH, JSON.stringify(doc, null, 2) + "\n");
  return { added: true };
}

function inboxFilesForSource(sourceId) {
  const scoped = path.join(DATA_DIR, "inbox", sourceId);
  const flat = path.join(DATA_DIR, "inbox");
  const out = [];
  if (fs.existsSync(scoped)) {
    for (const f of fs.readdirSync(scoped)) {
      if (/\.html?$/i.test(f)) out.push(path.join(scoped, f));
    }
  }
  // Legacy flat inbox only applies to RQK
  if (sourceId === "rqk" && fs.existsSync(flat)) {
    for (const f of fs.readdirSync(flat)) {
      if (/\.html?$/i.test(f)) out.push(path.join(flat, f));
    }
  }
  return out.sort();
}

function writeLastLead(payload) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, "last-lead.json"), JSON.stringify(payload, null, 2));
}

module.exports = {
  UA,
  DATA_DIR,
  SEEDS_PATH,
  ensureDir,
  sleep,
  fetchPage,
  checkRobotsAllowed,
  loadRootState,
  saveRootState,
  migrateRootState,
  getSourceState,
  emptySourceState,
  appendSeed,
  inboxFilesForSource,
  writeLastLead,
};
