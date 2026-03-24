import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@akai/shared-types', '@akai/ui'],
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

export default nextConfig;
