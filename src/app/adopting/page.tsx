import type { Metadata } from "next";
import Link from "next/link";
import { DocShell } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Adopting",
};

export default function AdoptingPage() {
  return (
    <DocShell
      current="/adopting"
      title={`Adopting`}
      lead={`Bring another project onto the sovereign content loop. For the full agent playbook (dual repo, archive-backup, timers, reliability habits), start at{{" "}} Implement. This page is the short checklist.`}
    >

      <h2>1. Decide the environment</h2>
      <p>
        Open the <Link href="/">root selector</Link>. Start with{" "}
        <Link href="/environments/cursor">Cursor</Link> unless the project already has a stronger
        runtime. Implement one environment fully before adding another.
      </p>

      <h2>2. Map the data store</h2>
      <ul>
        <li>Published listings (or equivalent catalogue documents)</li>
        <li>Content cards / ingest queue if discovery→publish exists</li>
        <li>Collections for curated About, quality recommendations, lessons</li>
        <li>Media array field on the public card</li>
      </ul>
      <p>
        If names differ, keep the job contracts and adapt the store seam — do not fork the doctrine.
      </p>

      <h2>3. Implement the job CLIs</h2>
      <p>
        Minimum viable set for an improvement-only vertical (no discovery):
      </p>
      <ol>
        <li>
          <code>catalog:about-curate</code>
        </li>
        <li>
          <code>catalog:quality-loop</code> (+ score / improve / encode halves)
        </li>
        <li>
          <code>catalog:media-curate</code>
        </li>
        <li>
          <code>catalog:hygiene</code> + <code>serving:reconcile</code>
        </li>
      </ol>
      <p>
        Add <code>catalog:autopilot</code>, <code>catalog:self-heal</code>,{" "}
        <code>catalog:find --until-found</code>, and <code>catalog:repair-structured-geo</code> when
        ingest / structured cards / geographic gaps exist. Contracts:{" "}
        <Link href="/jobs">Jobs</Link>. Worked Padel Africa tick (copy the pattern):{" "}
        <a href="https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/padel-africa-jobs.md">
          management docs/padel-africa-jobs.md
        </a>
        .
      </p>

      <h2>4. Wire secrets</h2>
      <table>
        <thead>
          <tr>
            <th>Secret</th>
            <th>Required for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>MONGODB_URI</code> (+ db / vertical)
            </td>
            <td>All jobs</td>
          </tr>
          <tr>
            <td>
              <code>R2_*</code>
            </td>
            <td>Primary image rehost</td>
          </tr>
          <tr>
            <td>
              <code>IMGBB_API_KEY</code>
            </td>
            <td>Backup image rehost</td>
          </tr>
          <tr>
            <td>
              <code>PUBLIC_SITE_ORIGIN</code>
            </td>
            <td>Listing page-snapshot fallback</td>
          </tr>
          <tr>
            <td>
              <code>AI_GATEWAY_API_KEY</code>
            </td>
            <td>Optional free-text autopilot only</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Prove dry-runs</h2>
      <pre>{`npm run catalog:quality-loop -- --dry-run --score-limit 20 --improve-limit 10
npm run catalog:media-curate -- --dry-run --limit 5
npm run catalog:about-curate -- --list
npm run catalog:hygiene -- --dry-run --passes contact --limit 5
npm run catalog:find -- --until-found --max-cells 8`}</pre>
      <p>
        Only then enable writes and timers. Prefer <code>--until-found</code> over bare{" "}
        <code>--status</code> for growth ticks — the agent executes <code>firstBrief</code> cells
        until one seeds (or budget exhausted). Never invent contacts.
      </p>

      <h2>5b. Vertical twins (existing runners ↔ SC names)</h2>
      <p>
        If the vertical already has battle-tested runners under other npm names, expose{" "}
        <strong>thin one-way aliases</strong> that match this SSOT&apos;s <code>catalog:*</code>{" "}
        vocabulary — do not rename the SC contracts. ClassScout reference map:{" "}
        <a href="https://github.com/moldovancsaba/classscout/blob/cursor/sovereign-content-align-b289/docs/sovereign-content-alignment.md">
          docs/sovereign-content-alignment.md
        </a>{" "}
        (PR{" "}
        <a href="https://github.com/moldovancsaba/classscout/pull/934">#934</a>
        ). Dry-run first; sparse-timer vs forever are ClassScout&apos;s two runtimes. Padel Africa /
        management already uses native <code>catalog:*</code> — and{" "}
        <code>check:cron-cli-twins</code> fails when a vercel cron lacks its npm twin.
      </p>

      <h2>6. Point agents at this SSOT</h2>
      <p>
        In the vertical&apos;s agent instructions (AGENTS.md / Cloud Agent brief), link:
      </p>
      <ul>
        <li>
          <code>https://sovereigncontent.messmass.com/implement</code> — dual-repo + archive +
          quality playbook
        </li>
        <li>
          <code>https://sovereigncontent.messmass.com/recommendations</code> — canonical
          recommendation + feedback channel
        </li>
        <li>
          <code>https://sovereigncontent.messmass.com/environments/cursor</code> — runtime playbook
        </li>
        <li>
          Vertical <code>docs/operations.md</code> — script flags local to that repo
        </li>
      </ul>

      <h2>7. Keep content out of SSOT PRs</h2>
      <p>
        CI or review heuristics should reject PRs into <code>sovereign.content</code> that add bulk
        listing prose or media. Content improvements land in Mongo. Vertical repos may commit dated{" "}
        <code>archive/&lt;vertical&gt;/content/</code> JSON snapshots (URLs + facts) — never
        binaries as live content.
      </p>

      <h2>8. Feed process findings back</h2>
      <p>
        When another agent discovers a better tactic, missing job flag, or playbook gap, file it via{" "}
        <Link href="/recommendations">Recommendations</Link> — do not fork the doctrine silently.
      </p>

      <h2>Reference vertical</h2>
      <p>
        Management / Padel Africa on branch <code>release/padel-africa</code> is the working
        reference: published listings across Africa, R2 primary + ImgBB backup media rehost, Cloud
        Agent timers for about / quality / media / hygiene / FIND / autopilot, Mongo-only content
        ticks (no GDS), and <code>catalog:find --until-found</code> for evidence-only research FIND.
        Worked CLI examples:{" "}
        <a href="https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/padel-africa-jobs.md">
          docs/padel-africa-jobs.md
        </a>
        . Copy the pattern, not the padel domain data.
      </p>
    </DocShell>
  );
}
