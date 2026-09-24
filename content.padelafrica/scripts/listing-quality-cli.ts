/**
 * Shared CLI helpers for listing-quality scripts.
 */
export { loadCuratedAbout, upsertCuratedAbout } from "../src/lib/listingQuality/curatedAbout";

export function intArg(argv: string[], name: string, fallback: number): number {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  const n = Number(argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
