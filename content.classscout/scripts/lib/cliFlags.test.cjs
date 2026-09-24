/**
 * cliFlags helpers — Sovereign Content catalog:* argv parsing.
 */
const assert = require("assert");
const { spawnSync } = require("child_process");
const path = require("path");

const script = path.join(__dirname, "cliFlags.cjs");

function runProbe(argv, env = {}) {
  const code = `
    process.argv = ${JSON.stringify(["node", "probe", ...argv])};
    const m = require(${JSON.stringify(script)});
    console.log(JSON.stringify({
      dry: m.isDryRun(),
      limit: m.limitFromArgs("CATALOG_DESC_REPAIR_LIMIT", 40),
      ids: m.idsFromArgs("CATALOG_DESC_REPAIR_IDS"),
    }));
  `;
  const r = spawnSync(process.execPath, ["-e", code], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return JSON.parse(r.stdout.trim().split("\n").pop());
}

assert.deepEqual(runProbe([]), { dry: false, limit: 40, ids: [] });
assert.deepEqual(runProbe(["--dry-run", "--limit", "7", "--ids", "a,b"]), {
  dry: true,
  limit: 7,
  ids: ["a", "b"],
});
assert.equal(runProbe([], { CATALOG_LOOP_DRY_RUN: "1" }).dry, true);
assert.equal(runProbe([], { CATALOG_DESC_REPAIR_LIMIT: "12" }).limit, 12);

console.log("cliFlags.test.cjs: ok");
