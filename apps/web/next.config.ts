import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Standalone output bundles the minimal Node.js server into .next/standalone/.
  // desktop/app.py starts it as a subprocess — no full npm install needed at runtime.
  // Vercel also uses the standalone server, so this is safe for web deployment too.
  output: "standalone",
};

export default nextConfig;
