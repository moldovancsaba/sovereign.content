import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@sovereignsquad/gds-theme",
    "@sovereignsquad/gds-core",
    "@mantine/core",
    "@mantine/hooks",
  ],
};

export default nextConfig;
