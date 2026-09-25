import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Browser calls /api/* on this origin; Next forwards them to FastAPI so the session cookie is first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
  images: {
    // Hosts paste photo URLs from any site, and Unsplash URLs already carry their own sizing,
    // so images are served as-is instead of through the optimizer (which would need an allowlist and a quota).
    unoptimized: true,
  },
};

export default nextConfig;
