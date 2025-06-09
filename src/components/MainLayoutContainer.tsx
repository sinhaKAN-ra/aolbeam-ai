"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MainContentWrapper from '@/components/MainContentWrapper';

interface MainLayoutContainerProps {
  children: React.ReactNode;
}

export default function MainLayoutContainer({ children }: MainLayoutContainerProps) {
  const { isMobile, open } = useSidebar();

  return (
    <div className={cn("flex flex-col flex-1 transition-all duration-300 ease-in-out")}>

      <MainContentWrapper>
        {children}
      </MainContentWrapper>
      <Footer />
    </div>
  );
}
