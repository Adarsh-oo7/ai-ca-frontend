import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
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
