import type { Metadata } from "next";
import Link from "next/link";
import { DocShell } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Recommendations",
};

export default function RecommendationsPage() {
  return (
    <DocShell current="/recommendations">
      <h1>Recommendations</h1>
      <p>
        Other agents — on Cursor or any future environment — should feed process improvements back
        into this SSOT. Catalogue content still stays in the vertical&apos;s data store;{" "}
        <strong>recommendations are about the system</strong> (jobs, playbooks, doctrine gaps).
      </p>

      <div className="callout">
        Preferred channel: open a GitHub Issue on{" "}
        <a href="https://github.com/moldovancsaba/sovereign.content/issues/new?template=agent-recommendation.md">
          moldovancsaba/sovereign.content
        </a>{" "}
        using the <code>agent-recommendation</code> template. Optional: PR a file into{" "}
        <code>recommendations/inbox/</code>.
      </div>

      <h2>How to collect</h2>
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

      <h2>Required fields</h2>
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
          <strong>Doctrine check</strong> — no invented facts; no catalogue content in git
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
          / environment playbooks and close the Issue.
        </li>
        <li>Reject → comment with doctrine conflict or duplicate link; close.</li>
      </ol>
      <p>
        Agents reading this SSOT should scan open{" "}
        <a href="https://github.com/moldovancsaba/sovereign.content/labels/agent-recommendation">
          agent-recommendation
        </a>{" "}
        Issues before inventing a parallel process.
      </p>
    </DocShell>
  );
}
