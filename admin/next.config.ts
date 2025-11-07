import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
  // Disable server-side features for static hosting
  trailingSlash: true,
};

export default nextConfig;
