import type { Metadata } from "next";
import { DocShell } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Doctrine",
};

export default function DoctrinePage() {
  return (
    <DocShell current="/doctrine">
      <h1>Doctrine</h1>
      <p>
        Sovereign Content is the transfer layer for an agentic catalogue system that already proved
        itself on live verticals (Padel Africa management): timed jobs, Mongo as content store,
        deterministic quality loops, and media rehost — without parking catalogue copy in git.
      </p>

      <div className="callout">
        This repository is knowledge only. Listings, About prose, curated overrides, media URLs, and
        lessons live in the project&apos;s data store. Optional GitHub archive-backup belongs on the{" "}
        <em>vertical</em> branch only — see <a href="/repos">Repositories</a>. Adopters copy
        patterns and CLIs; never seed live catalogue content into this repo.
      </div>

      <h2>Non-negotiables</h2>
      <ol>
        <li>
          <strong>Content stays out of this SSOT repo.</strong> About text, curated overrides, and
          media attachments are Mongo (or equivalent) documents for day-to-day work. Verticals may
          keep dated JSON archive-backups on their own branch; PRs here carry process docs only.
        </li>
        <li>
          <strong>Jobs are CLI twins of crons.</strong> Every Cloud Agent tick maps to an{" "}
          <code>npm run catalog:*</code> script that the same vertical already exposes as HTTP cron.
          No secret-only path that agents cannot call.
        </li>
        <li>
          <strong>Improve, do not invent.</strong> Quality loops upgrade published cards. They do not
          invent venues, amenities, prices, or court counts. Compose from known facts; refuse
          speculation.
        </li>
        <li>
          <strong>Evidence over LLM default.</strong> Structured headers and research{" "}
          <code>sourceText</code> drive autopilot when present. LLM (AI Gateway) is optional for
          free-text cards — never a hard dependency for the sovereign loop.
        </li>
        <li>
          <strong>Media has a host hierarchy.</strong> Discover imagery (website OG / page snapshot),
          rehost to R2 primary then ImgBB backup; if neither host is configured, attach the
          discovered https URL so the catalogue is never left blank.
        </li>
        <li>
          <strong>One environment at a time.</strong> The root of this site is an environment
          selector. Build the playbook for that runtime completely before branching to the next.
        </li>
      </ol>

      <h2>System shape</h2>
      <table>
        <thead>
          <tr>
            <th>Layer</th>
            <th>Owns</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vertical app (e.g. management)</td>
            <td>Catalog schema, CLIs, crons, serving, public site</td>
          </tr>
          <tr>
            <td>Data store</td>
            <td>
              <code>listings</code>, <code>content_cards</code>, curated abouts, quality recs /
              lessons, media
            </td>
          </tr>
          <tr>
            <td>Agent runtime</td>
            <td>Timed ticks, research, PR delivery, env secrets</td>
          </tr>
          <tr>
            <td>
              <strong>sovereign.content</strong> (this site)
            </td>
            <td>Doctrine, job contracts, environment playbooks, adoption checklist</td>
          </tr>
        </tbody>
      </table>

      <h2>Proven reference loop</h2>
      <p>On Padel Africa the closed loop that agents run on a timer looks like this:</p>
      <ol>
        <li>
          <code>catalog:about-curate</code> — draft grounded About into Mongo
        </li>
        <li>
          <code>catalog:quality-loop</code> — score → improve → encode lessons
        </li>
        <li>
          <code>catalog:autopilot</code> — advance structured content cards toward publish
        </li>
        <li>
          <code>catalog:hygiene</code> — geo / price / venue-model drains via Nominatim
        </li>
        <li>
          <code>catalog:media-curate</code> — fill empty media (R2 → ImgBB → https passthrough)
        </li>
      </ol>
      <p>
        Full contracts live on <a href="/jobs">Jobs</a>. The first runtime playbook is{" "}
        <a href="/environments/cursor">Cursor</a>.
      </p>
    </DocShell>
  );
}
