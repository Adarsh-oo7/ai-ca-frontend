import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/schedule',
        destination: '/dashboard/schedule',
        permanent: true,
      },
      {
        source: '/revision',
        destination: '/dashboard/revision',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
