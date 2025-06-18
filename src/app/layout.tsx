"use client"

import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import Header from '@/components/Header';
import { AuthProvider } from '@/contexts/AuthContext';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar';
import SidebarContentWrapper from '@/components/SidebarContentWrapper'; // Import the new client component
import MainLayoutContainer from '@/components/MainLayoutContainer';
import { useIsMobile } from '@/hooks/use-mobile';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
      const isMobile = useIsMobile()
    
  // console.log('Hello from app!');
  return (
    <html lang="en" suppressHydrationWarning className={`h-full ${inter.variable}`}>
      <body className="antialiased flex flex-col min-h-full font-sans overflow-y-auto">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SidebarProvider>
              <div className="flex flex-col flex-1 relative">
               {isMobile && <Header />} 
                <div className="flex flex-1 pt-16">
                  <Sidebar collapsible='icon'>
                    <div className="relative h-full">
                      <SidebarContentWrapper />
                    </div>
                  </Sidebar>
                  <MainLayoutContainer>{children}</MainLayoutContainer>
                </div>
              </div>
            </SidebarProvider>
          </AuthProvider>

          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
