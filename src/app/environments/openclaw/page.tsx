import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocCallout } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "OpenClaw environment",
};

export default function OpenClawEnvironmentPage() {
  return (
    <DocShell
      current="/environments/openclaw"
      title={`OpenClaw`}
      lead={`A single self-hosted Python pipeline that has been running these three verticals in parallel with Cursor for months — no Mongo access at all, writes only through each vertical's own public ingest API, and a local model instead of AI Gateway.`}
    >

      <DocCallout>Use this playbook for a vertical that already exposes <code>POST /api/ingest</code>{" "}
        (or an equivalent public write API) and has no Cursor Cloud environment linked, or where a
        local, non-cloud worker is preferred. classscout, padel-africa and sportolok are all
        already live here today.</DocCallout>

      <h2>What OpenClaw owns</h2>
      <ul>
        <li>
          One Python job vocabulary, shared by all three verticals through config, not forked per
          vertical: discovery (find), enrichment (hygiene / about-curate), maintenance, polish,
          plus a newer <code>catalog:*</code>-named layer (completeness census, quality-loop,
          media-curate, self-heal, archive-snapshot) added to close the gap with this contract
        </li>
        <li>
          A single round-robin queue across every client of every application it serves (not one
          timer per vertical) — one job at a time, a 480s hard per-job timeout, a cooldown between
          jobs, so no two jobs ever contend for the one local model slot
        </li>
        <li>
          Research passes that write through each vertical&apos;s own public API only —{" "}
          <strong>no direct database access, ever</strong>, on any vertical, including the ones
          Cursor reaches over Mongo
        </li>
        <li>
          Evidence-only find: web-research → page fetch → a local-model qualification pass →
          submit (never invent phones/emails/ages/court counts — the same bar this SSOT sets)
        </li>
        <li>Code fixes and docs via commits to this environment&apos;s own private workspace repo</li>
      </ul>

      <h2>Bootstrap checklist</h2>
      <ol>
        <li>
          Vertical exposes a public ingest API (bearer or API-key authenticated) — the job CLIs
          from the <Link href="/jobs">Jobs</Link> contract are the reference shape; OpenClaw calls
          the vertical&apos;s own API surface, never <code>catalog:*</code> npm scripts directly.
        </li>
        <li>
          Worker has the vertical&apos;s ingest credential, and a local model reachable (this
          environment runs Ollama; any locally-reachable model works) — no <code>MONGODB_URI</code>,
          no AI Gateway key, on any tick.
        </li>
        <li>
          Agent reads this SSOT (<code>https://sovereigncontent.messmass.com</code>) plus its own
          workspace&apos;s job-vocabulary alignment doc for the exact CLI flags.
        </li>
        <li>
          First tick is always <code>--dry-run</code> until counts look sane — and the dry-run
          branch must sit <em>before</em> every check a real run would hit, not after. See
          Reliability below: this was violated for 12 days without anyone noticing, because the
          dry-run path never reached the broken check.
        </li>
        <li>
          Subscribe a job to the automatic queue only after a dry-run succeeds, a small real run is
          read back and confirmed, and every gate the vertical&apos;s other jobs already share
          (quarantine, robots, ownership, forbidden-content) applies to the new job too — not a
          private copy of any of them.
        </li>
      </ol>

      <h2>Reference tick</h2>
      <p>
        One job runs per queue turn, not a chained orchestrator prompt — a timer cannot hand off to
        the next job the way it can on Cursor, so each step below is its own scheduled entry,
        round-robined with every other client&apos;s jobs on the same queue:
      </p>
      <pre>{`# One queue, one job per turn, every ~150s — not a single chained wake
<vertical>-discovery     # find: web-research -> qualify -> submit
<vertical>-enrichment    # hygiene: geo / price / venue-model / contact backfill on existing records
<vertical>-maintenance   # oldest-verified-first re-check (classscout only)
<vertical>-polish        # readability-only pass, never re-extraction
# newer, dry-run proven, not yet subscribed to the queue above:
catalog_completeness.py  # per-field presence census, written to disk, tracked over time
catalog_quality_loop.py  # re-score published About against the SAME rules write-time uses; bounded improve
catalog_media_curate.py  # image-coverage report + a real-photo retry (no art generation here)
catalog_self_heal.py     # heal-first signal read by a human-run orchestrator; not yet load-bearing`}</pre>

      <h2>Find playbook</h2>
      <ol>
        <li>Web-search a locality/query pair from the vertical&apos;s own declared scope</li>
        <li>Fetch the candidate page; check robots, ownership, and the forbidden-content list before spending any model call</li>
        <li>
          Evidence bar: a local-model qualification pass reads the fetched page only — never the
          search snippet — and the result is checked against the page again before anything is
          composed from it
        </li>
        <li>Seed: submit through the ingest API; a rejection is logged with the API&apos;s own reason, never guessed</li>
        <li>Zero: recorded and the candidate moves to a spent ledger so the same dead lead is not retried forever</li>
        <li>Never use a hosted AI Gateway for these ticks — local model only</li>
      </ol>

      <h2>Cross-vertical: one codebase, three configs</h2>
      <p>
        Do <strong>not</strong> fork the pipeline per vertical. classscout, padel-africa and
        sportolok run the identical discovery/enrichment/find code; what differs is declared data —
        each vertical&apos;s own territory scope, activity taxonomy, schedule shape, and media
        policy, read from that vertical&apos;s own API rather than hardcoded per copy. classscout
        also runs its own separate, native, more mature find-and-improve loop directly in its
        product repo — OpenClaw&apos;s job vocabulary is a second, independent worker on the same
        vertical, not a replacement for it, exactly the way this SSOT expects more than one
        environment to be able to serve one vertical at once.
      </p>

      <h2>Reliability: a country name is not a country code (2026-09-28)</h2>
      <p>
        A territory-scope check compared a discovery prompt&apos;s answer directly against ISO-2
        codes, but the prompt itself asked for a country <em>name</em> (&quot;the African country
        name in English&quot;). Every candidate that reached the check was refused for 12 days
        straight across two verticals — zero writes, zero errors, a clean-looking log the whole
        time. Root cause held in two places at once: the check needs to resolve a name to a code{" "}
        <em>before</em> comparing, and the dry-run path sat before the check entirely, so a dry run
        could never have caught it. Fixed with a small generated name→code table and by moving the
        check ahead of the dry-run branch. Verified against every stored refusal before shipping:
        100% of one vertical&apos;s refusals and 82% of the other&apos;s were admitted after the fix
        — the rest were genuinely out of scope. Portable lesson for the{" "}
        <Link href="/jobs">territory gate</Link> contract: if a discovery prompt ever asks a model
        for a country by name, the scope check downstream of it needs a resolver, not an assumption
        that the model will answer in code — and a dry run only proves what it actually exercises.
      </p>

      <h2>Reliability: a dry run that writes is not a dry run</h2>
      <p>
        A newly-built media-coverage job called its real external upload before checking its own{" "}
        <code>--dry-run</code> flag — a &quot;preview&quot; run was silently uploading real images.
        Found on review before the job was ever scheduled, not in production, but worth stating
        plainly: a dry-run flag has to gate every side effect at its own call site, checked first,
        not assumed from the function&apos;s name. The same review pass found two jobs missing the
        quarantine check every other job on the same vertical already carries — a job built after
        the others existed does not automatically inherit their gates.
      </p>

      <h2>Agent operating rules</h2>
      <ul>
        <li>
          Never write to a vertical&apos;s database directly, ever — every write is the vertical&apos;s
          own public ingest API, the same surface any external integrator would use.
        </li>
        <li>
          A job built after the others exist reuses the shared gates (quarantine, robots,
          ownership, forbidden-content, provenance) — a private copy of any one of them is treated
          as a defect, not a shortcut.
        </li>
        <li>
          Every attempt is recorded, including one that changed nothing — an untouched record reads
          as &quot;nobody has looked&quot;, which is false and worse than a timestamp that moved
          without a field changing.
        </li>
        <li>Treat empty job queues and zero-delivery ticks as success, never as a fact about the world, unless the run actually checked and found nothing.</li>
        <li>
          A capability failure (search exhausted, model unreachable, dependency down) is recorded
          as exactly that — never folded into a verdict about the candidate or the record.
        </li>
        <li>
          Content does not need a hosted model. A local model handles qualification and rewrite
          passes; nothing here calls a paid API.
        </li>
      </ul>

      <h2>Wiring the queue</h2>
      <p>
        There is no per-vertical timer to subscribe. One scheduled tick walks a single shared queue
        across every client of every application, starts the next enabled job, and enforces one
        hard rule: only one job runs at a time, whatever client it belongs to, so the one local
        model never serves two callers at once. Example intent (not a literal script):
      </p>
      <pre>{`Every ~150s: if no job is running and the cool-down has cleared,
start the next enabled job in the queue (round-robin across every
client), hard-kill it at 480s if it has not finished, record the
outcome either way, and move on. A full rotation of every enabled
job takes hours by design — safety over throughput.`}</pre>

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
            <td>Listing / card state</td>
            <td>The vertical&apos;s own database, via its public ingest API only</td>
          </tr>
          <tr>
            <td>New job, bugfix, docs</td>
            <td>This environment&apos;s own private workspace repository</td>
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
        <code>agent-recommendation</code>, environment <code>openclaw</code>). Do not invent a
        parallel feedback loop.
      </p>

      <h2>Next environments</h2>
      <p>
        The job vocabulary above is ported and dry-run proven, but not yet boringly reliable the
        way Cursor is on its vertical — several jobs are still manual-only pending a scheduling
        decision. Local daemons and Vercel Cron can port the same CLIs once this environment&apos;s
        own queue has run them unattended for real. Do not invent a second job vocabulary; see the{" "}
        <Link href="/">environment selector</Link>.
      </p>
    </DocShell>
  );
}
