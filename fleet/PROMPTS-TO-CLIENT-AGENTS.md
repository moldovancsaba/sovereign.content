# Prompts to give client / peer agents (copy-paste)

**Purpose:** Correct the three divergent comparison feedbacks and bind everyone to one delivery + honesty model.  
**Rules + SSOT (read before sending):**

- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/RULES.md  
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/CLIENT-COMPARISON.md  
- https://github.com/moldovancsaba/sovereign.content/blob/main/HANDOVER.md  
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/profiles/  

Use **§A** if you want one blast to all three chats, or **§B–D** for targeted follow-ups.

---

## A — Single blast (all three agents)

```text
STOP publishing cross-client comparisons in new locations. We have a unified SSOT now.

Binding docs (read fully, then act):
1) https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/RULES.md
2) https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/CLIENT-COMPARISON.md
3) https://github.com/moldovancsaba/sovereign.content/blob/main/HANDOVER.md
4) Your client profile under https://github.com/moldovancsaba/sovereign.content/tree/main/fleet/profiles

Rigid rules you must obey:
- Agent/process SSOT lives only on sovereign.content main — never on management release/* branches.
- Cross-client audits live only in fleet/CLIENT-COMPARISON.md (and fleet:daily-swot digests). Do not create CLIENT-*-COMPARISON.md elsewhere.
- Never invent a single “SSOT compliance %”. Use environment vs outcome scorecards; missing live KPIs = insufficient_signal.
- Doctrine “ingest-only” ≠ reality if scripts still open Mongo. Report both columns. Quarantine ≠ migration complete.
- Do not merge ClassScout forever-Find with padel until-found. Do not force-push release/sportolok.
- Do not steal another chat’s catalog timer. Fleet timer fleet-daily-swot is SC-central only.

Required fixes from you (scoped to YOUR client folder / chat):
1) Acknowledge fleet/RULES.md + fleet/CLIENT-COMPARISON.md as canonical; delete or stub any local duplicate comparison you wrote in a forbidden place.
2) Align AGENTS.md / timers / docs with doctrine-vs-reality honesty (especially Mongo CLIs vs ingest).
3) After meaningful ticks, emit slim fleet/inbox/<yourClientId>/status-YYYY-MM-DD.json per fleet/inbox/README.md (fair KPIs only — no About prose).
4) Push agent/docs changes to sovereign.content main under content.<client>/ only. Engine fixes → PR to management main.

Reply with: (a) what you will delete/stub, (b) your next concrete ingest/cutover or inbox-snapshot step, (c) confirmation you will not republish comparisons under release/*.
```

---

## B — Prompt for the Sportolok agent  
(feedback that lived on `management` `release/sportolok` as `docs/CONTENT-PROJECTS-COMPARISON.md`)

```text
Your CONTENT-PROJECTS-COMPARISON on management release/sportolok is in the wrong repo/branch and overstates readiness.

Read and follow:
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/RULES.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/CLIENT-COMPARISON.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/content.sportolok/src/QUARANTINE.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/content.sportolok/MIGRATION-FROM-MANAGEMENT.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/profiles/sportolok.json
- https://github.com/moldovancsaba/sovereign.content/blob/main/CORE-TEAM-STATUS.md

Mandatory corrections:
1) Do NOT update or extend docs/CONTENT-PROJECTS-COMPARISON.md on release/sportolok. Add that path to the migration delete list if missing. Canonical comparison is fleet/CLIENT-COMPARISON.md on sovereign.content main only.
2) Retract vanity claims: “90% SSOT”, “migration complete”, “API-only enforced”, “fully independent”. Quarantined Mongo executors mean environment fitness is capped until ingest rewrite + proven PATCH + core reconcile.
3) Do NOT recommend that padel “copy scripts from management like sportolok” without an ingest rewrite — that copies the outage class.
4) Next work: rewrite quarantined call sites to content.sportolok/ingest/client.ts + scheduleToRecurringSlots; one dry PATCH; keep release/sportolok untouched (no force-push). Emit fleet/inbox/sportolok/status-YYYY-MM-DD.json when you have fair signals.
5) Push agent changes only to sovereign.content/content.sportolok/ on main.

Confirm in one short reply which false claims you retract and your first ingest-rewrite target file.
```

