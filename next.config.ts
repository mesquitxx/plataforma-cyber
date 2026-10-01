import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md is the project's hand-written source of truth: stop `next dev`
  // from appending its own agent-rules block to it.
  agentRules: false,
  // Never advertise the framework in response headers.
  poweredByHeader: false,
};

export default nextConfig;
