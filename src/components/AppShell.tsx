"use client";

import React from "react";
import Header from "@/components/Header";
import { Sidebar } from "@/components/ui/sidebar";
import SidebarContentWrapper from "@/components/SidebarContentWrapper";
import MainLayoutContainer from "@/components/MainLayoutContainer";
import { useIsMobile } from "@/hooks/use-mobile";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col flex-1 relative">
      {isMobile && <Header />}
      <div className="flex flex-1 pt-16">
        <Sidebar collapsible="icon">
          <div className="relative h-full">
            <SidebarContentWrapper />
          </div>
        </Sidebar>
        <MainLayoutContainer>{children}</MainLayoutContainer>
      </div>
    </div>
  );
}


