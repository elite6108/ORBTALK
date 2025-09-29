import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Let Netlify builds pass even if some rules complain; we lint locally
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
