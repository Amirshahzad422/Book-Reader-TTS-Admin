import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('pdf-parse');
    }
    return config;
  },
  eslint: {
    // Allow production builds to proceed even with linting errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to proceed even with type errors
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
