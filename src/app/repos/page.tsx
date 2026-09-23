import type { Metadata } from "next";
import Link from "next/link";
import { DocShell } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Repositories",
};

export default function RepositoriesPage() {
  return (
    <DocShell current="/repos">
      <h1>Repositories</h1>
      <p>
        The sovereign system spans two GitHub repositories. Agents must commit and push them{" "}
        <strong>separately</strong> — never mix process SSOT into a vertical tree or park vertical
        code only in this docs repo.
      </p>

      <div className="callout">
        This site (<code>sovereign.content</code> → <code>main</code>) is process transfer knowledge.
        Live catalogue content stays in each vertical&apos;s Mongo. Optional GitHub archive-backup of
        content lives on the <em>vertical</em> branch only.
      </div>

      <h2>Split</h2>
      <table>
        <thead>
          <tr>
            <th>Concern</th>
            <th>Repository</th>
            <th>Push target</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Doctrine, jobs, playbooks, recommendations</td>
            <td>
              <a href="https://github.com/moldovancsaba/sovereign.content">
                moldovancsaba/sovereign.content
              </a>
            </td>
            <td>
              <code>main</code> (Vercel → this site)
            </td>
          </tr>
          <tr>
            <td>Padel Africa engine, CLIs, vertical docs, content archive</td>
            <td>
              <a href="https://github.com/moldovancsaba/management">moldovancsaba/management</a>
            </td>
            <td>
              Feature branch → <code>release/padel-africa</code>
            </td>
          </tr>
          <tr>
            <td>Live listings / About / media</td>
            <td>Mongo (<code>padel-africa</code>)</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>

      <h2>Commit rules</h2>
      <ol>
        <li>
          Touching SSOT pages, schemas, or recommendation templates → commit here, push{" "}
          <code>main</code>.
        </li>
        <li>
          Touching <code>catalog:*</code>, media/quality code, research seeds, or{" "}
          <code>archive/padel-africa/</code> → commit on the management padel branch and push that
          branch.
        </li>
        <li>
          Improving published catalogue copy or media → Mongo via jobs; optionally refresh the
          vertical archive snapshot afterward.
        </li>
        <li>
          Process findings → <Link href="/recommendations">Recommendations</Link> Issues on this
          repo.
        </li>
      </ol>

      <h2>Content archive-backup (vertical only)</h2>
      <p>
        Recommended: keep a dated JSON backup of catalogue facts on the padel-africa branch under{" "}
        <code>archive/padel-africa/content/</code> via{" "}
        <code>npm run catalog:archive-snapshot</code> in management. That is recovery/audit — not
        live SSOT, and never belongs in <code>sovereign.content</code>.
      </p>

      <h2>Also see</h2>
      <ul>
        <li>
          <Link href="/implement">Implement</Link> — full agent playbook
        </li>
        <li>
          <Link href="/doctrine">Doctrine</Link>
        </li>
        <li>
          <Link href="/environments/cursor">Cursor playbook</Link>
        </li>
        <li>
          <Link href="/adopting">Adopting</Link>
        </li>
      </ul>
    </DocShell>
  );
}
