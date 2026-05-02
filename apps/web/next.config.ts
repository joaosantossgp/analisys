import type { NextConfig } from "next";

const isDesktop = process.env.NEXT_DESKTOP_BUILD === "true";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  ...(isDesktop && {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
