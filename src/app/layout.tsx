import type { Metadata } from "next";
import { Syne, Manrope, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sovereign Content",
    template: "%s · Sovereign Content",
  },
  description:
    "Single source of truth for sovereign agentic content systems — transfer knowledge so any project can improve and deliver catalogue content autonomously.",
  metadataBase: new URL("https://sovereigncontent.messmass.com"),
};

const NAV = [
  { href: "/doctrine", label: "Doctrine" },
  { href: "/jobs", label: "Jobs" },
  { href: "/environments/cursor", label: "Cursor" },
  { href: "/adopting", label: "Adopting" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <div className="shell">
          <header className="site-header">
            <Link className="brand-mark" href="/">
              Sovereign Content
            </Link>
            <nav className="nav" aria-label="Primary">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            SSOT for agentic catalogue improvement. Content stays in data stores; this repo holds
            transfer knowledge only.
          </footer>
        </div>
      </body>
    </html>
  );
}
