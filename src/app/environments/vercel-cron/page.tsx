import type { Metadata } from "next";
import Link from "next/link";
import { DocShell } from "@/components/DocShell";

export const metadata: Metadata = {
  title: "Vercel Cron environment",
};

export default function VercelCronPage() {
  return (
    <DocShell current="/environments/vercel-cron">
      <h1>Vercel Cron</h1>
      <p>
        Planned. HTTP cron twins of the catalogue jobs on the vertical&apos;s Vercel project. Until
        this playbook is filled, use <Link href="/environments/cursor">Cursor</Link>.
      </p>
    </DocShell>
  );
}
