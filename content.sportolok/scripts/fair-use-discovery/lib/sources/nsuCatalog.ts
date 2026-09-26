/**
 * NSÜ (Nemzeti Sportügynökség) full facility catalog via WordPress REST API.
 * Covers all CPT categories: uszodak, tanuszodak, sportletesitmenyek,
 * olimpiai-kozpontok, egeszsegkozpont, sportmuzeum — not pools only.
 */
import type { SourceConfig, Candidate } from "../common";
import { politeFetch } from "../common";
import type { ProcessResult } from "./genericDirectory";

const NSU_API =
  "https://nsu.hu/wp-json/wp/v2/letesitmeny?per_page=100&_fields=id,link,title,class_list";

const CATEGORY_ACTIVITY: Record<string, string> = {
  "category-uszodak": "swimming",
  "category-tanuszodak": "swimming",
  "category-sportletesitmenyek": "various",
  "category-olimpiai-kozpont": "various",
  "category-egeszsegkozpont": "fitness",
  "category-sportmuzeum": "various",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .trim();
}

function activityFromClasses(classes: string[], title: string, allowed: string[]): string {
  const t = title.toLowerCase();
  // Title-specific beats coarse category when we can tell
  const titleMap: Array<[RegExp, string]> = [
    [/uszoda|tanuszoda|strand|fürdő|medence/, "swimming"],
    [/kézilabda|kezilabda|munkacsarnok/, "handball"],
    [/kajak|kenu|evez|vízisport|vizisport/, "water-sports"],
    [/jég|jegcsarnok|jégcsarnok|korcsolya/, "ice-sports"],
    [/stadion|futball|labdarúg/, "football"],
    [/tenisz/, "tennis"],
    [/edzőtábor|olimpiai központ/, "training-camp"],
    [/egészségközpont|fitness/, "fitness"],
  ];
  for (const [re, act] of titleMap) {
    if (re.test(t) && (allowed.includes(act) || allowed.includes("various"))) {
      return act;
    }
  }
  for (const c of classes) {
    if (CATEGORY_ACTIVITY[c]) {
      const mapped = CATEGORY_ACTIVITY[c];
      if (allowed.includes(mapped) || allowed.includes("various")) return mapped;
    }
  }
  return allowed.includes("various") ? "various" : allowed[0] || "various";
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

type WpRow = {
  id: number;
  link: string;
  title?: { rendered?: string };
  class_list?: string[];
};

/**
 * Process NSÜ catalog — one API "page" yields all facility types.
 */
export async function processNsuCatalog(
  source: SourceConfig,
  dryRun = false
): Promise<ProcessResult> {
  console.log(`🏟️  NSÜ full catalog: ${source.name}`);
  try {
    if (dryRun) {
      console.log(`   [DRY RUN] Would fetch: ${NSU_API}`);
      return { sourceId: source.id, success: true, candidates: [] };
    }

    const res = await politeFetch(NSU_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = (await res.json()) as WpRow[];
    console.log(`   ✓ API returned ${rows.length} facilities`);

    const candidates: Candidate[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      const title = decodeEntities(row.title?.rendered || "");
      const link = row.link;
      if (!title || title.length < 4 || !link) continue;
      if (seen.has(link)) continue;
      seen.add(link);

      const classes = row.class_list || [];
      const categories = classes.filter((c) => c.startsWith("category-"));
      // Soft-skip pure museum unless explicitly allowed — still include as venue catalog
      const activityType = activityFromClasses(classes, title, source.activityTypes);

      candidates.push({
        seedId: `seed-hun-${simpleHash(title + link)}`,
        sourceId: source.id,
        discoveryUrl: link,
        territory: source.territory,
        activityType,
        title,
        address: undefined, // filled by deepen on /letesitmeny/ detail
        contact: {},
        extractedFacts: {
          hasPhone: false,
          hasEmail: false,
          hasAddress: false,
          nsuCategories: categories,
          nsuPostId: row.id,
          from: "nsu-wp-api",
        },
        confidence: "medium",
        discoveredAt: new Date().toISOString(),
      });
    }

    console.log(`   ✓ Mapped ${candidates.length} candidates (all NSÜ venue types)`);
    return { sourceId: source.id, success: true, candidates };
  } catch (error: any) {
    console.error(`   ✗ NSÜ catalog error:`, error.message);
    return {
      sourceId: source.id,
      success: false,
      candidates: [],
      error: error.message,
    };
  }
}
