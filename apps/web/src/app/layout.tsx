import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AKAI — Your AI Business Partner',
  description: 'AKAI runs your business 24/7 with 9 specialised AI agents. Sales, Recruitment, Web, Ads, Social, Email and more. Start free.',
  keywords: ['AI business', 'AI sales', 'AI recruitment', 'AI website builder', 'AKAI', 'AI agents', 'business automation'],
  metadataBase: new URL('https://getakai.ai'),
  alternates: {
    canonical: 'https://getakai.ai',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'AKAI — Your AI Business Partner',
    description: 'AKAI runs your business 24/7 with 9 specialised AI agents. Sales, Recruitment, Web, Ads, Social, Email and more. Start free.',
    url: 'https://getakai.ai',
    siteName: 'AKAI',
    images: [{ url: 'https://getakai.ai/og-image.png', width: 1200, height: 630, alt: 'AKAI — Your AI Business Partner' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AKAI — Your AI Business Partner',
    description: 'AKAI runs your business 24/7 with 9 specialised AI agents. Start free.',
    images: ['https://getakai.ai/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
