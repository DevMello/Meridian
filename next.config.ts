import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Python package is reference-only; never bundle it.
  outputFileTracingExcludes: {
    "*": ["./componenthub_mcp/**", "./website/**"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
