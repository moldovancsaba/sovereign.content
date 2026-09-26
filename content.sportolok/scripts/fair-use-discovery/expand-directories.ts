#!/usr/bin/env tsx
/**
 * Expand local-government + school-authority directories into sources.json
 *
 * Directories are the SSOT for *what to search*:
 *   directories/local-governments.json  — BP 23 kerületek + 25 MJV
 *   directories/school-authorities.json — KIR / SZIR / KK tankerületek
 *
 * This job turns verifiedPages (and optionally probed path hints) into
 * sources.json entries the one-pass crawler already understands.
 *
 * Usage:
 *   npm run fair-use:expand-directories
 *   npm run fair-use:expand-directories -- --dry-run
 *   npm run fair-use:expand-directories -- --probe --limit=20
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { politeFetch } from "./lib/common";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIR = __dirname;
const LOCAL_GOV_FILE = path.join(DIR, "directories", "local-governments.json");
const SCHOOL_AUTH_FILE = path.join(DIR, "directories", "school-authorities.json");
const SOURCES_FILE = path.join(DIR, "sources.json");
const REPORT_FILE = path.join(DIR, "data", "directory-expansion.json");

interface VerifiedPages {
  sport?: string[];
  schools?: string[];
}

interface GovEntry {
  id: string;
  kind: string;
  label: string;
  locality?: string;
  territory: string;
  officialWebsite: string;
  altWebsites?: string[];
  searchHints?: {
    sportPathSuffixes?: string[];
    schoolPathSuffixes?: string[];
  };
  verifiedPages?: VerifiedPages;
}

interface LocalGovDir {
  updatedAt: string;
  entries: GovEntry[];
}

interface Tankerulet {
  id: string;
  name: string;
  slug: string;
  url: string;
  territory: string;
}

interface SchoolAuthDir {
  updatedAt: string;
  registries: Array<{ id: string; name: string; searchUrl?: string; indexUrl?: string; publicDataUrl?: string }>;
  tankeruletek: Tankerulet[];
}

interface SourceEntry {
  id: string;
  name: string;
  url: string;
  cooldownSec: number;
  territory: string;
  activityTypes: string[];
  status: "planned" | "active" | "paused";
  fromDirectory?: string;
}

interface SourcesFile {
  updatedAt: string;
  description: string;
  defaultInterSourceSec: number;
  defaultPassSleepSec: number;
  defaultCooldownSec: number;
  sources: SourceEntry[];
}

function slugId(prefix: string, url: string): string {
  const u = new URL(url);
  const tail = (u.hostname.replace(/^www\./, "") + u.pathname)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${prefix}-${tail}`;
}

function candidateFromVerified(
  entry: GovEntry,
  kind: "sport" | "schools",
  url: string
): SourceEntry {
  const isSchool = kind === "schools";
  return {
    id: slugId(isSchool ? "schools" : "onkormanyzat", url),
    name: `${entry.label} — ${isSchool ? "iskolák" : "sport"}`,
    url,
    cooldownSec: isSchool ? 1200 : 900,
    territory: entry.territory,
    activityTypes: isSchool
      ? ["school-sport"]
      : ["various", "swimming", "football", "school-sport"],
    status: "active",
    fromDirectory: entry.id,
  };
}

async function probeUrl(url: string): Promise<boolean> {
  try {
    const res = await politeFetch(url, { method: "GET" });
    if (!res.ok) return false;
    const html = await res.text();
    // Reject soft-404 / empty shells
    if (html.length < 2000) return false;
    if (/nem elérhető|page not found|hiba 404/i.test(html) && html.length < 10000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function joinUrl(base: string, suffix: string): string {
  const b = base.replace(/\/$/, "");
  const s = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return b + s;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const probe = process.argv.includes("--probe");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 50;

  console.log("📂 Expand directories → sources.json");
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}${probe ? " + PROBE" : ""}`);

  const localGov: LocalGovDir = JSON.parse(fs.readFileSync(LOCAL_GOV_FILE, "utf-8"));
  const schoolAuth: SchoolAuthDir = JSON.parse(fs.readFileSync(SCHOOL_AUTH_FILE, "utf-8"));
  const sourcesFile: SourcesFile = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf-8"));

  const existingUrls = new Set(
    sourcesFile.sources.map((s) => s.url.replace(/\/$/, "").toLowerCase())
  );
  const existingIds = new Set(sourcesFile.sources.map((s) => s.id));

  const toAdd: SourceEntry[] = [];
  const skipped: Array<{ url: string; reason: string }> = [];
  const probedOk: string[] = [];
  const probedFail: string[] = [];

  const pushUnique = (entry: SourceEntry) => {
    const key = entry.url.replace(/\/$/, "").toLowerCase();
    if (existingUrls.has(key)) {
      skipped.push({ url: entry.url, reason: "already-in-sources" });
      return;
    }
    if (existingIds.has(entry.id)) {
      entry.id = `${entry.id}-${Math.abs(hash(entry.url)).toString(36).slice(0, 4)}`;
    }
    existingUrls.add(key);
    existingIds.add(entry.id);
    toAdd.push(entry);
  };

  // 1) Verified municipal / school pages from local-governments directory
  for (const entry of localGov.entries) {
    for (const url of entry.verifiedPages?.sport || []) {
      pushUnique(candidateFromVerified(entry, "sport", url));
    }
    for (const url of entry.verifiedPages?.schools || []) {
      pushUnique(candidateFromVerified(entry, "schools", url));
    }
  }

  // 2) Optional: probe path hints on official websites (polite, limited)
  if (probe) {
    let probes = 0;
    for (const entry of localGov.entries) {
      if (probes >= limit) break;
      const bases = [entry.officialWebsite, ...(entry.altWebsites || [])];
      const suffixes = [
        ...(entry.searchHints?.sportPathSuffixes || []).map((s) => ["sport", s] as const),
        ...(entry.searchHints?.schoolPathSuffixes || []).map((s) => ["schools", s] as const),
      ];
      for (const base of bases) {
        if (probes >= limit) break;
        for (const [kind, suffix] of suffixes) {
          if (probes >= limit) break;
          const url = joinUrl(base, suffix);
          const key = url.replace(/\/$/, "").toLowerCase();
          if (existingUrls.has(key)) continue;
          // Skip obviously host-mismatched city-specific paths
          if (
            /debreceni|gyor\/sport|miskolc|budapest13|bp16|hegyvidek|ujpest/i.test(suffix) &&
            !new URL(base).hostname.replace(/^www\./, "").includes(
              suffix.includes("debrecen")
                ? "debrecen"
                : suffix.includes("gyor")
                  ? "gyor"
                  : suffix.includes("miskolc")
                    ? "miskolc"
                    : suffix.includes("budapest13")
                      ? "budapest13"
                      : suffix.includes("bp16")
                        ? "bp16"
                        : suffix.includes("hegyvidek")
                          ? "hegyvidek"
                          : suffix.includes("ujpest")
                            ? "ujpest"
                            : "___"
            )
          ) {
            continue;
          }
          probes++;
          console.log(`   🔎 Probe [${probes}/${limit}] ${url}`);
          const ok = await probeUrl(url);
          if (!ok) {
            probedFail.push(url);
            continue;
          }
          probedOk.push(url);
          pushUnique({
            ...candidateFromVerified(entry, kind, url),
            status: "planned",
            name: `${entry.label} — ${kind === "schools" ? "iskolák (probed)" : "sport (probed)"}`,
          });
          // polite gap between probes
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  }

  // 3) Tankerületek stay in school-authorities.json (directory SSOT).
  //    Only promote into sources.json when explicitly requested — pages need a
  //    dedicated extractor before one-pass should crawl them.
  const includeTankeruletek = process.argv.includes("--include-tankeruletek");
  if (includeTankeruletek) {
    for (const tk of schoolAuth.tankeruletek) {
      pushUnique({
        id: tk.id,
        name: tk.name,
        url: tk.url,
        cooldownSec: 1800,
        territory: tk.territory || "HUN",
        activityTypes: ["school-sport"],
        status: "paused",
        fromDirectory: "kk-tankeruletek-index",
      });
    }
  } else {
    console.log(
      `   ℹ️  ${schoolAuth.tankeruletek.length} tankerületek kept in school-authorities.json (pass --include-tankeruletek to copy as paused sources)`
    );
  }

  // 4) Registry bookmarks (not crawled as HTML lists — documented for agents)
  const registryBookmarks = schoolAuth.registries.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.searchUrl || r.indexUrl || r.publicDataUrl || "",
  }));

  const report = {
    updatedAt: new Date().toISOString(),
    dryRun,
    probe,
    directoryCounts: {
      localGovernments: localGov.entries.length,
      tankeruletek: schoolAuth.tankeruletek.length,
      registries: schoolAuth.registries.length,
    },
    wouldAdd: toAdd.length,
    byStatus: {
      active: toAdd.filter((s) => s.status === "active").length,
      planned: toAdd.filter((s) => s.status === "planned").length,
    },
    probedOk,
    probedFail: probedFail.slice(0, 50),
    skippedAlready: skipped.filter((s) => s.reason === "already-in-sources").length,
    addedIds: toAdd.map((s) => s.id),
    registryBookmarks,
  };

  console.log(`\n📊 Would add ${toAdd.length} sources (${report.byStatus.active} active, ${report.byStatus.planned} planned)`);
  console.log(`   Already present: ${report.skippedAlready}`);
  if (probe) {
    console.log(`   Probed OK: ${probedOk.length} · fail: ${probedFail.length}`);
  }

  if (!dryRun && toAdd.length) {
    sourcesFile.sources.push(...toAdd);
    sourcesFile.updatedAt = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(SOURCES_FILE, JSON.stringify(sourcesFile, null, 2) + "\n");
    console.log(`💾 Wrote ${SOURCES_FILE}`);
  }

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + "\n");
  console.log(`💾 Report ${REPORT_FILE}`);
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
