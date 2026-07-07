import type { NextConfig } from "next";

/**
 * BACKEND_API_URL — private server-side variable (NOT prefixed with NEXT_PUBLIC_).
 * It is only read by next.config.ts at build/dev time on the server and is
 * never sent to the browser bundle, so it is safe to store the full VPS URL.
 *
 * Set this in Vercel → Project Settings → Environment Variables:
 *   BACKEND_API_URL = https://api-study.digitalproductsolutions.in
 *
 * For local dev it falls back to http://localhost:8000.
 */
const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

const nextConfig: NextConfig = {
  output: 'standalone',

  async rewrites() {
    return [
      /**
       * Primary proxy used by api.ts (baseURL='/backend' in production).
       *   Browser sends:  /backend/api/analytics/...
       *   Next.js proxies: https://api-study.digitalproductsolutions.in/api/analytics/...
       */
      {
        source: '/backend/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
      /**
       * Safety fallback: any /api/* that somehow bypasses /backend also gets
       * proxied — handles Django 301 redirect loops that strip the /backend/ prefix.
       */
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      // Django admin & allauth
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
