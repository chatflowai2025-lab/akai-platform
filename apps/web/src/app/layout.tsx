import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AKAI — The AI Business Operating System',
  description: 'Describe your business. We\'ll build it, run it, and grow it. AI-powered sales, recruitment, web, ads, and social — all in one platform.',
  keywords: ['AI business', 'AI sales', 'AI recruitment', 'AI website builder', 'AKAI'],
  openGraph: {
    title: 'AKAI — The AI Business Operating System',
    description: 'Your AI business partner. Sales, recruitment, web, ads, social — all automated.',
    type: 'website',
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
        {children}
      </body>
    </html>
  );
}
