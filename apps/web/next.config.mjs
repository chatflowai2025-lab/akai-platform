/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@akai/shared-types'],
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

export default nextConfig;
