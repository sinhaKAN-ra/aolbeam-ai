"use client";

import { useSidebar } from '@/components/ui/sidebar';
import SidebarContent from '@/components/SidebarContent';
import React from 'react';

export default function SidebarContentWrapper() {
  const { open, toggleSidebar } = useSidebar();
  return <SidebarContent isCollapsed={!open} onToggleCollapse={toggleSidebar} />;
}
