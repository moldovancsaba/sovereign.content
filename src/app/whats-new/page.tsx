import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocCallout } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "What's new",
};

export default function WhatsNewPage() {
  return (
    <DocShell
      current="/whats-new"
      title={`What's new`}
      lead={`Shipped process contracts and engine changes agents should pick up. Catalogue content still lives in Mongo — this page is transfer knowledge only.`}
      footerNext={{ label: "Jobs", href: "/jobs" }}
    >
      <DocCallout title="2026-09-24 (recommended order)">
        Delivered: (1) Mongo-only quality-loop / about / media — GDS fully removed from content
        ticks; use <code>serving:reconcile</code>; (2) R2 primary + ImgBB backup wired; (3) FIND{" "}
        <code>--until-found</code> + self-heal bind; (4) worked job examples for other agents; (5)
        ClassScout ↔ SC ↔ Padel twin knowledge (do not merge engines); (6){" "}
        <strong>client separation</strong> — top-level <code>content.padelafrica/</code> +{" "}
        <code>content.sportolok/</code> + <code>content.classscout/</code>; ingest-only writes; (7){" "}
        <strong>fleet:daily-swot plan</strong> — cross-agent SWOT + environment comparison (
        <code>fleet/</code>, inbox plan) for the SC-central agent.
      </DocCallout>

      <h2>2026-09-24 — Fleet daily SWOT (plan)</h2>
      <ul>
        <li>
          New SC-central job <code>fleet:daily-swot</code>: collect agent signals, SWOT each
          client, compare working-environment fitness vs content-type-normalized outcomes
        </li>
        <li>
          Scaffold: <code>fleet/profiles/</code>, schema, inbox/outbox/digests, timer prompt
        </li>
        <li>
          Research + phased plan: <code>fleet/RESEARCH-2026-09-24.md</code>,{" "}
          <code>plan-fleet-daily-swot.md</code>
        </li>
      </ul>

      <h2>2026-09-24 — Separate agents from management engine</h2>
      <ul>
        <li>
          Top-level <code>content.padelafrica/</code> and <code>sportolok/</code> workspaces (no
          cross-imports)
        </li>
        <li>
          Sportolok <code>src/lib/sovereign/*</code> + APIs/crons/docs migrated here; Mongo
          executors quarantined
        </li>
        <li>
          Ingest clients + <code>scheduleToRecurringSlots</code> (singular <code>weekday</code>)
        </li>
        <li>
          Management dual-repo docs updated — agents must not commit onto client release branches
        </li>
      </ul>

      <h2>2026-09-24 — Smart digest + HiTL delivery</h2>
      <ul>
        <li>
          Digests must report with executive brief + per-item analysis (not mechanical counters)
        </li>
        <li>
          Delivery classes: <code>auto</code> / <code>agent_execute</code> /{" "}
          <code>hitl_review</code> — SSOT contracts and product-intent notes wait for the operator
        </li>
        <li>
          CLI: <code>catalog:self-heal --digest</code> (management)
        </li>
      </ul>
      <p>
        Guide: management <code>docs/padel-africa-self-heal-hitl.md</code> · plan:{" "}
        <code>plan-sovereign-self-improve-loop.md</code>.
      </p>

      <h2>2026-09-24 — Self-heal feedback audit + self-improve plan</h2>
      <ul>
        <li>
          Audit (historical): About quality-loop closed; process lessons / FIND yields / media-geo
          debt / SSOT inbox were write-mostly at snapshot time
        </li>
        <li>
          <strong>Digest shipped same day:</strong> <code>catalog:self-heal --digest</code> with
          HiTL classes (report label <code>catalog:self-improve</code> is not an npm script)
        </li>
        <li>
          Phase 1 honesty still open: wire <code>media_thin</code>, open <code>geo_weak</code>, stop
          sibling-skip of research debt, apply lesson tactic order
        </li>
        <li>
          Timer: fold digest into the <strong>single catalog orchestrator</strong> — do not add a
          sixth <code>padel-self-improve-tick</code> unless forced
        </li>
      </ul>
      <p>
        Audit: management{" "}
        <a href="https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/padel-africa-self-heal-feedback-audit-2026-09-24.md">
          self-heal-feedback-audit
        </a>
        · plan: <code>plan-sovereign-self-improve-loop.md</code> ·{" "}
        <Link href="/recommendations">Recommendations</Link>.
      </p>

      <h2>2026-09-24 — ClassScout dense-US twin knowledge</h2>
      <ul>
        <li>
          Intentional diffs documented: forever Find + <code>generated_art_only</code> stay on
          ClassScout; padel keeps research <code>--until-found</code> + OG scrape → R2
        </li>
        <li>
          Orchestration to export into ClassScout: self-heal (incl.{" "}
          <code>openOperatorFeedback</code>), About bar ~75, <code>serving:reconcile</code>,
          archive-snapshot, until-found sparse complement, cron-cli-twins
        </li>
        <li>
          Copy-hygiene depth (FAQ / chatbot / translate-consent) absorbed into portable validation
        </li>
      </ul>
      <p>
        Contracts: <Link href="/jobs">Jobs</Link> · playbook:{" "}
        <Link href="/environments/cursor">Cursor</Link> · twin doc:{" "}
        <a href="https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/classscout-sovereign-twin.md">
          classscout-sovereign-twin.md
        </a>
        .
      </p>

      <h2>2026-09-24 — Padel Africa job examples + R2 primary</h2>
      <ul>
        <li>
          Worked CLI examples (tick order, JSON shapes, FIND until-found, media hosts) for other
          agents to copy
        </li>
        <li>
          Quality-loop / about-curate never load GDS; media-curate loads <code>.env.local</code>
        </li>
        <li>
          Image host hierarchy: Cloudflare R2 primary → ImgBB backup → https passthrough
        </li>
        <li>
          FIND prefer <code>--until-found</code>; self-heal defers FIND when debt is hot
        </li>
      </ul>
      <p>
        Contracts: <Link href="/jobs">Jobs</Link> · playbook:{" "}
        <Link href="/environments/cursor">Cursor</Link> · adopting:{" "}
        <Link href="/adopting">Adopting</Link>.
      </p>

      <DocCallout title="2026-09-23 (recommended order)">
        Delivered: (1) About@70 debt cleared; (2) FIND Libya Zeyani + Mendoza and GQ Ukomba Bata;
        (3–4) contact enrich (no_evidence leftovers) + media applied on new finds; (5) docs/SSOT.
        Continent map expanded to full UN M49 Africa (ZM/GA/CD/…). Catalogue{" "}
        <strong>158 PUBLISHED / 42 countries</strong> (management{" "}
        <a href="https://github.com/moldovancsaba/management/pull/227">PR #227</a>). No Ollama on
        Cursor Cloud ticks. Content jobs Mongo-only — GDS optional for serving refresh.
      </DocCallout>

      <h2>2026-09-23 — About debt @70 + more FIND</h2>
      <ul>
        <li>
          Soft Abouts scoring 70 (length + tone + chrome, no locality) unstuck by backfilling{" "}
          <code>venue.address</code> from evidence and applying curated recommendation Abouts
        </li>
        <li>
          Quality snapshot falls back to <code>territory.settlement</code> /{" "}
          <code>territory.country</code> when locality is nested
        </li>
        <li>
          FIND: Tanzania 1→3 published (Padel Centre TZ Slipway + The Hub Bwejuu); Zambia +Xtreme
          Emmasdale; catalogue 152→155
        </li>
      </ul>
      <p>
        Contracts: <Link href="/jobs">Jobs</Link> · playbook:{" "}
        <Link href="/environments/cursor">Cursor</Link>.
      </p>

      <h2>2026-09-23 — Content ticks ≠ GDS</h2>
      <p>
        Agents must not treat <code>vertical pack unavailable (… continent)</code> as a content
        blocker. Score / improve / encode / about-curate / media / hygiene / find write Mongo
        without GDS. Serving projection refresh is best-effort; run{" "}
        <code>serving:reconcile</code> when pack load works. Contract:{" "}
        <Link href="/jobs">Jobs</Link>.
      </p>

      <h2>2026-09-23 — catalog:find + empty-tick fixes</h2>
      <ul>
        <li>
          <code>catalog:find</code> — status → evidence fixture → dry-run → seed (portable FIND; not
          NYC fair-use)
        </li>
        <li>
          About quality: <code>ABOUT_QUALITY_TARGET = 75</code>; locality name-drop alone must not
          clear the bar (was starving about-curate)
        </li>
        <li>
          <code>catalog:hygiene</code> <code>contact</code> pass + <code>catalog:contact-enrich</code>{" "}
          — phone/website/email from card headers or promotable sourceUrl only
        </li>
        <li>
          Findings: Senegal 1→3 published research venues; catalogue 150→152
        </li>
      </ul>
      <p>
        Contracts: <Link href="/jobs">Jobs</Link> · playbook:{" "}
        <Link href="/environments/cursor">Cursor</Link>.
      </p>

      <h2>2026-09-23 — ClassScout #6–#21 contracts</h2>
      <p>
        Live Find/Improve + YourField audit recommendations folded into SSOT. High: street/chrome,
        media policy, Find enrich order, sourceUrl dedupe, quality-loop settle, ages, contacts,
        delivery labels, weak-About, schema-subset repair. Deferred: Martial Arts collective (#18)
        until a multi-sport vertical needs it. Plan:{" "}
        <code>recommendations/inbox/plan-classscout-recs-6-21.md</code>.
      </p>

      <h2>2026-09-23 — P1/P2 cron twins, geo promote, Lesson effects</h2>
      <ul>
        <li>
          <code>check:cron-cli-twins</code> — every vercel cron must have an npm CLI twin (Doctrine)
        </li>
        <li>
          Geographic-gap boost on <code>popularityRank</code> — promote only, never publish authority
        </li>
        <li>
          <code>SovereignLesson</code> effects <code>suggest-config</code> |{" "}
          <code>soften-required</code> | <code>none</code> via <code>catalog:lessons</code> /
          override-insights — never silent blocker mutation
        </li>
      </ul>
      <p>
        Engine: management{" "}
        <a href="https://github.com/moldovancsaba/management/pull/225">PR #225</a>. Contracts:{" "}
        <Link href="/jobs">Jobs</Link>.
      </p>

      <h2>2026-09-23 — Unified activity completeness</h2>
      <p>
        Every vertical pack can declare <code>activityCompleteness</code> keyed by taxonomy slug.
        The publish gate&apos;s completeness family always resolves the listing&apos;s lead activity
        → required vs soft fields (description, schedule, price). Binary gate stays; this is the
        portable answer to “weighted % gates” without a second <code>autonomyThreshold</code>.
      </p>
      <ul>
        <li>
          <strong>Padel Africa</strong> ships profiles for club / court / coaching / tournaments /
          equipment-shop on day one. Adding <code>tennis-club</code> or <code>squash-club</code> =
          taxonomy row + profile (reuse court venue).
        </li>
        <li>
          <strong>Sportolok</strong> ships profiles for all eight participation forms (tanfolyam /
          verseny require schedule, etc.).
        </li>
        <li>
          <strong>toReachPublish()</strong> turns verdicts into staff actions (no fake confidence %).
        </li>
        <li>
          <strong>media-curate</strong> accepts{" "}
          <code>--policy allow_og_scrape|generated_art_only</code> (padel default: scrape).
        </li>
      </ul>
      <p>
        Plans:{" "}
        <code>recommendations/inbox/plan-sportolok-gate-feedback.md</code>,{" "}
        <code>plan-classscout-rec-6-7-8.md</code>. Issues{" "}
        <a href="https://github.com/moldovancsaba/sovereign.content/issues/6">#6</a>–
        <a href="https://github.com/moldovancsaba/sovereign.content/issues/8">#8</a>,{" "}
        <a href="https://github.com/moldovancsaba/sovereign.content/issues/14">#14</a>.
      </p>

      <h2>2026-09-23 — ClassScout process recommendations</h2>
      <ul>
        <li>Street-line + weak-copy detector contract documented on <Link href="/jobs">Jobs</Link></li>
        <li>
          Vertical <code>catalog:*</code> twins pattern on <Link href="/adopting">Adopting</Link> /
          Cursor
        </li>
        <li>Media-curate optional <code>generated_art_only</code> policy on Jobs</li>
      </ul>

      <h2>Earlier — Canonical dual-repo recommendation</h2>
      <p>
        Process SSOT on <code>sovereign.content</code> <code>main</code>; vertical engine + archive on
        the feature branch; live catalogue in Mongo; timed <code>catalog:*</code> jobs. See{" "}
        <Link href="/recommendations">Recommendations</Link> and <Link href="/implement">Implement</Link>.
      </p>
    </DocShell>
  );
}
