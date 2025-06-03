'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Metadata } from 'next';
import { LayoutDashboard, CreditCard, UserCircle, Settings, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';



interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

const NavItem = ({ href, label, icon, active }: NavItemProps) => (
  <Link 
    href={href} 
    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`}
  >
    {icon}
    <span>{label}</span>
    {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
  </Link>
);

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const navItems = [
    {
      href: '/profile',
      label: 'Overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: pathname === '/profile'
    },
    {
      href: '/profile/history',
      label: 'History',
      icon: <UserCircle className="h-4 w-4" />,
      active: pathname === '/profile/history'
    },
    {
      href: '/profile/subscriptions',
      label: 'Subscription',
      icon: <CreditCard className="h-4 w-4" />,
      active: pathname === '/profile/subscriptions'
    },
    {
      href: '/profile/settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      active: pathname === '/profile/settings'
    }
  ];
  
  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed inset-y-0 z-40 flex w-72 flex-col bg-background border-r border-border
        transition-transform duration-200 ease-in-out lg:static lg:translate-x-0
      `}>
        <div className="space-y-4 py-6 px-4 pt-20">
          <div className="px-3">
            <h2 className="mb-2 text-lg font-semibold">Account</h2>
            <p className="text-xs text-muted-foreground">Manage your account settings and preferences</p>
          </div>
          <Separator />
          <nav className="space-y-1">
            {navItems.map(item => (
              <NavItem 
                key={item.href} 
                href={item.href} 
                label={item.label} 
                icon={item.icon} 
                active={item.active} 
              />
            ))}
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 pt-16 lg:pt-6 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
      
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
