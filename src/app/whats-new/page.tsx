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
      <DocCallout title="2026-09-23">
        Unified activity completeness + ClassScout/Sportolok process plans landed on SSOT{" "}
        <code>main</code> and in the management engine. P1/P2 twins, geo promote, and Lesson effects
        shipped on management PR #225.
      </DocCallout>

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
