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
  serverExternalPackages: ['undici', '@anthropic-ai/sdk', 'firebase-admin'],
  images: {
    formats: ['image/avif', 'image/webp'],
    ...(isGitHubPages ? { unoptimized: true } : { domains: ['firebasestorage.googleapis.com', 'www.sydneyharbourexclusive.com'] }),
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow Firebase OAuth popups to communicate back
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
    ];
  },
};

export default nextConfig;
