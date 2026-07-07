import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Ensure Next.js preserves trailing slashes to match Django's APPEND_SLASH behavior.
  // Without this, Next.js strips the slash → Django redirects to add it back
  // → the browser follows the redirect but loses the /backend/ proxy prefix → 404.
  trailingSlash: true,
  async rewrites() {
    return [
      // Primary proxy: /backend/* → backend API server
      {
        source: '/backend/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
      // Fallback: also proxy /api/* directly so Django redirect loops are caught
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      // Also proxy /admin/* and /accounts/* (Django admin & allauth)
      {
        source: '/admin/:path*',
        destination: `${BACKEND_URL}/admin/:path*`,
      },
      {
        source: '/accounts/:path*',
        destination: `${BACKEND_URL}/accounts/:path*`,
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
