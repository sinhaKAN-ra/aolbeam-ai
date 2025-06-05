// src/components/Header.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSidebar } from '@/components/ui/sidebar';

export default function Header() {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <header className="h-16 fixed top-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Image
                src="/assets/logo.png"
                alt="AOLBEAM Logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
            </div>
            <span className="text-2xl font-bold text-primary">AOLBEAM</span>
          </Link>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
