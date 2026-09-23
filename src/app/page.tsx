"use client";

import Link from "next/link";
import { Badge, Box, Button, Stack, Title, Text } from "@mantine/core";
import {
  EditorialHero,
  EditorialCard,
  FeatureBand,
} from "@sovereignsquad/gds-core/client";
import { IconRocket, IconGitBranch, IconDatabase, IconShieldCheck } from "@tabler/icons-react";
import { ENVIRONMENTS } from "@/lib/environments";

export default function HomePage() {
  return (
    <Stack gap="xl" className="sc-home-hero" pb="xl">
      <EditorialHero
        eyebrow="Sovereign Content"
        title="Transfer the system, not the listings."
        description="The single source of truth for autonomous catalogue improvement — dual-repo process docs, timed quality jobs, and content archive-backup patterns any vertical can copy."
        actions={[
          {
            label: "Implement guide",
            href: "/implement",
            variant: "primary",
          },
          {
            label: "Agent recommendation",
            href: "/recommendations",
            variant: "secondary",
          },
        ]}
        meta={[
          { id: "gds", label: "GDS 6.7 editorial" },
          { id: "vertical", label: "Vertical ref · padel-africa" },
        ]}
        media={
          <Box
            p="xl"
            style={{
              minHeight: 220,
              borderRadius: "var(--mantine-radius-lg)",
              background:
                "linear-gradient(145deg, color-mix(in srgb, var(--mantine-color-blue-filled) 28%, transparent), color-mix(in srgb, var(--mantine-color-teal-filled) 22%, transparent))",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Stack gap="xs" align="center">
              <Badge variant="light">Process SSOT</Badge>
              <Text fw={700} ta="center">
                Doctrine · Jobs · Environments
              </Text>
              <Text size="sm" c="dimmed" ta="center" maw={240}>
                Live at sovereigncontent.messmass.com
              </Text>
            </Stack>
          </Box>
        }
        mediaAlt="Sovereign Content process layers"
        mediaFade="soft-start"
      />

      <Box className="sc-home-section">
        <Title order={2} mb="xs" style={{ letterSpacing: "-0.02em" }}>
          Where to build
        </Title>
        <Text c="dimmed" mb="md" maw={560}>
          Pick the runtime that will run the jobs. Cursor is the proven first environment; others are
          stubs until their playbooks land.
        </Text>
        <Box
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
          }}
        >
          {ENVIRONMENTS.map((env) =>
            env.state === "ready" ? (
              <EditorialCard
                key={env.id}
                href={env.href}
                eyebrow={env.status}
                title={env.name}
                description={env.summary}
                ctaLabel={env.cta}
                tone="cool"
                variant="standard"
              />
            ) : (
              <EditorialCard
                key={env.id}
                eyebrow={env.status}
                title={env.name}
                description={env.summary}
                ctaLabel={env.cta}
                tone="muted"
                variant="standard"
              />
            ),
          )}
        </Box>
      </Box>

      <Box className="sc-home-section">
        <Title order={2} mb="xs" style={{ letterSpacing: "-0.02em" }}>
          Reliability pillars
        </Title>
        <Text c="dimmed" mb="md" maw={560}>
          What other agents implement end-to-end — see the canonical recommendation.
        </Text>
        <FeatureBand
          columns={4}
          variant="compact"
          items={[
            {
              id: "dual-repo",
              title: "Dual-repo",
              description: "Process SSOT on main; vertical engine + archive on the release branch.",
              icon: <IconGitBranch size={18} />,
            },
            {
              id: "mongo",
              title: "Live Mongo",
              description: "About, media, cards, and lessons stay in the data store — not git.",
              icon: <IconDatabase size={18} />,
            },
            {
              id: "archive",
              title: "Archive-backup",
              description: "Dated JSON snapshots on the vertical branch after curate passes.",
              icon: <IconShieldCheck size={18} />,
            },
            {
              id: "quality",
              title: "Quality loop",
              description: "Timed catalog:* jobs — dry-run, then write, then subscribe_timer.",
              icon: <IconRocket size={18} />,
            },
          ]}
        />
        <Box mt="lg">
          <Button component={Link} href="/recommendations" variant="light">
            Open agent recommendation
          </Button>
        </Box>
      </Box>
    </Stack>
  );
}
