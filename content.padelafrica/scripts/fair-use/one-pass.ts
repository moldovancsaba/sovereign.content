#!/usr/bin/env npx tsx
/**
 * Fair-use multi-source pass: walk every enabled source and take ONE page each.
 *
 *   npx tsx scripts/fair-use/one-pass.ts
 *   FAIR_USE_ONLY=padellands npx tsx scripts/fair-use/one-pass.ts
 *   FAIR_USE_SOURCES=padellands,ballejaune,padel-maroc npx tsx scripts/fair-use/one-pass.ts
 *   npx tsx scripts/fair-use/one-pass.ts --dry-run   # load registry + report pending only (no HTTP)
 *
 * Never opens Mongo. Emits needs_verify candidates under scripts/fair-use/data/.
 */
import {
  cooldownRemainingSec,
  loadCandidates,
  loadRegistry,
  loadRootState,
  pendingCandidateCount,
  saveRootState,
  sleep,
  type SourceMeta,
} from "./lib/common.ts";
import { processOneSource } from "./lib/processOneSource.ts";

function loadEnabledSources(): SourceMeta[] {
  const registry = loadRegistry();
  const only = process.env.FAIR_USE_ONLY?.trim();
  if (only) {
    const s = registry.sources.find((x) => x.id === only);
    return s ? [s] : [];
  }
  const filter = (process.env.FAIR_USE_SOURCES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!filter.length) return [...registry.sources];
  const set = new Set(filter);
  return registry.sources.filter((s) => set.has(s.id));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const registry = loadRegistry();
  const sources = loadEnabledSources();
  if (!sources.length) {
    console.log(JSON.stringify({ ok: false, reason: "no_sources" }));
    process.exit(2);
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          sourceCount: sources.length,
          sources: sources.map((s) => s.id),
          pendingCandidates: pendingCandidateCount(),
          candidatesSample: loadCandidates()
            .filter((c) => c.status === "needs_verify")
            .slice(0, 5)
            .map((c) => ({ id: c.candidateId, name: c.name, sourceId: c.sourceId })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const interSec = Number(
    process.env.FAIR_USE_INTER_SOURCE_SEC || registry.defaultInterSourceSec || 45,
  );
  const root = loadRootState();
  const results: unknown[] = [];
  let skippedCooldown = 0;
  let seeded = 0;

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]!;
    const srcState = root.sources[source.id] || {
      queue: [],
      done: {},
      discoveryCursor: 0,
      leadsAdded: 0,
      lastFetchAt: null,
      lastError: null,
    };
    root.sources[source.id] = srcState;

    const remaining = cooldownRemainingSec(
      source,
      srcState,
      registry.defaultCooldownSec || 600,
    );
    if (remaining > 0) {
      skippedCooldown += 1;
      results.push({
        sourceId: source.id,
        ok: true,
        skipped: true,
        reason: "cooldown",
        remainingSec: remaining,
      });
      continue;
    }

    try {
      const out = await processOneSource(source, root, registry);
      if (out.reasonCode === "seeded") seeded += 1;
      results.push(out);
    } catch (e) {
      results.push({
        ok: false,
        sourceId: source.id,
        error: String(e instanceof Error ? e.message : e),
      });
    }
    saveRootState(root);
    if (i < sources.length - 1 && interSec > 0) await sleep(interSec * 1000);
  }

  root.passCount = (root.passCount || 0) + 1;
  root.lastPassAt = new Date().toISOString();
  saveRootState(root);

  console.log(
    JSON.stringify(
      {
        ok: true,
        passCount: root.passCount,
        lastPassAt: root.lastPassAt,
        skippedCooldown,
        seeded,
        pendingCandidates: pendingCandidateCount(),
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
