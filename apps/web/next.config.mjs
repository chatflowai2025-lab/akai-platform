/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  ...(isGitHubPages ? {
    output: 'export',
    trailingSlash: true,
    basePath: '/akai-platform',
    assetPrefix: '/akai-platform/',
  } : {}),
  transpilePackages: ['@akai/shared-types'],
  images: {
    ...(isGitHubPages ? { unoptimized: true } : { domains: ['firebasestorage.googleapis.com'] }),
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

export default nextConfig;