---

## C — Prompt for the Padel Africa agent  
(execution still on management CLIs; docs in `content.padelafrica`)

```text
SC-central unified the cross-client comparison SSOT. Padel remains the Jobs reference pattern, but the agent home is docs-led while ticks still use management Mongo CLIs — track that gap honestly.

Read and follow:
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/RULES.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/CLIENT-COMPARISON.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/content.padelafrica/AGENTS.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/profiles/padelafrica.json
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/inbox/README.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/outbox/padelafrica-2026-09-24.md

Mandatory:
1) Do not create new root/release comparison docs. If you wrote CLIENT-FOLDER or workflow comparisons outside fleet/CLIENT-COMPARISON.md, stop extending them — stubs already redirect.
2) Fix content.padelafrica/AGENTS.md layout table if it still claims scripts/ or research/ that do not exist (add stubs OR remove from the table).
3) Keep padel-find-tick on THIS chat. Do not touch fleet-daily-swot.
4) After each orchestrator tick, commit slim fleet/inbox/padelafrica/status-YYYY-MM-DD.json (workingEnv + profile-fair outcome counts only — no About prose, no invented contacts).
5) Prefer documenting Mongo CLI use as “product operator tool” vs “agent doctrine”; do not claim ingest-only reality until writes go through content.padelafrica/ingest/.
6) Agent doc/playbook edits → sovereign.content/content.padelafrica/ on main. Engine CLI fixes → management PR → main (existing padel PR path).

Reply with the first status JSON you will emit and any AGENTS.md honesty fix you will commit.
```

---

## D — Prompt for the ClassScout agent  
(maturity vs forever workflow feedback)

```text
Your forever+Improve maturity picture is valuable, but cross-client scoring must use the unified fleet SSOT — ClassScout is not the gold standard for sparse padel or quarantined sportolok.

Read and follow:
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/RULES.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/CLIENT-COMPARISON.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/content.classscout/AGENTS.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/profiles/classscout.json
- https://github.com/moldovancsaba/sovereign.content/blob/main/fleet/inbox/README.md
- https://github.com/moldovancsaba/sovereign.content/blob/main/content.classscout/docs/catalog-find-improve-loop.md

Mandatory:
1) Do not extend repo-root CLIENT-FOLDER-COMPARISON.md — it is a stub. Propose factual deltas as PRs to fleet/CLIENT-COMPARISON.md on sovereign.content main only.
2) Keep forever Find + generated_art_only + daysOfWeek schedule. Never adopt management RecurringSlot / weekdays[] shapes. Never merge engines with padel until-found.
3) Confirm whether production forever currently runs from content.classscout/scripts or still from moldovancsaba/classscout scripts/catalog-loop/. Document the cutover status honestly in content.classscout/ docs.
4) After rollup/digest ticks, emit slim fleet/inbox/classscout/status-YYYY-MM-DD.json (lasting-public / improve fill / find smoke / Tier-A pauses — counts/enums only).
5) Do not claim “ClassScout always lived only in sovereign.content” if product-repo runners are still live — say “canonical agent home is content.classscout/; cutover in progress” when true.
6) Agent changes → sovereign.content/content.classscout/ on main. Product ingest/UI → classscout repo.

Reply with cutover status (SC vs product runner) and the status-snapshot fields you will emit.
```

---

## Optional — operator one-liner when pasting

> These prompts enforce `fleet/RULES.md`. Comparisons that are not in `fleet/CLIENT-COMPARISON.md` are non-canonical. Delete the `release/sportolok` comparison on reconcile; do not revive it.
