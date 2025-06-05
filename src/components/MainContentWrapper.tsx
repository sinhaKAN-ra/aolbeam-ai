"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

interface MainContentWrapperProps {
  children: React.ReactNode;
}

export default function MainContentWrapper({ children }: MainContentWrapperProps) {
  const { isMobile, open } = useSidebar();

  return (
    <main className="flex-grow">
      {children}
    </main>
  );
}
