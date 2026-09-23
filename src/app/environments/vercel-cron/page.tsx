import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocCallout } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Vercel Cron environment",
};

export default function VercelCronPage() {
  return (
    <DocShell
      current="/environments/vercel-cron"
      title="Vercel Cron"
      lead="Planned. Hosted HTTP cron twins of catalog:autopilot, quality-loop, hygiene, and media-curate."
      eyebrow="Environment"
    >
      <DocCallout title="Not ready yet">
        Use <Link href="/environments/cursor">Cursor</Link> until this playbook lands.
      </DocCallout>
    </DocShell>
  );
}
