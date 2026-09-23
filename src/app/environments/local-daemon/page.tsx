import type { Metadata } from "next";
import Link from "next/link";
import { DocShell, DocCallout } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Local daemon environment",
};

export default function LocalDaemonPage() {
  return (
    <DocShell
      current="/environments/local-daemon"
      title="Local daemon"
      lead="Planned. launchd / systemd loops that run the same catalog:* CLIs without a Cloud Agent subscription."
      eyebrow="Environment"
    >
      <DocCallout title="Not ready yet">
        Use <Link href="/environments/cursor">Cursor</Link> until this playbook lands.
      </DocCallout>
    </DocShell>
  );
}
