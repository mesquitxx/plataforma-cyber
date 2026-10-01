import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md is the project's hand-written source of truth: stop `next dev`
  // from appending its own agent-rules block to it.
  agentRules: false,
  // Never advertise the framework in response headers.
  poweredByHeader: false,
};

// Module content lives in content/ and is imported by the module page, never
// routed directly, so pageExtensions stays at its default. Plugins are given
// by name: Turbopack cannot receive JavaScript functions.
const withMDX = createMDX({
  options: {
    remarkPlugins: [
      "remark-gfm",
      // Parses the YAML front-matter so it is not rendered as text. The data
      // itself is read by the ingestion script (scripts/content-ingest.ts).
      ["remark-frontmatter", ["yaml"]],
    ],
  },
});

export default withMDX(nextConfig);
