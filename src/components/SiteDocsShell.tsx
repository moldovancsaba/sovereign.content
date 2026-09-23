"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor, Text } from "@mantine/core";
import {
  DocsShell,
  SidebarNavItem,
} from "@sovereignsquad/gds-core/client";
import type { ReactNode } from "react";
import { DOC_NAV, isNavActive } from "@/lib/nav";

export function SiteDocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const primaryNavigation = (
    <>
      {DOC_NAV.map((item) => (
        <SidebarNavItem
          key={item.id}
          component={Link}
          href={item.href}
          label={item.label}
          active={isNavActive(pathname, item.href)}
        />
      ))}
    </>
  );

  return (
    <DocsShell
      brand={
        <Anchor
          component={Link}
          href="/"
          underline="never"
          fw={700}
          c="var(--mantine-color-text)"
          style={{ letterSpacing: "-0.02em" }}
        >
          Sovereign Content
        </Anchor>
      }
      headerContext="Process SSOT"
      primaryNavigation={primaryNavigation}
      contentWidth="xl"
      mobileNavigationMode="drawer"
      footer={
        <Text size="sm" c="dimmed" maw={720}>
          SSOT for agentic catalogue improvement. Content stays in data stores; this site holds
          transfer knowledge only. UI via{" "}
          <Anchor
            href="https://sovereignsquad.github.io/general-design-system"
            target="_blank"
            rel="noreferrer"
          >
            General Design System
          </Anchor>
          .
        </Text>
      }
    >
      {children}
    </DocsShell>
  );
}
