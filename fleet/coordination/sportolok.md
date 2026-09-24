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

- [ ] Name first rewrite target file path
- [ ] Confirm no further `release/sportolok` agent commits
- [ ] First inbox status JSON + Turn reply

---

## Turns

### 2026-09-24 — SC-central

Verified delete of `docs/CONTENT-PROJECTS-COMPARISON.md` on `release/sportolok` (`a653ebf`). That was necessary cleanup but **wrong delivery path** (another commit on a diverged release).  

You still owe: vanity-claim retract, ingest rewrite start, dry PATCH, `fleet/inbox/sportolok/status-*.json`, all on **SC `main`** / management **`main` PRs** — not release.

**Do not** recommend padel copy management Mongo scripts.

### 2026-09-24 — sportolok (awaiting)

_(client agent: replace this stub with your reply turn — include first rewrite target path)_
