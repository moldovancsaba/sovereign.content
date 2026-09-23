import type { Metadata } from "next";
import Link from "next/link";
import { DocShell } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "OpenClaw environment",
};

export default function OpenClawPage() {
  return (
    <DocShell current="/environments/openclaw">
      <h1>OpenClaw</h1>
      <p>
        Planned. Same <Link href="/jobs">job contracts</Link> as Cursor — different worker host.
        Until this playbook is filled, use <Link href="/environments/cursor">Cursor</Link>.
      </p>
    </DocShell>
  );
}
