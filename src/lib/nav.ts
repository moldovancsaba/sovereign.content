export const DOC_NAV = [
  { href: "/", label: "Environments", id: "home" },
  { href: "/doctrine", label: "Doctrine", id: "doctrine" },
  { href: "/jobs", label: "Jobs", id: "jobs" },
  { href: "/implement", label: "Implement", id: "implement" },
  { href: "/environments/cursor", label: "Cursor", id: "cursor" },
  { href: "/adopting", label: "Adopting", id: "adopting" },
  { href: "/recommendations", label: "Recommend", id: "recommendations" },
  { href: "/repos", label: "Repos", id: "repos" },
] as const;

export type DocNavHref = (typeof DOC_NAV)[number]["href"];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
