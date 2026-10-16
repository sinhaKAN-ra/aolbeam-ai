import type { Metadata } from 'next';
import { SITE_URL, SITE_DESCRIPTION } from '@/lib/site';
import { Inter } from 'next/font/google';
import './globals.css';
import 'katex/dist/katex.min.css';
import Providers from '@/components/Providers';
import AppShell from '@/components/AppShell';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Aolbeam AI — practice questions and learn across subjects',
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Aolbeam AI',
    title: 'Aolbeam AI — practice questions and learn across subjects',
    description: SITE_DESCRIPTION,
    images: [{ url: '/assets/logo.png', alt: 'Aolbeam AI' }],
  },
  twitter: { card: 'summary', title: 'Aolbeam AI — learn through practice', description: SITE_DESCRIPTION, images: ['/assets/logo.png'] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`h-full ${inter.variable}`}>
      <head><link rel="describedby" href="/llms.txt" type="text/plain" /></head>
      <body className="antialiased flex flex-col min-h-full font-sans overflow-y-auto">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  );
}
