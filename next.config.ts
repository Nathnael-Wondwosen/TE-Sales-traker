import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Allow production builds to successfully complete even if there are ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Ensure trailing slash behavior is consistent
  trailingSlash: false,
  // Configure image optimization for Vercel
  images: {
    unoptimized: true, // Use Vercel's image optimization
  },
  // Ensure proper asset handling
  assetPrefix: '',
  // Turbopack configuration
  turbopack: {
    root: process.cwd(),
  },
  // Add rewrites for API routes if needed
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*'
      }
    ];
  }
};

export default nextConfig;