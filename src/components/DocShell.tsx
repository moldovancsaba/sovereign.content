import Link from "next/link";
import type { ReactNode } from "react";

const DOC_LINKS = [
  { href: "/doctrine", label: "Doctrine" },
  { href: "/jobs", label: "Jobs" },
  { href: "/environments/cursor", label: "Cursor" },
  { href: "/adopting", label: "Adopting" },
  { href: "/recommendations", label: "Recommend" },
];

export function DocShell({
  current,
  children,
}: {
  current: string;
  children: ReactNode;
}) {
  return (
    <div className="doc-layout">
      <aside className="doc-nav" aria-label="Docs">
        {DOC_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.href === current ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
        <Link href="/">← Environments</Link>
      </aside>
      <article className="prose">{children}</article>
    </div>
  );
}
