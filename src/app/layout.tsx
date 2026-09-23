import type { Metadata } from "next";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Providers } from "./providers";
import { SiteDocsShell } from "@/components/SiteDocsShell";
import "@mantine/core/styles.css";
import "@sovereignsquad/gds-theme/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sovereign Content",
    template: "%s · Sovereign Content",
  },
  description:
    "Single source of truth for sovereign agentic content systems — transfer knowledge so any project can improve and deliver catalogue content autonomously.",
  metadataBase: new URL("https://sovereigncontent.messmass.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps} data-gds-theme-preset="editorial">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <Providers>
          <SiteDocsShell>{children}</SiteDocsShell>
        </Providers>
      </body>
    </html>
  );
}
