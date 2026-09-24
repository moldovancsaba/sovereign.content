/**
 * Find-cycle helper: when an official page has no photograph, render the generated listing art at
 * 1200×800 (4× the 300×200 card frame) and return a PNG buffer for /api/ingest/upload.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const RENDER_TS = path.join(__dirname, "renderListingEnrichmentImage.ts");

/**
 * @param {{ id: string, name?: string, category?: string, activityTypes?: string[] }} seed
 * @returns {{ buf: Buffer, ext: string, generated: true }}
 */
function renderGeneratedListingImage(seed) {
  const tmp = path.join(os.tmpdir(), `cs-enrich-${seed.id}-${Date.now()}.png`);
  const args = [
    "tsx",
    RENDER_TS,
    "--out",
    tmp,
    "--seed",
    seed.id,
    "--category",
    seed.category || "Classes",
    "--activities",
    (seed.activityTypes || []).join(","),
    "--name",
    seed.name || seed.id,
    "--variant",
    "card",
  ];
  const r = spawnSync("npx", args, {
    cwd: path.join(__dirname, "..", "..", ".."),
    encoding: "utf8",
    timeout: 60000,
    env: process.env,
  });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || "").slice(0, 400);
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw new Error(`enrichment image render failed: ${err || `exit ${r.status}`}`);
  }
  const buf = fs.readFileSync(tmp);
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  if (!buf || buf.length < 1000) throw new Error("enrichment image too small");
  return { buf, ext: "png", generated: true };
}

module.exports = {
  renderGeneratedListingImage,
  LISTING_ENRICH_IMAGE_WIDTH: 1200,
  LISTING_ENRICH_IMAGE_HEIGHT: 800,
};
