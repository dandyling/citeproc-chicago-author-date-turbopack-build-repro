import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default behavior: turbopackMinify defaults to `true` in `next build`
  // and `false` in `next dev`.
  // To verify the fix, set this to `false` and rebuild — bug disappears.
  // experimental: { turbopackMinify: false },
};

export default nextConfig;
