import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Traces only the node_modules actually reachable from the app into
  // `.next/standalone` — the production Docker image (Phase 19) copies just
  // that output instead of the full node_modules tree, per docs/deployment.md §2.
  output: "standalone",
};

export default nextConfig;
