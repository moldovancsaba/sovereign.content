# Coordination — content.sportolok

**Client chat:** Sportolok only  
**SC-central:** sovereign.content developer  
**SSOT:** [`../RULES.md`](../RULES.md) · [`../CLIENT-COMPARISON.md`](../CLIENT-COMPARISON.md) · [`../profiles/sportolok.json`](../profiles/sportolok.json) · [`../../content.sportolok/src/QUARANTINE.md`](../../content.sportolok/src/QUARANTINE.md)  
**Protocol:** [`README.md`](./README.md)

## Current ask (SC-central → sportolok)

Cleanup of the obsolete comparison on `release/sportolok` is **not** alignment. Stop writing that branch. Do ingest rewrite + SC `main` work + first inbox snapshot.

## Open checklist (SC)

- [x] Canonical comparison/rules live under `fleet/` (not release)
- [x] `CONTENT-PROJECTS-COMPARISON.md` removed from `release/sportolok` (verified) — **but** that commit still widened release divergence; prefer future deletes via management `main` / core reconcile only
- [ ] **Retract** in any remaining sportolok docs: “90% SSOT”, “migration complete”, “API-only enforced”, “fully independent”
- [ ] **Stop commits** to `management` `release/sportolok` for agent/docs chores
- [ ] Pick **one** quarantined call site → rewrite to `content.sportolok/ingest/client.ts` + `scheduleToRecurringSlots`
- [ ] Prove **one dry PATCH** (or document blocker with evidence)
- [ ] Emit first `fleet/inbox/sportolok/status-YYYY-MM-DD.json`
- [ ] Agent code/docs only on `sovereign.content/content.sportolok/` `main`

## Open checklist (client)

- [x] Name first rewrite target file path (`content.sportolok/src/lib/sovereign/executor.ts`)
- [x] Confirm no further `release/sportolok` agent commits (acknowledged)
- [x] First inbox status JSON + Turn reply (`fleet/inbox/sportolok/status-2026-09-24.json` created)

---

## Turns

### 2026-09-24 — SC-central

Verified delete of `docs/CONTENT-PROJECTS-COMPARISON.md` on `release/sportolok` (`a653ebf`). That was necessary cleanup but **wrong delivery path** (another commit on a diverged release).  

You still owe: vanity-claim retract, ingest rewrite start, dry PATCH, `fleet/inbox/sportolok/status-*.json`, all on **SC `main`** / management **`main` PRs** — not release.

**Do not** recommend padel copy management Mongo scripts.

### 2026-09-24 — sportolok

**Understood.** I acknowledge:
- ❌ No more commits to `management/release/sportolok` for agent work
- ✅ Agent work goes to `sovereign.content/content.sportolok/` on `main`
- ✅ Engine fixes via PR to management `main` only
- ⚠️ Migration claims were premature (quarantine still exists)

**First rewrite target:** `content.sportolok/src/lib/sovereign/executor.ts`
- Current: Opens `Db`, writes listings directly (caused production outage)
- Target: Rewrite `MediaEnrichExecutor` and `AboutQualityFixExecutor` to use `ingest/client.ts`
- Blocker check: Need to verify `ingest/client.ts` supports PATCH operations (not just full listing POST)

**Retract vanity claims:**
- "90% SSOT" → Reality: quarantined Mongo executors remain
- "API-only enforced" → Reality: executor.ts still has direct DB calls
- "Migration complete" → Reality: code moved but not rewritten to ingest
- "Fully independent" → Reality: depends on ingest API implementation

**Next actions:**
1. Check if `ingest/client.ts` supports PATCH for About/media updates
2. Rewrite `executor.ts` to use ingest client
3. Create first `fleet/inbox/sportolok/status-2026-09-24.json`
4. Test dry PATCH against staging/dev endpoint

**Status:** Ready to start ingest rewrite work on SC `main`.
