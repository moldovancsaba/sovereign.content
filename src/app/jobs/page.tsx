import type { Metadata } from "next";
import { DocShell } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Jobs",
};

export default function JobsPage() {
  return (
    <DocShell
      current="/jobs"
      title={`Jobs`}
      lead={`Portable job contracts. Adopter verticals implement these as npm run catalog:*{{" "}} scripts (and optional HTTP cron twins). Agents call the CLI form — no CRON_SECRET required for Cloud Agent ticks.`}
    >

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
          <strong>Writes (required):</strong> recommendations, <code>listings.description</code>,
          lessons — <strong>Mongo only</strong>
        </li>
        <li>
          <strong>No GDS / pack load</strong> on this tick. There is no{" "}
          <code>--with-serving</code> flag. Refresh public cards afterward with{" "}
          <code>serving:reconcile</code>.
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

      <h2>Content jobs do not need GDS</h2>
      <p>
        GDS is a UI primitives package. Catalogue content ticks (
        <code>about-curate</code>, <code>quality-loop</code>, <code>media-curate</code>,{" "}
        <code>hygiene</code>, <code>find</code>, <code>self-heal</code>, <code>autopilot</code>)
        write Mongo only. Use <code>serving:reconcile</code> when public cards need a projection
        refresh. Do not treat pack-load failures as content failures.
      </p>

      <h2>Worked example — Padel Africa reference tick</h2>
      <p>
        Copy this pattern into other verticals. Full walkthrough with JSON shapes: management{" "}
        <a href="https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/padel-africa-jobs.md">
          docs/padel-africa-jobs.md
        </a>{" "}
        (PR{" "}
        <a href="https://github.com/moldovancsaba/management/pull/227">#227</a>
        ).
      </p>
      <pre>{`npm run catalog:self-heal -- --status
npm run catalog:about-curate -- --limit 15
npm run catalog:quality-loop -- --score-limit 100 --improve-limit 40
npm run catalog:media-curate -- --limit 25          # R2 primary / ImgBB backup
npm run catalog:hygiene
npm run serving:reconcile -- --limit 200
npm run catalog:find -- --until-found --max-cells 8 # agent executes briefs
npm run catalog:autopilot -- --ticks 10 --requeue-limit 10`}</pre>
      <ul>
        <li>
          Settled ticks (<code>considered=0</code> / <code>alreadyGood=100</code> /{" "}
          <code>ranTicks=0</code>) are normal — grow with FIND, never invent venues.
        </li>
        <li>
          Media hosts: Cloudflare <strong>R2 primary</strong>, <strong>ImgBB backup</strong>, else
          https passthrough. Scripts load <code>.env.local</code>.
        </li>
        <li>
          FIND: CLI plans/seeds; agent WebSearches <code>firstBrief</code>, verifies evidence bar,
          records <code>seeded</code> or <code>zero-result</code>, stops on first seed.
        </li>
        <li>
          Copy hygiene includes careers/donate <strong>and</strong> chatbot / FAQ /
          translate-consent chrome (ClassScout depth absorbed into the portable validator).
        </li>
      </ul>

      <h2>Dense-US twin — ClassScout (do not merge engines)</h2>
      <p>
        ClassScout keeps <strong>forever Find</strong> and{" "}
        <code>generated_art_only</code> media as product defaults. Padel keeps research{" "}
        <code>--until-found</code> and OG scrape → R2. Export <em>orchestration</em>, not domain
        fixtures.
      </p>
      <table>
        <thead>
          <tr>
            <th>Adopt from SC / padel</th>
            <th>Keep ClassScout-local</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>catalog:self-heal</code> (pause Find when About debt hot; surface operator
              feedback)
            </td>
            <td>
              <code>catalog-loop:forever</code> / fair-use seed queue
            </td>
          </tr>
          <tr>
            <td>About quality bar ~75; locality name-drop alone ≠ pass</td>
            <td>Multi-city ↔ borough integrity / mis-geo hide</td>
          </tr>
          <tr>
            <td>
              <code>serving:reconcile</code> in sparse-timer after about/media
            </td>
            <td>
              <code>generated_art_only</code> media default
            </td>
          </tr>
          <tr>
            <td>
              <code>catalog:archive-snapshot</code>; contact enrich hygiene;{" "}
              <code>check:cron-cli-twins</code>
            </td>
            <td>Strict ingest schema / E.164 product gate</td>
          </tr>
          <tr>
            <td>
              <code>--until-found</code> as <em>complement</em> when seed queue idles
            </td>
            <td>Client-feedback P0/P1 hygiene depth beyond base SC contract</td>
          </tr>
        </tbody>
      </table>
      <p>
        Vertical alias map: ClassScout{" "}
        <a href="https://github.com/moldovancsaba/classscout/blob/main/docs/sovereign-content-alignment.md">
          docs/sovereign-content-alignment.md
        </a>
        . Twin knowledge + results lens: management{" "}
        <a href="https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/classscout-sovereign-twin.md">
          docs/classscout-sovereign-twin.md
        </a>
        . Refresh the ClassScout alignment doc when twins land.
      </p>

      <h2>catalog:about-curate</h2>
      <p>
        Agent twin of fixing one provider About by hand. Drafts recommendation-tone prose from
        listing facts + research <code>sourceText</code>, upserts{" "}
        <code>listing_curated_abouts</code>, writes description. <strong>Mongo only</strong> — no
        GDS. Refresh cards with <code>serving:reconcile</code> afterward.
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

      <h2>catalog:self-heal</h2>
      <p>
        Unified About + research debt status. When debt is hot, FIND{" "}
        <code>--until-found</code> defers and prints heal-first briefs.{" "}
        <code>--status</code> reports <code>openOperatorFeedback</code> (
        <code>/stats</code> card notes) and instructs <code>catalog:quality-loop</code> — never
        paste the operator note into About. Record process lessons with{" "}
        <code>--record-process</code>. Guide (management):{" "}
        <code>docs/padel-africa-self-heal.md</code>.
      </p>
      <pre>{`npm run catalog:self-heal -- --status
npm run catalog:self-heal -- --brief`}</pre>

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
        Twin of catalog-backfill: geo (Nominatim), price, venue-model, age, territory,{" "}
        <strong>contact</strong> drains. No Google key, no AI Gateway, no Ollama.
      </p>
      <ul>
        <li>
          Flags: <code>--passes geo,price,contact,...</code>, <code>--dry-run</code>
        </li>
        <li>
          Sets a default <code>GEOCODER_USER_AGENT</code> when unset
        </li>
        <li>
          <strong>contact</strong> fills blank phone / website / email from linked card{" "}
          <code>sourceText</code> headers or a promotable <code>source.sourceUrl</code> (never
          OSM/Maps search; never invents). Also: <code>catalog:contact-enrich</code>.
        </li>
      </ul>

      <h2>catalog:find</h2>
      <p>
        Cloud Agent <strong>FIND</strong> for <em>new</em> venues — portable research path,{" "}
        <strong>not</strong> ClassScout NYC fair-use / forever Find. Evidence-only. Prefer{" "}
        <code>--until-found</code> (do-until-seed campaign); CLI plans/seeds only — the agent must
        WebSearch and verify the evidence bar.
      </p>
      <pre>{`npm run catalog:find -- --until-found --max-cells 8
# Agent: execute firstBrief cells → seed OR zero-result → stop on seeded
npm run catalog:find -- --fixture=scripts/data/<country>-verified.json --dry-run
npm run catalog:find -- --fixture=scripts/data/<country>-verified.json
npm run catalog:find -- --record-attempt --cc=XX --city="City" --outcome=seeded`}</pre>
      <ul>
        <li>
          Never invent phones, emails, ages, or court counts. Honest{" "}
          <code>zero-result</code> when no evidence-grade venue appears.
        </li>
        <li>
          On <code>seeded</code>: apply fixture, record attempt, <strong>STOP</strong> the campaign.
        </li>
        <li>
          Padel Africa proof: EG Giza, NG Ibadan (Padel Pro Club), SN Dakar, TZ/ZM/LY/GQ seeds —
          management{" "}
          <a href="https://github.com/moldovancsaba/management/pull/227">PR #227</a>. Worked
          example:{" "}
          <a href="https://github.com/moldovancsaba/management/blob/release/padel-africa/docs/padel-africa-jobs.md">
            padel-africa-jobs.md
          </a>
          .
        </li>
      </ul>

      <h2>About quality bar (do not false-green soft copy)</h2>
      <p>
        <code>ABOUT_QUALITY_TARGET = 75</code>. Locality name-drop alone must not clear the bar
        (soft ~55 Abouts were scoring 55+15=70 and starving about-curate / quality-loop). Soft Abouts
        without recommendation tone stay in the improve queue. Engine: management PR #227.
      </p>

      <h2>catalog:media-curate</h2>
      <p>Fill PUBLISHED listings with empty media arrays (when policy allows scrape).</p>
      <ol>
        <li>Prefer website <code>og:image</code> / large images</li>
        <li>Else listing page Open Graph snapshot from the public site</li>
        <li>Rehost bytes: <strong>R2 primary</strong> → ImgBB backup → https passthrough if neither host set</li>
      </ol>
      <ul>
        <li>
          Host env: <code>R2_*</code> (primary) and/or <code>IMGBB_API_KEY</code> (backup). Scripts
          load <code>.env.local</code> / <code>.env</code>.
        </li>
        <li>
          Optional <code>PUBLIC_SITE_ORIGIN</code> for page-snapshot fallback
        </li>
        <li>
          Flags: <code>--limit N</code>, <code>--listing-id</code>, <code>--dry-run</code>,
          optional <code>--policy allow_og_scrape|generated_art_only</code> (or{" "}
          <code>MEDIA_CURATE_POLICY</code>)
        </li>
        <li>
          <strong>Policy (optional vertical hook):</strong>{" "}
          <code>allow_og_scrape</code> (default — Padel Africa) runs the scrape hierarchy above.{" "}
          <code>generated_art_only</code> is coverage/report (+ optional generate-and-host of
          synthetic art); it must <em>not</em> download venue photographs. Host hierarchy still
          applies to generated bytes. See{" "}
          <a href="https://github.com/moldovancsaba/sovereign.content/issues/8">recommendation #8</a>
          .
        </li>
      </ul>

      <h2>Street-line + weak-copy extract contract</h2>
      <p>
        Shared detector contract for About / address repair / Find deep enrich (reference:
        ClassScout extractors — do not invent a second vocabulary). Folded from{" "}
        <a href="https://github.com/moldovancsaba/sovereign.content/issues/6">recommendation #6</a>.
      </p>
      <ul>
        <li>
          <strong>Accept street tokens:</strong> Court/Ct, Terrace/Ter, Concourse, Square, Circle,
          Island, bare Pl (after CSS reject), capitalized <code>… Way</code>, hyphenated
          borough/district forms, spelled house numbers, venue-prefix peel,{" "}
          <code>&amp;</code> / <code>at</code> / <code>and</code> intersections.
        </li>
        <li>
          <strong>Reject:</strong> dual-site blurbs, prose lowercase “way”, CSS utility strings,
          PO-box-only as street. Neighborhood-only lines are not street-level (geo may stay
          locality).
        </li>
        <li>
          <strong>Weak-copy chrome:</strong> unresolved <code>{"{template_tokens}"}</code>, leading
          Contact-form chrome, consent-banner false positives — alongside URL / Sources / cookie
          chrome already in public-description validators.
        </li>
        <li>
          Verticals add locale/region fixtures (e.g. Africa mall / Sports Village) as tests, never
          invented venues.
        </li>
      </ul>

      <h2>Autonomy model (not a % threshold)</h2>
      <p>
        Publish authority is the binary gate (<code>pass</code> / <code>blocker</code> /{" "}
        <code>flag</code>), not a float like <code>autonomyThreshold: 0.95</code>. Gate-clean cards
        auto-publish; soft-incomplete cards land at <code>REVIEW_READY</code> with a real listing
        (publish-now-enrich-later). Recoverable families include media + completeness.
      </p>

      <h2>Activity completeness (always on)</h2>
      <p>
        Every vertical pack declares <code>activityCompleteness</code> keyed by taxonomy slug (plus a
        default). <code>checkCompleteness</code> always resolves the listing&apos;s lead activity →
        required vs soft fields (description, schedule, price, geo, media). This is the unified
        substitute for sportolok&apos;s “weighted % gates” ask — hard vs soft per activity, not a
        second publish authority. Padel Africa ships profiles for{" "}
        <code>padel-club</code> / courts / coaching / tournaments / shops on day one; adding{" "}
        <code>tennis-club</code> or <code>squash-club</code> is a new taxonomy row + profile (often
        reuse the court-venue profile). Plan:{" "}
        <code>recommendations/inbox/plan-sportolok-gate-feedback.md</code>.
      </p>

      <h2>catalog:repair-structured-geo</h2>
      <p>
        One-shot repair for structured-header cards that have research prose but empty Address /
        lat-lng — upsert research-grounded geo headers, requeue, optionally{" "}
        <code>--run-autopilot</code>.
      </p>

      <h2>Cron ↔ CLI twins (required check)</h2>
      <p>
        Doctrine: every scheduled HTTP cron must have an <code>npm run</code> twin agents can call
        without <code>CRON_SECRET</code>. Management enforces this with{" "}
        <code>npm run check:cron-cli-twins</code> (gauntlet). Prefer <code>catalog:*</code> names for
        content jobs; serving / curator may keep established names.
      </p>

      <h2>catalog:lessons / override-insights</h2>
      <p>
        Force-publish waiver patterns become <code>SovereignLesson</code> rows with effects{" "}
        <code>suggest-config</code> | <code>soften-required</code> | <code>none</code>. Effects are
        hints only — humans accept pack PRs. <code>real-address</code> / territory / safety /
        knowledge always get <code>none</code> (never silent blocker mutation).
      </p>

      <h2>Promote scoring (not publish)</h2>
      <p>
        Geographic-gap boost on popularity rank may raise listings in sparse country/locality cells
        so visitors discover underserved places. Allowed for delivery. Forbidden as publish
        authority.
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
              <code>catalog:self-heal</code>
            </td>
            <td>Before FIND when debt is hot; otherwise status-only</td>
          </tr>
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
              <code>catalog:media-curate</code>
            </td>
            <td>Until media coverage is complete, then weekly</td>
          </tr>
          <tr>
            <td>
              <code>catalog:hygiene</code> + <code>serving:reconcile</code>
            </td>
            <td>Daily / after About–media batches</td>
          </tr>
          <tr>
            <td>
              <code>catalog:find --until-found</code>
            </td>
            <td>Recurring while sparse/missing markets remain (agent executes briefs)</td>
          </tr>
          <tr>
            <td>
              <code>catalog:autopilot</code>
            </td>
            <td>Every 15–60 minutes while cards are queued</td>
          </tr>
        </tbody>
      </table>
      <p>
        Wire these via <code>subscribe_timer</code> in the Cursor Cloud Agent playbook.
      </p>

      <h2>Portable contracts from ClassScout live audits (#6–#21)</h2>
      <p>
        Absorbed as SSOT so every vertical inherits them. Evidence: ClassScout Find/Improve +
        YourField client-feedback audit 2026-09-23. Do not port NYC fair-use feeders or{" "}
        <code>forever.sh</code> as-is — port the contracts. Plan:{" "}
        <code>recommendations/inbox/plan-classscout-recs-6-21.md</code>.
      </p>
      <table>
        <thead>
          <tr>
            <th>Issue</th>
            <th>Contract</th>
            <th>Dry-run check</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>#6</td>
            <td>
              Street-line accept (Court/Terrace/Concourse/… Way) + reject CSS/prose; weak-copy
              chrome (<code>{"{tokens}"}</code>, Contact-form). Engine: <code>isStreetLevel</code>{" "}
              before Nominatim.
            </td>
            <td>
              <code>catalog:hygiene --dry-run --passes geo</code> skips non-street line1
            </td>
          </tr>
          <tr>
            <td>#7</td>
            <td>
              Vertical twins: thin npm aliases to SC <code>catalog:*</code> names; dry-run first;
              sparse-timer vs forever.
            </td>
            <td>See Adopting / Cursor</td>
          </tr>
          <tr>
            <td>#8</td>
            <td>
              <code>media-curate --policy allow_og_scrape|generated_art_only</code>
            </td>
            <td>
              <code>--dry-run --policy generated_art_only</code> → applied=0 scrape
            </td>
          </tr>
          <tr>
            <td>#10</td>
            <td>
              Find/autopilot: deep multi-page enrich <strong>before</strong> street gate; prefer
              /contact /locations; page streets rank above seed.address.
            </td>
            <td>Find ports: page street wins over junk seed</td>
          </tr>
          <tr>
            <td>#11</td>
            <td>
              Dedupe <code>sourceUrls</code> within-doc before upsert; do not mark seeds done on
              within-doc duplicate rejects; revive false <code>duplicate_source_url</code> dones.
            </td>
            <td>Autopilot/Find dry-run does not retire seeds on within-doc dupes</td>
          </tr>
          <tr>
            <td>#12</td>
            <td>
              Quality-loop: open recs for priority public gaps; Improve consumes open recs before
              oldest soft blanks; settle applied/skipped/failed (+ cooldown). Optional{" "}
              <code>CATALOG_IMPROVE_PREFER_LANE</code> after recs — soft blanks stay soft.
            </td>
            <td>
              <code>catalog:quality-loop --dry-run</code>
            </td>
          </tr>
          <tr>
            <td>#13</td>
            <td>
              Hygiene must <code>close()</code> Mongo in <code>finally</code> and exit 0/1 — hung
              after green summary = client leak.
            </td>
            <td>
              <code>catalog:hygiene --dry-run --limit 1</code> returns &lt;30s
            </td>
          </tr>
          <tr>
            <td>#15</td>
            <td>
              Region from pack territory ladder / registry before free-text city; outside primary
              market → hide or inventory-only (padel: continent Africa scope).
            </td>
            <td>Territory gate / quarantine-outside-territory dry-run</td>
          </tr>
          <tr>
            <td>#16</td>
            <td>
              Never invent default age search buckets. Empty ages = “Age not confirmed”; Improve
              fills from official pages only.
            </td>
            <td>No invented 3–5/6–8/9–12 triples on blank sources</td>
          </tr>
          <tr>
            <td>#17</td>
            <td>
              Reject placeholder emails/phones (<code>your@email.com</code>, all-zero) at
              Find/upsert; clear &gt; publish.
            </td>
            <td>Structured extract drops <code>+18000000000</code></td>
          </tr>
          <tr>
            <td>#19</td>
            <td>
              Delivery labels: <code>host_sites</code> = “Partner venues”; only{" "}
              <code>in_home</code> = “Comes to you”.
            </td>
            <td>Card fact for host_sites ≠ Comes to you</td>
          </tr>
          <tr>
            <td>#20</td>
            <td>
              Quarantine weak-About (store-policy / careers / DONATE / April Fool); strong-identity
              dupe (same phone+street) → hide weaker twin.
            </td>
            <td>
              <code>validatePublicDescription</code> flags careers/donate chrome
            </td>
          </tr>
          <tr>
            <td>#21</td>
            <td>
              Direct-Mongo repair = schema-subset only. Repair notes in script report — never{" "}
              <code>$set</code> audit keys like <code>lastContentRepair*</code> that break ingest
              422.
            </td>
            <td>Repair script report-only; ingest Improve accepts patch</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>#18 Martial Arts collective mark:</strong> deferred — only for multi-sport verticals
        with a martial-family taxonomy. Padel Africa does not declare one.
      </p>

      <h2>Empty-tick bottleneck → FIND + contact (2026-09-23)</h2>
      <p>
        When about/media/quality ticks return considered=0 / scanned=0 / alreadyGood=100, check:
      </p>
      <ol>
        <li>
          About false-green (fixed: target 75 + capped locality bonus) — re-run{" "}
          <code>about-curate --list</code>
        </li>
        <li>
          Contact gaps outside About jobs — run <code>catalog:hygiene --passes contact</code> or{" "}
          <code>catalog:contact-enrich</code>
        </li>
        <li>
          Empty <code>content_cards</code> work queue — autopilot cannot invent venues; use{" "}
          <code>catalog:find</code> research FIND (or enable curator later)
        </li>
      </ol>
    </DocShell>
  );
}
