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
          <code>subscribe_timer</code> for recurring ticks (about / quality / autopilot / hygiene /
          media) — and on-demand <code>catalog:find</code> for new venues
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
        Pattern used on Padel Africa (management / <code>release/padel-africa</code>). Adjust
        intervals per vertical debt — not calendar dogma.
      </p>
      <pre>{`# About debt → curated Mongo overrides + description apply
npm run catalog:about-curate -- --limit 15

# Score → improve → encode
npm run catalog:quality-loop -- --score-limit 50 --improve-limit 20

# Structured card publish machine
npm run catalog:autopilot -- --ticks 10 --requeue-limit 10

# Nominatim hygiene drains (+ contact enrich)
npm run catalog:hygiene -- --passes geo,price,venueModel,age,territory,contact

# Empty media → R2 / ImgBB / https passthrough
npm run catalog:media-curate -- --limit 15

# FIND new venues (on-demand, evidence-only research — not ClassScout forever Find)
npm run catalog:find -- --status
npm run catalog:find -- --fixture=scripts/data/<country>-padel-verified.json --dry-run`}</pre>

      <h2>FIND playbook (Cloud Agent)</h2>
      <ol>
        <li>
          <code>catalog:find -- --status</code> — pick a missing or sparse country
        </li>
        <li>
          Web-research official club / booking pages; collect Name, Address, Phone, Website, Email
          only from evidence
        </li>
        <li>
          Append a research fixture row; Nominatim street/locality pin with{" "}
          <code>geoNote</code> when not rooftop
        </li>
        <li>
          Dry-run then apply via <code>catalog:find --fixture=…</code>
        </li>
        <li>
          Do <strong>not</strong> use Ollama for these Cursor Cloud jobs — structured headers +
          research fixtures only
        </li>
      </ol>
      <p>
        Padel Africa FIND proof: Dakar Padel Club + REBEL PADEL Sahm (management{" "}
        <a href="https://github.com/moldovancsaba/management/pull/227">PR #227</a>). Jobs contract:{" "}
        <Link href="/jobs">Jobs</Link>.
      </p>

      <h2>Cross-vertical: ClassScout twins</h2>
      <p>
        Agents that also work ClassScout call the same <code>catalog:*</code> names via thin npm
        twins — see ClassScout{" "}
        <a href="https://github.com/moldovancsaba/classscout/blob/cursor/sovereign-content-align-b289/docs/sovereign-content-alignment.md">
          sovereign-content-alignment.md
        </a>
        . Media policy there is <code>generated_art_only</code> (coverage, no venue-photo scrape);
        Padel Africa keeps default <code>allow_og_scrape</code>. Street + chrome detector contract:{" "}
        <Link href="/jobs">Jobs</Link>. Plans:{" "}
        <code>recommendations/inbox/plan-classscout-rec-6-7-8.md</code>,{" "}
        <code>plan-classscout-recs-6-21.md</code>.
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
          After About or media writes, confirm serving refresh / public card when the pack loads.
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
        From a Cloud Agent session with cursor-subscriptions MCP authenticated, subscribe one timer
        per job class. Keep the prompt short: name the script, flags, env vertical, and the rule
        “Mongo only — no git content.” Example intent (not a vendor API dump):
      </p>
      <pre>{`Every 4 hours: in the vertical checkout,
VERTICAL=<id> npm run catalog:quality-loop -- --score-limit 50 --improve-limit 20
Report counts only. Do not open PRs for content.`}</pre>

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
        <Link href="/#environments">environment selector</Link>. Do not invent a second job
        vocabulary.
      </p>
    </DocShell>
  );
}
