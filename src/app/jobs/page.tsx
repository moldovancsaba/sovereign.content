import type { Metadata } from "next";
import { DocShell } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Jobs",
};

export default function JobsPage() {
  return (
    <DocShell current="/jobs">
      <h1>Jobs</h1>
      <p>
        Portable job contracts. Adopter verticals implement these as <code>npm run catalog:*</code>{" "}
        scripts (and optional HTTP cron twins). Agents call the CLI form — no CRON_SECRET required
        for Cloud Agent ticks.
      </p>

      <h2>catalog:quality-loop</h2>
      <p>
        Closed loop over <strong>published</strong> listings: score About prose → open
        recommendations → apply safe upgrades → encode lessons. Never invents venues.
      </p>
      <ul>
        <li>
          <strong>Halves:</strong> <code>quality-score</code>, <code>quality-improve</code>,{" "}
          <code>quality-encode</code>
        </li>
        <li>
          <strong>Defects:</strong> thin / template / inline URL / chrome / contact leak / operator
          feedback
        </li>
        <li>
          <strong>Tactics:</strong> strip chrome → curated About (Mongo) → fact composer
        </li>
        <li>
          <strong>Writes:</strong> recommendations, <code>listings.description</code>, serving,
          lessons
        </li>
        <li>
          <strong>Flags:</strong> <code>--dry-run</code>, <code>--score-limit</code>,{" "}
          <code>--improve-limit</code>
        </li>
        <li>
          <strong>Env:</strong> <code>MONGODB_URI</code>, optional <code>MONGODB_DB</code> /{" "}
          <code>VERTICAL</code>
        </li>
      </ul>

      <h2>catalog:about-curate</h2>
      <p>
        Agent twin of fixing one provider About by hand. Drafts recommendation-tone prose from
        listing facts + research <code>sourceText</code>, upserts{" "}
        <code>listing_curated_abouts</code>, writes description, refreshes serving.
      </p>
      <ul>
        <li>
          Explicit draft: <code>--listing-id</code> + <code>--about &quot;…&quot;</code>
        </li>
        <li>
          Bounded auto pass: <code>--limit N</code>
        </li>
        <li>Rules: ~300–450 chars when curated; no inline URLs or phones</li>
      </ul>

      <h2>catalog:autopilot</h2>
      <p>
        Bounded discover→extract→prepare→gate→publish cycles. Requeues stuck REVIEW_READY /
        BLOCKED_REPAIRABLE / QUARANTINED cards that already carry structured{" "}
        <code>Name:</code> / <code>CountryCode:</code> / lat-lng headers. No AI Gateway required for
        that path.
      </p>
      <ul>
        <li>
          Flags: <code>--ticks N</code> (default 10), <code>--requeue-limit N</code>
        </li>
        <li>Empty queue is a normal zero-cost tick</li>
      </ul>

      <h2>catalog:hygiene</h2>
      <p>
        Twin of catalog-backfill: geo (Nominatim), price, venue-model, age, territory drains. No
        Google key, no AI Gateway.
      </p>
      <ul>
        <li>
          Flags: <code>--passes geo,price,...</code>, <code>--dry-run</code>
        </li>
        <li>
          Sets a default <code>GEOCODER_USER_AGENT</code> when unset
        </li>
      </ul>

      <h2>catalog:media-curate</h2>
      <p>Fill PUBLISHED listings with empty media arrays.</p>
      <ol>
        <li>Prefer website <code>og:image</code> / large images</li>
        <li>Else listing page Open Graph snapshot from the public site</li>
        <li>Rehost bytes: R2 primary → ImgBB backup → https passthrough if neither host set</li>
      </ol>
      <ul>
        <li>
          Host env: <code>R2_*</code> and/or <code>IMGBB_API_KEY</code>
        </li>
        <li>
          Optional <code>PUBLIC_SITE_ORIGIN</code> for page-snapshot fallback
        </li>
        <li>
          Flags: <code>--limit N</code>, <code>--listing-id</code>, <code>--dry-run</code>
        </li>
      </ul>

      <h2>catalog:repair-structured-geo</h2>
      <p>
        One-shot repair for structured-header cards that have research prose but empty Address /
        lat-lng — upsert research-grounded geo headers, requeue, optionally{" "}
        <code>--run-autopilot</code>.
      </p>

      <h2>Suggested timer cadence (Cursor)</h2>
      <table>
        <thead>
          <tr>
            <th>Job</th>
            <th>Suggested interval</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>catalog:about-curate</code>
            </td>
            <td>Every few hours while About debt remains</td>
          </tr>
          <tr>
            <td>
              <code>catalog:quality-loop</code>
            </td>
            <td>Daily (or after each about-curate batch)</td>
          </tr>
          <tr>
            <td>
              <code>catalog:autopilot</code>
            </td>
            <td>Every 15–60 minutes while cards are queued</td>
          </tr>
          <tr>
            <td>
              <code>catalog:hygiene</code>
            </td>
            <td>Daily</td>
          </tr>
          <tr>
            <td>
              <code>catalog:media-curate</code>
            </td>
            <td>Until media coverage is complete, then weekly</td>
          </tr>
        </tbody>
      </table>
      <p>
        Wire these via <code>subscribe_timer</code> in the Cursor Cloud Agent playbook.
      </p>
    </DocShell>
  );
}
