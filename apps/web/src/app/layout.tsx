import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

const SITE_URL = 'https://getakai.ai';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AKAI',
  applicationCategory: 'BusinessApplication',
  description:
    '10 AI agents that run your business — sales, email, calendar, social, web, ads, recruiting and more.',
  offers: {
    '@type': 'Offer',
    price: '147',
    priceCurrency: 'USD',
  },
  url: SITE_URL,
};

export const metadata: Metadata = {
  manifest: '/manifest.json',
  themeColor: '#0a0a0a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AKAI',
  },
  verification: {
    google: 'VNpyDRPV_WUxGG6u5z3kJNFGVq0xvXp5QCLcb5hENvI',
  },
  title: 'AKAI — 10 AI Agents | Automate Your Business, 24/7',
  description:
    'Put 10 AI agents to work for your business — AKAI handles sales, email, calendar, social, ads and recruiting 24/7. Gets smarter every day. Start free today.',
  keywords: [
    'AI business',
    'AI sales',
    'AI recruitment',
    'AI website builder',
    'AKAI',
    'AI agents',
    'business automation',
    '10 AI agents',
  ],
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'AKAI — 10 AI Agents | Automate Your Business, 24/7',
    description:
      'Put 10 AI agents to work for your business — AKAI handles sales, email, calendar, social, ads and recruiting 24/7. Gets smarter every day. Start free today.',
    url: SITE_URL,
    siteName: 'AKAI',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'AKAI — 10 AI Agents That Run Your Business 24/7',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AKAI — 10 AI Agents | Automate Your Business, 24/7',
    description:
      'Put 10 AI agents to work for your business — AKAI handles sales, email, calendar, social, ads and recruiting 24/7. Start free today.',
    images: [`${SITE_URL}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="//api-server-production-2a27.up.railway.app" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      </head>
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        {/* JSON-LD structured data — SoftwareApplication schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
