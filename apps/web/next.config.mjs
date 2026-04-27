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
  serverExternalPackages: ['undici', '@anthropic-ai/sdk', 'firebase-admin', 'pdf-parse'],
  images: {
    formats: ['image/avif', 'image/webp'],
    ...(isGitHubPages ? { unoptimized: true } : { domains: ['firebasestorage.googleapis.com', 'www.sydneyharbourexclusive.com'] }),
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  async redirects() {
    return [
      {
        source: '/recruiter.html',
        destination: '/recruit',
        permanent: true,
      },
      {
        source: '/web-audit.html',
        destination: '/web',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow Firebase OAuth popups to communicate back
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          // Security headers
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

export default nextConfig;
