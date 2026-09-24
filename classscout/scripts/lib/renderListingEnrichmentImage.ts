/**
 * Render listing enrichment artwork at 1200×800 (4× the 300×200 card frame on each side).
 *
 * Used by Find when the official page has no usable photograph — the same generated listing art
 * parents already see on cards (provider own photos stay off by default), sized for ingest upload.
 *
 * CLI:
 *   npx tsx scripts/catalog-loop/lib/renderListingEnrichmentImage.ts \
 *     --out /tmp/art.png --seed ID --category Classes --activities Dance,Ballet --name "Studio"
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { listingBackgroundSvg } from "@/lib/media/listingThumbnail";

/** Card frame is 300×200 (3:2). Enrichment upload uses 4× linear → 16× area. */
export const LISTING_ENRICH_IMAGE_WIDTH = 1200;
export const LISTING_ENRICH_IMAGE_HEIGHT = 800;

export interface ListingEnrichmentImageInput {
  seed: string;
  name?: string;
  category?: string;
  activities?: string[];
  /** `"card"` (light) for ingest placeholders; `"hero"` for dark detail-style art. */
  variant?: "card" | "hero";
}

export async function renderListingEnrichmentPng(input: ListingEnrichmentImageInput): Promise<Buffer> {
  const activities = (input.activities || []).map((a) => String(a).trim()).filter(Boolean);
  const svg = listingBackgroundSvg({
    seed: input.seed,
    activities,
    category: input.category || "Classes",
    entityType: "provider",
    width: LISTING_ENRICH_IMAGE_WIDTH,
    height: LISTING_ENRICH_IMAGE_HEIGHT,
    variant: input.variant || "card",
    watermark: true,
    alt: input.name || activities.join(", ") || "Listing",
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--") && i + 1 < argv.length) {
      out[a.slice(2)] = argv[++i];
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.seed || !args.out) {
    console.error("Usage: --seed ID --out path.png [--category Classes] [--activities a,b] [--name Name] [--variant card|hero]");
    process.exit(2);
  }
  const buf = await renderListingEnrichmentPng({
    seed: args.seed,
    name: args.name,
    category: args.category,
    activities: args.activities ? args.activities.split(",").map((s) => s.trim()).filter(Boolean) : [],
    variant: args.variant === "hero" ? "hero" : "card",
  });
  writeFileSync(args.out, buf);
  process.stdout.write(JSON.stringify({
    ok: true,
    out: args.out,
    bytes: buf.length,
    width: LISTING_ENRICH_IMAGE_WIDTH,
    height: LISTING_ENRICH_IMAGE_HEIGHT,
  }) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
