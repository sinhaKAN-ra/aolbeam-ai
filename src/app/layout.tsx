import type { Metadata } from 'next';
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
  title: 'Aolbeam — your learning workspace',
  description: 'Understand difficult concepts, practice at your level, and follow an AI learning path made around your goals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`h-full ${inter.variable}`}>
      <body className="antialiased flex flex-col min-h-full font-sans overflow-y-auto">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  );
}
