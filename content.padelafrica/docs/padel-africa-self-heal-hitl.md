# Self-heal HiTL delivery + smart reports

Operator (you) should get **thoughtful** digests — not counter-only JSON. Cloud Agents must
classify every proposed action as **auto**, **agent_execute**, or **hitl_review**.

## Report contract (every digest / timer report)

1. **Executive brief** — one paragraph: what changed, what is settled, what needs you.
2. **Per item** (never skip for “important” items):
   - **Situation** — what is happening
   - **Evidence** — ids, sources, scores, attempt outcomes
   - **Analysis** — why it matters, options, trade-offs (agent-quality reasoning)
   - **Recommendation** — next step
   - **Delivery** — `auto` | `agent_execute` | `hitl_review` + why
3. **Commands** — only for `auto` / `agent_execute`
4. **HiTL queue** — items that wait for you, each with `operatorPrompt`

CLI:

```bash
npm run catalog:self-heal -- --digest
npm run catalog:self-heal -- --digest --since=2026-09-17T00:00:00.000Z
```

## Delivery matrix (smart delivery)

| Class | Meaning | Examples |
| --- | --- | --- |
| **auto** | Agent runs without asking | quality-loop About, about-curate from facts, media-curate with OG, contact enrich from headers, serving:reconcile, Nominatim street upgrade, honest FIND `zero-result` |
| **agent_execute** | Agent judgment + evidence bar; no ask if honesty holds | FIND seed with two sources + contact/URL; research `--brief` WebSearch |
| **hitl_review** | Draft/report then **wait for you** | SSOT portable contracts, doctrine/threshold/policy changes, operator product-intent notes, thin single-source seeds, engine-merge / forever Find, any invented facts (refuse) |

Code: `src/lib/catalogSelfHeal/hitlDelivery.ts`, `digest.ts`.

## Agent rules

- Do **not** send mechanical `{scanned:0}` alone when the tick is a digest or a heal decision — add the brief.
- Settled empty quality/media/autopilot ticks may stay short; self-improve / FIND / HiTL items may not.
- Prefer **one** Cloud Agent orchestrator timer that runs improve → FIND → `--digest` in one turn
  (see [`padel-africa-jobs.md`](padel-africa-jobs.md) § timer orchestration). Do not chain timers.
- Never paste `/stats` notes into About.
- Never merge SSOT `main` contract drafts without HiTL accept.

## Related

- [`padel-africa-self-heal.md`](padel-africa-self-heal.md)
- [`padel-africa-self-heal-feedback-audit-2026-09-24.md`](padel-africa-self-heal-feedback-audit-2026-09-24.md)
- SSOT plan: `plan-sovereign-self-improve-loop.md`
