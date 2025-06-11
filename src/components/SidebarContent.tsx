"use client";

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Brain,
  UserCircle,
  LogOut,
  ShieldCheck,
  Home,
  User as ProfileIcon,
  Newspaper,
  Mail as ContactIcon,
  Info as AboutIcon,
  DollarSign,
  Settings,
  Loader2,
  History
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { useSidebar } from '@/components/ui/sidebar';

const ADMIN_EMAIL = "sinhakaran01235@gmail.com";

// Google Icon Component (moved here as it's used in login/signup)
const GoogleIcon = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    enableBackground="new 0 0 48 48"
  >
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.71c-.4-1.2-.62-2.48-.62-3.71s.22-2.51.62-3.71l-7.98-6.19C.92 18.05 0 20.94 0 24c0 3.06.92 5.95 2.56 8.48l7.97-6.77z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
}

interface UserMenuItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  divider?: boolean;
}

export default function SidebarContent() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();
  const [userInitials, setUserInitials] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { setOpenMobile } = useSidebar(); // To close sidebar on mobile after navigation

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Handle sign out
  const handleSignOut = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      await signOut();
      setOpenMobile(false);
      router.push('/');
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign out",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, signOut, router, toast, setOpenMobile]);

  // Handle sign in with Google
  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
      setOpenMobile(false);
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error instanceof Error ? error.message : "Could not sign in with Google. Please try again.",
      });
    }
  }, [signInWithGoogle, toast, setOpenMobile]);

  // Navigation items
  const navItems = useMemo<NavItem[]>(() => [
    { href: "/", label: "Home", icon: <Home className="h-4 w-4" /> },
    { href: "/#generate", label: "Practice Problem", icon: <Brain className="h-4 w-4" /> },
    { href: "/tests", label: "Practice Tests (beta)", icon: <Newspaper className="h-4 w-4" /> },
    { href: "/history", label: "History", icon: <History className="h-4 w-4" /> },
    { href: "/blog", label: "Blog", icon: <Newspaper className="h-4 w-4" /> },
    { href: "/about", label: "About Us", icon: <AboutIcon className="h-4 w-4" /> },
    { href: "/contact-us", label: "Contact", icon: <ContactIcon className="h-4 w-4" /> },
  ], []);

  // User menu items
  const userMenuItems = useMemo<UserMenuItem[]>(() => {
    const items: UserMenuItem[] = [
      { label: "Profile", icon: <ProfileIcon className="h-4 w-4" />, href: "/profile" },
      { label: "Settings", icon: <Settings className="h-4 w-4" />, href: "/profile/settings" },
      { label: "Subscriptions", icon: <DollarSign className="h-4 w-4" />, href: "/profile/subscriptions" },
      { divider: true, label: "", icon: null },
      { label: "Sign out", icon: <LogOut className="h-4 w-4" />, onClick: handleSignOut },
    ];

    if (isAdmin) {
      items.unshift({ label: "Admin", icon: <ShieldCheck className="h-4 w-4" />, href: "/admin/blog" });
    }

    return items;
  }, [isAdmin, handleSignOut]);

  useEffect(() => {
    if (user) {
      const nameParts = user.user_metadata?.full_name?.split(' ');
      if (nameParts && nameParts.length > 0) {
        const initials = nameParts.map((n: string) => n[0]).join('').toUpperCase();
        setUserInitials(initials);
      }
      setUserEmail(user.email || '');
    } else {
      setUserInitials('');
      setUserEmail('');
    }
  }, [user]);

  return (
    <div className="flex flex-col h-full">
      {/* Top section: Theme Toggle */}
      <div className="flex items-center justify-end p-4 border-b">
        <ThemeToggle />
      </div>

      {/* Main Navigation */}
      <nav className="flex-grow p-4 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.href}
            variant={pathname === item.href ? "secondary" : "ghost"}
            asChild
            className="w-full justify-start"
            onClick={() => setOpenMobile(false)}
          >
            <Link href={item.href}>
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </Link>
          </Button>
        ))}
      </nav>

      {/* User Section / Login */}
      <div className="p-4 border-t">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="font-medium truncate w-full">{user?.user_metadata?.full_name || userEmail}</span>
                  <span className="text-xs text-muted-foreground truncate w-full">{userEmail}</span>
                </div>
                <UserCircle className="ml-auto h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              {userMenuItems.map((item) => (
                item.divider ? (
                  <DropdownMenuSeparator key={`sep-${item.label}`} />
                ) : (
                  <DropdownMenuItem
                    key={item.label}
                    asChild={!!item.href}
                    onClick={item.onClick}
                    className="cursor-pointer"
                    disabled={isSigningOut && item.label === 'Sign out'}
                  >
                    {item.href ? (
                      <Link href={item.href} className="w-full flex items-center">
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ) : (
                      <div className="flex w-full items-center">
                        {item.icon}
                        <span>{item.label}</span>
                        {isSigningOut && item.label === 'Sign out' && (
                          <Loader2 className="ml-2 h-3 w-3 animate-spin" />
                        )}
                      </div>
                    )}
                  </DropdownMenuItem>
                )
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="default"
            onClick={handleSignIn}
            className="w-full flex items-center justify-center"
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Login / Sign Up
          </Button>
        )}
      </div>
    </div>
  );
}
