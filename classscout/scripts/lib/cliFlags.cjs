/**
 * Shared argv helpers for catalog-loop CLIs (Sovereign Content alignment).
 * Prefer flags over inventing a second env vocabulary; env still works for forever.sh.
 */

function hasFlag(name) {
  return process.argv.includes(name);
}

function flagValue(name) {
  const i = process.argv.indexOf(name);
  if (i < 0 || i + 1 >= process.argv.length) return "";
  const v = process.argv[i + 1];
  if (!v || v.startsWith("-")) return "";
  return v;
}

function isDryRun() {
  return (
    hasFlag("--dry-run") ||
    process.env.CATALOG_LOOP_DRY_RUN === "1" ||
    process.env.CATALOG_LOOP_DRY_RUN === "true"
  );
}

function limitFromArgs(envName, fallback) {
  const fromFlag = flagValue("--limit");
  if (fromFlag && Number.isFinite(Number(fromFlag)) && Number(fromFlag) > 0) {
    return Math.max(1, Number(fromFlag));
  }
  if (envName && process.env[envName]) {
    const n = Number(process.env[envName]);
    if (Number.isFinite(n) && n > 0) return Math.max(1, n);
  }
  return Math.max(1, Number(fallback) || 1);
}

function idsFromArgs(envName) {
  const fromFlag = flagValue("--ids");
  const raw = fromFlag || (envName ? process.env[envName] || "" : "");
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = {
  hasFlag,
  flagValue,
  isDryRun,
  limitFromArgs,
  idsFromArgs,
};
