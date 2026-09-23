import type { Metadata } from "next";
import Link from "next/link";
import { DocShell } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Local daemon environment",
};

export default function LocalDaemonPage() {
  return (
    <DocShell current="/environments/local-daemon">
      <h1>Local daemon</h1>
      <p>
        Planned. launchd / systemd wrappers around the same <code>catalog:*</code> CLIs. Until this
        playbook is filled, use <Link href="/environments/cursor">Cursor</Link>.
      </p>
    </DocShell>
  );
}
