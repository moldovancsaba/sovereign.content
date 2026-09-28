export type EnvironmentState = "ready" | "soon";

export type Environment = {
  id: string;
  name: string;
  href: string;
  state: EnvironmentState;
  status: string;
  summary: string;
  cta: string;
};

/** Root selector — Cursor is always first. */
export const ENVIRONMENTS: Environment[] = [
  {
    id: "cursor",
    name: "Cursor",
    href: "/environments/cursor",
    state: "ready",
    status: "Ready",
    summary:
      "Cloud Agents, subscribe_timer jobs, Mongo-backed catalogue ticks, and PR delivery on the same machine that proved the loop.",
    cta: "Open Cursor playbook",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    href: "/environments/openclaw",
    state: "ready",
    status: "Ready",
    summary:
      "Self-hosted Python workers, no Mongo access, ingest-API-only writes, local model instead of AI Gateway — running classscout, padel-africa and sportolok in parallel with Cursor today.",
    cta: "Open OpenClaw playbook",
  },
  {
    id: "local-daemon",
    name: "Local daemon",
    href: "/environments/local-daemon",
    state: "soon",
    status: "Planned",
    summary:
      "launchd / systemd loops that run the same catalog:* CLIs without a Cloud Agent subscription.",
    cta: "Coming next",
  },
  {
    id: "vercel-cron",
    name: "Vercel Cron",
    href: "/environments/vercel-cron",
    state: "soon",
    status: "Planned",
    summary:
      "Hosted HTTP cron twins of catalog:autopilot, quality-loop, hygiene, and media-curate.",
    cta: "Coming next",
  },
];
