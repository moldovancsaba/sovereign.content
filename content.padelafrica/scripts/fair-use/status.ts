#!/usr/bin/env npx tsx
/**
 * Fair-use status — pending candidates + per-source cooldown/queue.
 *   npx tsx scripts/fair-use/status.ts
 */
import {
  cooldownRemainingSec,
  loadCandidates,
  loadRegistry,
  loadRootState,
  pendingCandidateCount,
} from "./lib/common.ts";

function main() {
  const registry = loadRegistry();
  const root = loadRootState();
  const pending = loadCandidates().filter((c) => c.status === "needs_verify");
  const sources = registry.sources.map((s) => {
    const st = root.sources[s.id];
    return {
      id: s.id,
      queue: st?.queue?.length || 0,
      leadsAdded: st?.leadsAdded || 0,
      discoveryCursor: st?.discoveryCursor || 0,
      lastFetchAt: st?.lastFetchAt || null,
      cooldownRemainingSec: st
        ? cooldownRemainingSec(s, st, registry.defaultCooldownSec || 600)
        : 0,
      lastError: st?.lastError || null,
    };
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        pendingCandidates: pendingCandidateCount(),
        passCount: root.passCount || 0,
        lastPassAt: root.lastPassAt,
        candidates: pending.slice(0, 20).map((c) => ({
          candidateId: c.candidateId,
          name: c.name,
          sourceId: c.sourceId,
          website: c.website || null,
          cityHint: c.cityHint || null,
          countryHint: c.countryHint || null,
          citationUrl: c.citationUrl,
        })),
        sources,
      },
      null,
      2,
    ),
  );
}

main();
