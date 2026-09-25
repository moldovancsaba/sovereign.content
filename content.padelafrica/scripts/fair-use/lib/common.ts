/**
 * Shared fair-use helpers — polite fetch, multi-source state, candidate append.
 * Never opens Mongo. Runtime state lives under scripts/fair-use/data/ (gitignored).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  readdirSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const FAIR_USE_ROOT = resolve(__dirname, "..");
export const DATA_DIR =
  process.env.FAIR_USE_DATA_DIR || join(FAIR_USE_ROOT, "data");
export const CANDIDATES_PATH = join(DATA_DIR, "candidates.json");
export const EVENTS_PATH = join(DATA_DIR, "events.jsonl");
export const STATE_PATH = join(DATA_DIR, "state.json");
export const SOURCES_PATH = join(FAIR_USE_ROOT, "sources.json");

export const DEFAULT_UA =
  "PadelAfricaCatalogResearch/1.0 (+https://padel-africa.doneisbetter.com; fair-use one-lead research)";

export type SourceMeta = {
  id: string;
  name: string;
  kind: string;
  base: string;
  cooldownSec?: number;
  discoveryPages: string[];
  detailHrefPatterns?: string[];
  notes?: string;
};

export type Registry = {
  updatedAt: string;
  description: string;
  defaultInterSourceSec: number;
  defaultPassSleepSec: number;
  defaultCooldownSec: number;
  userAgent: string;
  sources: SourceMeta[];
};

export type SourceState = {
  queue: string[];
  done: Record<string, { at: string; reason?: string; reasonCode?: string }>;
  discoveryCursor: number;
  leadsAdded: number;
  lastFetchAt: string | null;
  lastError: { at: string; url: string; reasonCode: string } | null;
};

export type RootState = {
  sources: Record<string, SourceState>;
  passCount: number;
  lastPassAt: string | null;
};

export type FairUseCandidate = {
  candidateId: string;
  sourceId: string;
  sourceName: string;
  name: string;
  citationUrl: string;
  website: string;
  cityHint?: string;
  countryHint?: string;
  addressHint?: string;
  researchSources: string[];
  researchNote: string;
  status: "needs_verify";
  extractedAt: string;
};

export function ensureDataDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(join(DATA_DIR, "inbox"), { recursive: true });
  mkdirSync(join(DATA_DIR, "processed"), { recursive: true });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function loadRegistry(): Registry {
  return JSON.parse(readFileSync(SOURCES_PATH, "utf8")) as Registry;
}

export function emptySourceState(bootstrapQueue: string[] = []): SourceState {
  return {
    queue: [...bootstrapQueue],
    done: {},
    discoveryCursor: 0,
    leadsAdded: 0,
    lastFetchAt: null,
    lastError: null,
  };
}

export function loadRootState(): RootState {
  ensureDataDir();
  if (!existsSync(STATE_PATH)) {
    return { sources: {}, passCount: 0, lastPassAt: null };
  }
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as RootState;
  } catch {
    return { sources: {}, passCount: 0, lastPassAt: null };
  }
}

export function saveRootState(state: RootState): void {
  ensureDataDir();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

export function getSourceState(
  root: RootState,
  sourceId: string,
  bootstrapQueue: string[] = [],
): SourceState {
  if (!root.sources[sourceId]) {
    root.sources[sourceId] = emptySourceState(bootstrapQueue);
  }
  return root.sources[sourceId];
}

export function cooldownRemainingSec(
  source: SourceMeta,
  srcState: SourceState,
  defaultCooldown: number,
): number {
  if (!srcState.lastFetchAt) return 0;
  const cool = source.cooldownSec ?? defaultCooldown;
  const elapsed = (Date.now() - Date.parse(srcState.lastFetchAt)) / 1000;
  return elapsed >= cool ? 0 : Math.ceil(cool - elapsed);
}

function isBlocked(status: number, html: string): boolean {
  return (
    status === 403 ||
    status === 429 ||
    /cf-browser-verification|just a moment|cdn-cgi\/challenge|attention required/i.test(
      String(html || ""),
    )
  );
}

export async function fetchPage(
  url: string,
  ua: string,
  { accept = "text/html,application/xhtml+xml" }: { accept?: string } = {},
): Promise<{
  status: number;
  html: string;
  finalUrl: string;
  blocked: boolean;
}> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": ua,
      Accept: accept,
      "Accept-Language": "en,fr,es;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  let body: Buffer = buf;
  const enc = (res.headers.get("content-encoding") || "").toLowerCase();
  if (enc.includes("gzip") || (buf[0] === 0x1f && buf[1] === 0x8b)) {
    try {
      body = gunzipSync(buf);
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
  };
}

export function emitEvent(event: Record<string, unknown>): void {
  ensureDataDir();
  appendFileSync(
    EVENTS_PATH,
    JSON.stringify({ at: new Date().toISOString(), ...event }) + "\n",
  );
}

export function loadCandidates(): FairUseCandidate[] {
  ensureDataDir();
  if (!existsSync(CANDIDATES_PATH)) return [];
  try {
    return JSON.parse(readFileSync(CANDIDATES_PATH, "utf8")) as FairUseCandidate[];
  } catch {
    return [];
  }
}

export function appendCandidate(candidate: FairUseCandidate): boolean {
  const all = loadCandidates();
  if (
    all.some(
      (c) =>
        c.candidateId === candidate.candidateId ||
        (c.website &&
          candidate.website &&
          hostOf(c.website) === hostOf(candidate.website) &&
          c.name.toLowerCase() === candidate.name.toLowerCase()),
    )
  ) {
    return false;
  }
  all.push(candidate);
  writeFileSync(CANDIDATES_PATH, JSON.stringify(all, null, 2) + "\n");
  return true;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function slugifyId(name: string): string {
  return String(name || "unknown")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

export function inboxFilesForSource(sourceId: string): string[] {
  const dir = join(DATA_DIR, "inbox", sourceId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.html?$/i.test(f))
    .map((f) => join(dir, f))
    .sort();
}

export function pendingCandidateCount(): number {
  return loadCandidates().filter((c) => c.status === "needs_verify").length;
}
