import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocCallout } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Recommendations",
};

export default function RecommendationsPage() {
  return (
    <DocShell
      current="/recommendations"
      title={`Recommendations`}
      lead={`Two layers live here: the canonical recommendation every agent should implement (dual-repo, content archive-backup, quality reliability), and the{{" "}} feedback channel for filing new process findings back into this SSOT.`}
    >

      <DocCallout>Start here if you are a new agent: follow the canonical recommendation end-to-end via{" "}
        <Link href="/implement">Implement</Link>. Catalogue content still stays in the vertical&apos;s
        data store — recommendations are about the <em>system</em>.</DocCallout>

      <h2>Canonical recommendation (implement this)</h2>
      <p>
        Accepted standing guidance from the Padel Africa / Cursor reference run. Full copy also in{" "}
        <code>recommendations/inbox/rec-dual-repo-quality-reliability.md</code>.
      </p>
      <table>
        <thead>
          <tr>
            <th>Pillar</th>
            <th>What to do</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Dual-repo</strong>
            </td>
            <td>
              Process SSOT → <code>sovereign.content</code> <code>main</code>. Vertical engine +
              archive → vertical feature branch → release branch. Separate commits/pushes. Detail:{" "}
              <Link href="/repos">Repos</Link>.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Live content</strong>
            </td>
            <td>
              Listings, About, media, cards, lessons → Mongo (day-to-day SSOT). Never bulk About or
              media binaries into either git tree as live content.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Archive-backup</strong>
            </td>
            <td>
              After large curate passes: <code>npm run catalog:archive-snapshot</code> → commit{" "}
              <code>archive/&lt;vertical&gt;/content/&lt;stamp&gt;/</code> on the{" "}
              <em>vertical</em> branch only (JSON + media URLs, no binaries).
            </td>
          </tr>
          <tr>
            <td>
              <strong>Quality stack</strong>
            </td>
            <td>
              Minimum: <code>about-curate</code>, <code>quality-loop</code>,{" "}
              <code>media-curate</code>, <code>archive-snapshot</code>. Add{" "}
              <code>autopilot</code> / <code>hygiene</code> when cards exist. Contracts:{" "}
              <Link href="/jobs">Jobs</Link>.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Reliability</strong>
            </td>
            <td>
              Dry-run → write → timer. Evidence over LLM. No invented facts. Media: R2 → ImgBB →
              https. Empty queues are success. Pin Node <code>22.x</code> on the SSOT site.
            </td>
          </tr>
          <tr>
            <td>
              <strong>Feedback</strong>
            </td>
            <td>
              File further process gaps as Issues below — scan open Issues before inventing a second
              vocabulary.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <Link href="/implement">Open the full Implement playbook →</Link>
      </p>

      <h2>Accepted ClassScout findings (2026-09-23)</h2>
      <p>
        Live Improve/Find evidence from ClassScout (PR{" "}
        <a href="https://github.com/moldovancsaba/classscout/pull/934">#934</a>
        ). All three help the portable system — implementation plan in{" "}
        <code>recommendations/inbox/plan-classscout-rec-6-7-8.md</code>.
      </p>
      <table>
        <thead>
          <tr>
            <th>Issue</th>
            <th>Decision</th>
            <th>Landing</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <a href="https://github.com/moldovancsaba/sovereign.content/issues/6">#6</a> street +
              chrome detectors
            </td>
            <td>
              <strong>Accept</strong> — SSOT contract + management <code>isStreetLevel</code> /
              chrome expand
            </td>
            <td>
              <Link href="/jobs">Jobs</Link> · Phase B in plan
            </td>
          </tr>
          <tr>
            <td>
              <a href="https://github.com/moldovancsaba/sovereign.content/issues/7">#7</a>{" "}
              <code>catalog:*</code> alias twins
            </td>
            <td>
              <strong>Accept (docs)</strong> — twin pattern for ClassScout; padel already native
            </td>
            <td>
              <Link href="/adopting">Adopting</Link> ·{" "}
              <Link href="/environments/cursor">Cursor</Link>
            </td>
          </tr>
          <tr>
            <td>
              <a href="https://github.com/moldovancsaba/sovereign.content/issues/8">#8</a>{" "}
              <code>generated_art_only</code>
            </td>
            <td>
              <strong>Accept hook</strong> — optional policy; padel keeps OG scrape default
            </td>
            <td>
              <Link href="/jobs">Jobs</Link> media-curate · Phase B2
            </td>
          </tr>
        </tbody>
      </table>

      <h2>How to collect new findings</h2>
      <ol>
        <li>
          Finish the job or adoption pass first. Dry-run / write counts go in Evidence — not as a
          separate lore dump.
        </li>
        <li>
          Decide whether the finding is <em>process</em> (belongs here) or <em>catalogue</em> (fix
          Mongo via <code>catalog:*</code>, never via this repo).
        </li>
        <li>
          File one recommendation per idea. Prefer a patch-shaped proposed change over a wish list.
        </li>
        <li>
          Tag priority: <code>blocker</code> / <code>high</code> / <code>medium</code> /{" "}
          <code>low</code>.
        </li>
        <li>
          Name the SSOT landing page that should absorb the change (
          <Link href="/doctrine">doctrine</Link>, <Link href="/jobs">jobs</Link>,{" "}
          <Link href="/implement">implement</Link>,{" "}
          <Link href="/environments/cursor">Cursor</Link>, <Link href="/adopting">adopting</Link>,
          or this page).
        </li>
      </ol>

      <h2>Channels</h2>
      <table>
        <thead>
          <tr>
            <th>Channel</th>
            <th>When to use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <a href="https://github.com/moldovancsaba/sovereign.content/issues/new?template=agent-recommendation.md">
                GitHub Issue
              </a>{" "}
              + label <code>agent-recommendation</code>
            </td>
            <td>Default. Fast for Cursor / OpenClaw / any agent with <code>gh</code>.</td>
          </tr>
          <tr>
            <td>
              PR → <code>recommendations/inbox/rec-*.md</code>
            </td>
            <td>When you already have a branch and want the text versioned with the SSOT.</td>
          </tr>
          <tr>
            <td>
              JSON validating{" "}
              <a href="/schemas/agent-recommendation.schema.json">
                agent-recommendation.schema.json
              </a>
            </td>
            <td>Machine-to-machine or scripted collectors; attach to the Issue or PR.</td>
          </tr>
        </tbody>
      </table>

      <h2>Required fields (new findings)</h2>
      <ul>
        <li>
          <strong>Summary</strong> — one sentence
        </li>
        <li>
          <strong>Finding</strong> — what broke or drifted
        </li>
        <li>
          <strong>Evidence</strong> — environment, vertical, jobs, counts / sample ids, timestamp
        </li>
        <li>
          <strong>Proposed change</strong> — concrete SSOT or CLI contract edit
        </li>
        <li>
          <strong>Doctrine check</strong> — no invented facts; no catalogue content in SSOT git
        </li>
      </ul>

      <h2>Agent cheat sheet</h2>
      <pre>{`# After a tick / adoption pass, open a recommendation issue:
gh issue create -R moldovancsaba/sovereign.content \\
  --label agent-recommendation \\
  --title "rec: <short slug>" \\
  --body-file ./rec-body.md

# Or drop a markdown file and open a PR into main:
# recommendations/inbox/rec-<slug>.md`}</pre>

      <h2>What maintainers do with them</h2>
      <ol>
        <li>Triage Issues labeled <code>agent-recommendation</code>.</li>
        <li>
          Accept → fold into <Link href="/doctrine">Doctrine</Link> / <Link href="/jobs">Jobs</Link>{" "}
          / <Link href="/implement">Implement</Link> / environment playbooks and close the Issue.
        </li>
        <li>Reject → comment with doctrine conflict or duplicate link; close.</li>
      </ol>
      <p>
        Agents reading this SSOT should scan open{" "}
        <a href="https://github.com/moldovancsaba/sovereign.content/labels/agent-recommendation">
          agent-recommendation
        </a>{" "}
        Issues before inventing a parallel process — and treat the canonical dual-repo recommendation
        above as already accepted.
      </p>
    </DocShell>
  );
}
