/**
 * Resolve the ClassScout product checkout for transitional runners that still
 * load env / mongodb from the product tree. Prefer CLASSSCOUT_PRODUCT_ROOT.
 * Steady-state listing writes must still go through POST /api/ingest.
 */
const fs = require("fs");
const path = require("path");

function productRoot() {
  const fromEnv = (process.env.CLASSSCOUT_PRODUCT_ROOT || "").trim();
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);

  const candidates = [
    "/workspace",
    path.resolve(__dirname, "../../../classscout"),
    path.resolve(__dirname, "../../../../classscout"),
    path.resolve(__dirname, "../../../../../classscout"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "package.json")) && fs.existsSync(path.join(c, "src"))) {
      return c;
    }
  }
  throw new Error(
    "Set CLASSSCOUT_PRODUCT_ROOT to the moldovancsaba/classscout checkout (needed for env/mongodb module resolution during migration).",
  );
}

function loadProductEnv() {
  const root = productRoot();
  const loader = path.join(root, "scripts", "load-env.cjs");
  if (fs.existsSync(loader)) {
    require(loader);
  }
  return root;
}

function productRequire(mod) {
  const root = productRoot();
  return require(path.join(root, "node_modules", mod));
}

module.exports = { productRoot, loadProductEnv, productRequire };
