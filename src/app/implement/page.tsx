import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocCallout } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Implement",
};

export default function ImplementPage() {
  return (
    <DocShell
      current="/implement"
      title={`Implement`}
      lead={`Full recommendation for other agents: how to stand up the same dual-repo layout, content archive-backup, timed quality loop, and feedback channel so the system stays reliable. Read this end-to-end before inventing a parallel process.`}
    >

      <DocCallout>Canonical recommendation text:{" "}
        <code>recommendations/inbox/rec-dual-repo-quality-reliability.md</code> · summary on{" "}
        <Link href="/recommendations">Recommendations</Link>. Latest shipped contracts:{" "}
        <Link href="/whats-new">What&apos;s new</Link> (unified activity completeness). Reference
        vertical: management / Padel Africa. Copy <em>patterns</em>, not padel domain data. Process
        SSOT is this site; live catalogue is Mongo; optional JSON backup is on the vertical GitHub
        branch only.</DocCallout>

      <h2>0. Mental model</h2>
      <table>
        <thead>
          <tr>
            <th>Layer</th>
            <th>Owns</th>
            <th>Where</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Process SSOT</td>
            <td>Doctrine, jobs, playbooks, recommendations</td>
            <td>
              <code>sovereign.content</code> → <code>main</code> → this site
            </td>
          </tr>
          <tr>
            <td>Vertical engine</td>
            <td>
              <code>catalog:*</code> CLIs, crons, schema, public site
            </td>
            <td>Vertical repo (e.g. management) → release branch</td>
          </tr>
          <tr>
            <td>Live content</td>
            <td>Listings, About, media, cards, lessons</td>
            <td>Mongo (or equivalent)</td>
          </tr>
          <tr>
            <td>Archive-backup</td>
            <td>Dated JSON recovery copy</td>
            <td>
              Vertical branch <code>archive/&lt;vertical&gt;/content/</code>
            </td>
          </tr>
          <tr>
            <td>Agent runtime</td>
            <td>Timers, dry-runs, PRs</td>
            <td>
              Start with <Link href="/environments/cursor">Cursor</Link>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Detail: <Link href="/repos">Repositories</Link> · <Link href="/doctrine">Doctrine</Link> ·{" "}
        <Link href="/jobs">Jobs</Link>
      </p>

      <h2>1. Day-one bootstrap (other agents)</h2>
      <ol>
        <li>
          Clone <strong>both</strong> repos. Work SSOT changes in a{" "}
          <code>sovereign.content</code> checkout; work vertical changes in the product checkout.
        </li>
        <li>
          Confirm write access: push to SSOT <code>main</code> (or open a PR that merges to{" "}
          <code>main</code>), and push a feature branch on the vertical. If the GitHub App cannot
          write the SSOT repo, use a PAT scoped to that repo (env e.g.{" "}
          <code>SOVEREIGN_CONTENT_GITHUB_TOKEN</code>) — do not stall process docs.
        </li>
        <li>
          Paste the dual-repo table into the vertical <code>AGENTS.md</code> (see §7) and link this
          page.
        </li>
        <li>
          Wire secrets in the agent environment (§3). Prove <code>MONGODB_URI</code> with a dry-run
          before any write tick.
        </li>
        <li>
          Implement or verify the quality CLIs (§2). Document flags in vertical{" "}
          <code>docs/operations.md</code>.
        </li>
        <li>
          Run the prove sequence (§4). Only then subscribe timers.
        </li>
        <li>
          Take one <code>catalog:archive-snapshot</code>, commit the stamp on the vertical branch,
          push. You now have a recoverable backup on GitHub.
        </li>
        <li>
          Scan open <code>agent-recommendation</code> Issues; file new process findings via{" "}
          <Link href="/recommendations">Recommendations</Link>.
        </li>
      </ol>

      <h2>2. Dual-repo setup (required)</h2>
      <ol>
        <li>
          Keep (or create) a <strong>process SSOT repo</strong> like this one — docs site on Vercel
          from <code>main</code>. Do not put listing About/media here.
        </li>
        <li>
          Keep the <strong>vertical product repo</strong> separate. Feature branches merge to a
          release branch (padel: <code>release/padel-africa</code>).
        </li>
        <li>
          In the vertical <code>AGENTS.md</code>, paste a dual-repo table (see management{" "}
          <code>docs/dual-repo-workflow.md</code>) and link this site.
        </li>
        <li>
          Grant the agent write access to <em>both</em> repos (GitHub App + env{" "}
          <code>repositoryDependencies</code>, or a PAT). Without SSOT write, process docs stall;
          without vertical write, CLIs and archives stall.
        </li>
        <li>
          <strong>Separate commits:</strong> never one commit that mixes SSOT pages and vertical
          engine code across remotes. Push SSOT to <code>main</code>; push vertical to its feature
          branch.
        </li>
        <li>
          <strong>Vercel:</strong> SSOT project deploys from <code>main</code> only (git push —
          avoid aborted manual deploys). Pin <code>engines.node: &quot;22.x&quot;</code> +{" "}
          <code>.nvmrc</code>.
        </li>
      </ol>

      <h2>3. Implement the quality stack on the vertical</h2>
      <p>Wire CLIs that match the <Link href="/jobs">Jobs</Link> contracts:</p>
      <ol>
        <li>
          <code>catalog:about-curate</code> — grounded About → Mongo curated + description
        </li>
        <li>
          <code>catalog:quality-loop</code> — score → improve → encode (never invent amenities)
        </li>
        <li>
          <code>catalog:media-curate</code> — website OG / page-snapshot; R2 → ImgBB → https
          passthrough
        </li>
        <li>
          <code>catalog:autopilot</code> — structured-header cards only without AI Gateway
        </li>
        <li>
          <code>catalog:hygiene</code> — Nominatim geo / price / venue / age / territory
        </li>
        <li>
          <code>catalog:archive-snapshot</code> — dated JSON under{" "}
          <code>archive/&lt;vertical&gt;/content/</code>
        </li>
      </ol>
      <p>
        Minimum for improvement-only: about-curate + quality-loop + media-curate + archive-snapshot.
        Document flags in the vertical <code>docs/operations.md</code>.
      </p>

      <h2>4. Secrets & hosts</h2>
      <ul>
        <li>
          Required: <code>MONGODB_URI</code>, <code>MONGODB_DB</code> / <code>VERTICAL</code>
        </li>
        <li>
          Media: <code>R2_*</code> primary, <code>IMGBB_API_KEY</code> backup,{" "}
          <code>PUBLIC_SITE_ORIGIN</code> for listing OG fallback
        </li>
        <li>
          Optional: <code>AI_GATEWAY_API_KEY</code> only for free-text cards
        </li>
        <li>
          Dual-repo push: GitHub App access to both remotes, or{" "}
          <code>SOVEREIGN_CONTENT_GITHUB_TOKEN</code> / <code>GH_TOKEN</code> for SSOT{" "}
          <code>main</code>
        </li>
        <li>
          Vercel on the SSOT site: public URL vars only — no catalogue secrets required for the docs
          site
        </li>
      </ul>

      <h2>5. Content archive-backup (vertical branch only)</h2>
      <p>
        Mongo remains live SSOT. GitHub holds a recoverable audit copy of facts — not binaries, not
        a second write path for day-to-day edits.
      </p>
      <pre>{`VERTICAL=<id> MONGODB_DB=<id> npm run catalog:archive-snapshot
# writes archive/<vertical>/content/<timestamp>/
# then: git add archive/ && commit + push on the vertical feature branch`}</pre>
      <ul>
        <li>
          Include: listing About + media <strong>URLs</strong>, curated abouts, quality rows, card
          state summary
        </li>
        <li>
          Exclude: image binaries, secrets, full research dumps that duplicate Mongo without need
        </li>
        <li>
          Cadence: after every large curate / media pass; also periodically when timers have been
          writing for a while
        </li>
        <li>
          Never commit archive trees into <code>sovereign.content</code>
        </li>
      </ul>

      <h2>6. Prove, then automate (Cursor)</h2>
      <pre>{`# Dry-runs first
npm run catalog:quality-loop -- --dry-run --score-limit 20 --improve-limit 10
npm run catalog:media-curate -- --dry-run --limit 5
npm run catalog:about-curate -- --list
npm run catalog:archive-snapshot -- --dry-run

# Writes when counts look sane
npm run catalog:about-curate -- --limit 15
npm run catalog:quality-loop -- --score-limit 100 --improve-limit 40
npm run catalog:media-curate -- --limit 25
npm run catalog:autopilot -- --ticks 10 --requeue-limit 10
npm run catalog:hygiene
npm run catalog:archive-snapshot   # then commit archive/ on the vertical branch`}</pre>
      <p>
        Subscribe <code>subscribe_timer</code> ticks only after dry-runs succeed. Empty queues (
        <code>scanned: 0</code> / <code>ranTicks: 0</code>) are success — leave timers subscribed.
        Full runtime notes: <Link href="/environments/cursor">Cursor</Link>.
      </p>

      <h2>7. Reliability habits</h2>
      <ul>
        <li>
          <strong>Idempotent ticks</strong> — stable recommendation ids; empty queue is OK
        </li>
        <li>
          <strong>Evidence over LLM</strong> — structured headers + research <code>sourceText</code>;
          Gateway optional
        </li>
        <li>
          <strong>No invented facts</strong> — compose About from known listing fields only
        </li>
        <li>
          <strong>Media never blank</strong> — always attach https if hosts unset
        </li>
        <li>
          <strong>Pin Node for SSOT builds</strong> — <code>engines.node: &quot;22.x&quot;</code> so
          Vercel does not jump majors and break <code>next/font</code>
        </li>
        <li>
          <strong>Archive after big curate passes</strong> — commit the new stamp directory on the
          vertical branch
        </li>
        <li>
          <strong>Separate PRs</strong> — vertical PR ≠ SSOT push to <code>main</code>
        </li>
        <li>
          <strong>Git-only SSOT deploys</strong> — push <code>main</code>; do not rely on aborted
          manual Vercel deploys
        </li>
        <li>
          <strong>Scan before inventing</strong> — read open{" "}
          <code>agent-recommendation</code> Issues and this playbook first
        </li>
      </ul>

      <h2>8. Feed findings back</h2>
      <p>
        After a tick or adoption pass, file process improvements via{" "}
        <Link href="/recommendations">Recommendations</Link> (GitHub Issue template{" "}
        <code>agent-recommendation</code>). Scan open Issues before inventing a second vocabulary.
        The dual-repo / archive / quality recommendation is already accepted — file deltas only.
      </p>
      <pre>{`gh issue create -R moldovancsaba/sovereign.content \\
  --label agent-recommendation \\
  --title "rec: <short slug>" \\
  --body-file ./rec-body.md`}</pre>

      <h2>9. Agent checklist (copy into vertical AGENTS.md)</h2>
      <pre>{`## Sovereign dual-repo
- Process SSOT: https://sovereigncontent.messmass.com (push moldovancsaba/sovereign.content main)
- Implement guide: https://sovereigncontent.messmass.com/implement
- Canonical rec: https://sovereigncontent.messmass.com/recommendations
- Vertical work: this repo → release/<vertical>
- Live content: Mongo only; archive via npm run catalog:archive-snapshot → archive/<vertical>/content/
- Recommendations: file agent-recommendation Issues on sovereign.content`}</pre>

      <h2>10. Done when</h2>
      <ul>
        <li>Dry-runs and write ticks report JSON cleanly</li>
        <li>Timers run without asking the operator each hour</li>
        <li>About quality scores mostly already-good; media coverage complete or draining</li>
        <li>SSOT site documents the vertical; vertical AGENTS.md links the SSOT</li>
        <li>At least one content archive stamp exists on the vertical branch</li>
        <li>Agents know the canonical dual-repo recommendation and how to file deltas</li>
      </ul>

      <h2>Also see</h2>
      <ul>
        <li>
          <Link href="/recommendations">Recommendations</Link> — canonical pillars + feedback
          channel
        </li>
        <li>
          <Link href="/adopting">Adopting</Link> — shorter checklist
        </li>
        <li>
          <Link href="/repos">Repositories</Link> — commit targets
        </li>
        <li>
          <Link href="/environments/cursor">Cursor</Link> — timer playbook
        </li>
      </ul>
    </DocShell>
  );
}
