"use client";

import { GdsProvider } from "@sovereignsquad/gds-theme/client";
import { gdsEditorialPublicTheme } from "@sovereignsquad/gds-theme/client";
import type { ReactNode } from "react";

/** Single app-wide GDS provider. Editorial public theme matches a docs / SSOT site. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <GdsProvider defaultColorScheme="light" theme={gdsEditorialPublicTheme}>
      {children}
    </GdsProvider>
  );
}
