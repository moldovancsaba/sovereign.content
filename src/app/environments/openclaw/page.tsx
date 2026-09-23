import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocCallout } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "OpenClaw environment",
};

export default function OpenClawPage() {
  return (
    <DocShell
      current="/environments/openclaw"
      title="OpenClaw"
      lead="Planned. Same job contracts as Cursor — different worker host. Until this playbook is filled, use Cursor."
      eyebrow="Environment"
    >
      <DocCallout title="Not ready yet">
        Implement the <Link href="/environments/cursor">Cursor</Link> playbook first. Do not invent a
        second job vocabulary here.
      </DocCallout>
    </DocShell>
  );
}
