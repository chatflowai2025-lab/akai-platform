import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import BugCapture from '@/components/BugCapture';
import { ThemeProvider } from '@/contexts/ThemeContext';

const GA_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-VVSLMYCV04';

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
    price: '199',
    priceCurrency: 'AUD',
  },
  url: SITE_URL,
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AKAI',
  },
  verification: {
    google: 'VNpyDRPV_WUxGG6u5z3kJNFGVq0xvXp5QCLcb5hENvI',
  },
  title: 'AKAI — Your AI Business Partner',
  description:
    'AI-powered executive team for SMBs. Sales, marketing, recruiting and finance — automated, running 24/7.',
  keywords: [
    'AI business',
    'AI sales',
    'AI recruitment',
    'AI executive team',
    'AKAI',
    'AI agents',
    'business automation',
    'Australian SMB AI',
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
    title: 'AKAI — Your AI Business Partner',
    description:
      'AI-powered executive team for SMBs. Sales, marketing, recruiting and finance — automated, running 24/7.',
    url: SITE_URL,
    siteName: 'AKAI',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'AKAI — Your AI Business Partner',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AKAI — Your AI Business Partner',
    description:
      'AI-powered executive team for SMBs. Sales, marketing, recruiting and finance — automated, running 24/7.',
    images: [`${SITE_URL}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_API_URL && (
          <link rel="dns-prefetch" href={`//${process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, '')}`} />
        )}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      </head>
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
        {/* JSON-LD structured data — SoftwareApplication schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider>
          <BugCapture>
            {children}
          </BugCapture>
        </ThemeProvider>
      </body>
    </html>
  );
}
