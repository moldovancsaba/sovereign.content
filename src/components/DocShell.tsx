"use client";

import type { ReactNode } from "react";
import {
  DocsPageShell,
  DocsCodeBlock,
  InlineAlert,
} from "@sovereignsquad/gds-core/client";
import { Box, Table, Text, Title, List, Anchor } from "@mantine/core";
import Link from "next/link";

type FooterNext = { label: string; href: string };

export function DocShell({
  title,
  lead,
  eyebrow,
  footerNext,
  children,
}: {
  /** Kept for aria / future breadcrumbs; DocsShell owns the left nav. */
  current?: string;
  title: string;
  lead?: ReactNode;
  eyebrow?: string;
  footerNext?: FooterNext;
  children: ReactNode;
}) {
  return (
    <DocsPageShell title={title} lead={lead} eyebrow={eyebrow} footerNext={footerNext}>
      <Box className="sc-prose">{children}</Box>
    </DocsPageShell>
  );
}

/** GDS-governed callout replacing hand-rolled `.callout`. */
export function DocCallout({
  title = "Note",
  children,
  severity = "info",
}: {
  title?: string;
  children: ReactNode;
  severity?: "info" | "warning" | "success" | "neutral";
}) {
  return (
    <Box my="md">
      <InlineAlert title={title} message={children} severity={severity} />
    </Box>
  );
}

export function DocCode({ code, title }: { code: string; title?: string }) {
  return (
    <Box my="md">
      <DocsCodeBlock code={code} title={title} withCopy />
    </Box>
  );
}

export function DocH2({ children }: { children: ReactNode }) {
  return (
    <Title order={2} mt="xl" mb="sm" style={{ letterSpacing: "-0.02em" }}>
      {children}
    </Title>
  );
}

export function DocP({ children }: { children: ReactNode }) {
  return (
    <Text component="div" c="dimmed" mb="sm" style={{ lineHeight: 1.65 }}>
      {children}
    </Text>
  );
}

export function DocLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  if (external) {
    return (
      <Anchor href={href} target="_blank" rel="noreferrer">
        {children}
      </Anchor>
    );
  }
  return (
    <Anchor component={Link} href={href}>
      {children}
    </Anchor>
  );
}

export function DocList({
  ordered,
  items,
}: {
  ordered?: boolean;
  items: ReactNode[];
}) {
  return (
    <List type={ordered ? "ordered" : "unordered"} mb="md" spacing="xs" c="dimmed">
      {items.map((item, i) => (
        <List.Item key={i}>{item}</List.Item>
      ))}
    </List>
  );
}

export function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <Table mb="md" highlightOnHover withTableBorder={false} verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          {headers.map((h) => (
            <Table.Th key={h}>{h}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row, i) => (
          <Table.Tr key={i}>
            {row.map((cell, j) => (
              <Table.Td key={j}>{cell}</Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
