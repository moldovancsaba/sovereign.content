import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocCallout } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Cursor environment",
};

export default function CursorEnvironmentPage() {
  return (
    <DocShell
      current="/environments/cursor"
      title={`Cursor`}
      lead={`First environment. Cursor Cloud Agents proved the sovereign loop: timed Mongo jobs, research-grounded About, media rehost, and PR delivery — without putting catalogue content in git.`}
    >

      <DocCallout>Use this playbook when the vertical repo is already linked to a Cursor Cloud environment
        with Mongo credentials and (optionally) R2 / ImgBB. Start here before OpenClaw, local
        daemons, or Vercel Cron.</DocCallout>

      <h2>What Cursor owns</h2>
      <ul>
        <li>
          Long-running agent sessions that call <code>npm run catalog:*</code>
        </li>
        <li>
          One <code>subscribe_timer</code> orchestrator that runs about → quality → media →
          autopilot → hygiene → FIND <code>--until-found</code> → <code>catalog:self-heal --digest</code>{" "}
          in a single turn (not one timer per job; not on-demand-only FIND)
        </li>
        <li>Research passes that upsert structured cards or curated About into Mongo</li>
        <li>
          Evidence-only FIND: web-research official pages → research fixture →{" "}
          <code>catalog:find --fixture=…</code> (never invent phones/emails/ages)
        </li>
        <li>Code fixes and docs via feature branches + PRs into the vertical&apos;s release branch</li>
      </ul>

      <h2>Bootstrap checklist</h2>
      <ol>
        <li>
          Vertical exposes the job CLIs from the <Link href="/jobs">Jobs</Link> contract.
        </li>
        <li>
          Cloud environment has <code>MONGODB_URI</code>, <code>MONGODB_DB</code> /{" "}
          <code>VERTICAL</code>, and optional <code>R2_*</code> / <code>IMGBB_API_KEY</code> /{" "}
          <code>PUBLIC_SITE_ORIGIN</code>.
        </li>
        <li>
          Agent reads this SSOT (<code>https://sovereigncontent.messmass.com</code>) plus the
          vertical&apos;s <code>docs/operations.md</code> for script flags.
        </li>
        <li>
          First tick is always <code>--dry-run</code> until counts look sane.
        </li>
        <li>
          Subscribe timers only after dry-runs succeed and write paths are understood.
        </li>
      </ol>

      <h2>Reference timer set</h2>
      <p>
        Prefer <strong>one</strong> orchestrator subscription (~3600s) whose prompt runs the steps
        below in order. Pattern used on Padel Africa (
        <code>padel-find-tick</code> on management / <code>release/padel-africa</code>). Worked
        examples:{" "}
        <a href="https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/padel-africa-jobs.md">
          padel-africa-jobs.md
        </a>
        .
      </p>
      <pre>{`# Single wake — run in order (empty sub-steps OK)
npm run catalog:about-curate -- --limit 15
npm run catalog:quality-loop -- --score-limit 100 --improve-limit 40
npm run catalog:media-curate -- --limit 25
npm run catalog:autopilot -- --ticks 10 --requeue-limit 10
npm run catalog:hygiene
npm run serving:reconcile -- --limit 200
npm run catalog:find -- --until-found --max-cells 8   # agent executes; stop on seed
npm run catalog:self-heal -- --digest                # HiTL classes; leave timer subscribed`}</pre>

      <h2>FIND playbook (Cloud Agent)</h2>
      <ol>
        <li>
          <code>catalog:find -- --until-found --max-cells 8</code> — read campaign +{" "}
          <code>firstBrief</code>
        </li>
        <li>
          WebSearch each <code>searchQueries</code> entry; open official / directory pages from{" "}
          <code>sourcesToCheck</code>
        </li>
        <li>
          Evidence bar: named venue, location pin, contact or first-party URL, prefer two sources.
          Never invent phones/emails/ages/court counts
        </li>
        <li>
          Seed: append fixture → dry-run → apply →{" "}
          <code>--record-attempt --outcome=seeded</code> → <strong>STOP</strong>
        </li>
        <li>
          Zero: <code>--record-attempt --outcome=zero-result</code> → next cell; all dry →{" "}
          <code>budget_exhausted</code>
        </li>
        <li>
          Do <strong>not</strong> use Ollama / AI Gateway for these Cursor Cloud FIND ticks
        </li>
      </ol>
      <p>
        Padel Africa FIND proof: NG Ibadan (Padel Pro Club), EG Giza, SN Dakar, TZ/ZM/LY/GQ —
        management{" "}
        <a href="https://github.com/moldovancsaba/management/pull/227">PR #227</a>. Jobs contract:{" "}
        <Link href="/jobs">Jobs</Link>.
      </p>

      <h2>Cross-vertical: ClassScout twins</h2>
      <p>
        Do <strong>not</strong> merge engines. ClassScout keeps forever Find +{" "}
        <code>generated_art_only</code>; Padel keeps <code>--until-found</code> + OG scrape → R2.
        Agents on ClassScout call the same <code>catalog:*</code> names via thin npm twins — see
        ClassScout{" "}
        <a href="https://github.com/moldovancsaba/classscout/blob/main/docs/sovereign-content-alignment.md">
          docs/sovereign-content-alignment.md
        </a>
        . Orchestration ClassScout should adopt (self-heal, About≥75, reconcile, archive,
        until-found sparse complement, cron-cli-twins):{" "}
        <Link href="/jobs">Jobs</Link> “Dense-US twin” and management{" "}
        <a href="https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/classscout-sovereign-twin.md">
          classscout-sovereign-twin.md
        </a>
        . Street + chrome contract: <Link href="/jobs">Jobs</Link>. Plans:{" "}
        <code>recommendations/inbox/plan-classscout-rec-6-7-8.md</code>,{" "}
        <code>plan-classscout-recs-6-21.md</code>,{" "}
        <code>plan-classscout-twin-orchestration.md</code>.
      </p>

      <h2>Reliability: hygiene must exit (SC #13)</h2>
      <p>
        After <code>catalog:hygiene</code> prints its JSON summary the process must exit 0/1. A hung
        tick with a green summary is a Mongo client leak — not an outage. Prefer{" "}
        <code>finally</code> closing the client on every backfill pass.
      </p>

      <h2>Find / autopilot ordering (SC #10 / #11)</h2>
      <ol>
        <li>Deep multi-page enrich (prefer /contact, /locations) before the street gate</li>
        <li>Page street candidates rank above seed.address</li>
        <li>Dedupe sourceUrls within-doc; never mark seeds done on within-doc duplicate rejects</li>
      </ol>

      <h2>Agent operating rules</h2>
      <ul>
        <li>
          Never commit listing About, curated maps, or media <em>binaries</em> as live content.
          Optional dated JSON archive-backup via <code>catalog:archive-snapshot</code> on the
          vertical branch is allowed (URLs + facts only).
        </li>
        <li>
          Prefer structured headers + research prose over free-text LLM for publish.
        </li>
        <li>
          <strong>Content does not need GDS.</strong> Pack-load / serving-refresh failures are
          optional noise — keep writing Mongo; reconcile serving later if needed.
        </li>
        <li>
          After About or media writes, confirm serving refresh / public card{" "}
          <em>when the pack loads</em>; skip that check when pack load warns.
        </li>
        <li>
          Treat empty job queues as success (zero-cost ticks), not failures.
        </li>
        <li>
          Dual-repo: process docs → <code>sovereign.content</code> <code>main</code>; vertical code
          / archive → feature branch. Full playbook: <Link href="/implement">Implement</Link>.
        </li>
        <li>
          When adding a new vertical capability, document the CLI here (SSOT) and in the vertical
          operations doc — keep both honest.
        </li>
      </ul>

      <h2>Wiring subscribe_timer</h2>
      <p>
        From a Cloud Agent session with cursor-subscriptions MCP authenticated, subscribe{" "}
        <strong>one</strong> recurring orchestrator timer. Timers only enqueue prompts — they do not
        hand off to the next job. Keep the prompt ordered: about → quality → media → autopilot →
        hygiene/reconcile → FIND until-found → self-heal digest. Rule: “Mongo only — no git content;
        no AI Gateway on these ticks.” Example intent (not a vendor API dump):
      </p>
      <pre>{`Every ~1h: in the vertical checkout, run the catalog orchestrator
(about → quality → media → autopilot → hygiene → FIND --until-found →
catalog:self-heal --digest). Report one combined summary. Leave this timer subscribed.`}</pre>

      <h2>Delivery boundary</h2>
      <table>
        <thead>
          <tr>
            <th>Change type</th>
            <th>Goes to</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>About / media / card state</td>
            <td>Mongo (and serving)</td>
          </tr>
          <tr>
            <td>New CLI, bugfix, docs</td>
            <td>Feature branch → PR → release branch</td>
          </tr>
          <tr>
            <td>Transfer knowledge</td>
            <td>
              This repo (<code>sovereign.content</code>) → Vercel docs site
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Feed findings back</h2>
      <p>
        After a tick or adoption pass, file process improvements via the{" "}
        <Link href="/recommendations">recommendations</Link> channel (GitHub Issue template{" "}
        <code>agent-recommendation</code>). Do not invent a parallel feedback loop.
      </p>

      <h2>Next environments</h2>
      <p>
        When Cursor is boringly reliable on a vertical, port the same CLIs to OpenClaw workers,
        local daemons, or Vercel Cron using the stubs on the{" "}
        <Link href="/">environment selector</Link>. Do not invent a second job
        vocabulary.
      </p>
    </DocShell>
  );
}
