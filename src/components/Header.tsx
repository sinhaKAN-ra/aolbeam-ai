// src/components/Header.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Brain, 
  Menu, 
  X,
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
  Loader2
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';

const ADMIN_EMAIL = "sinhakaran01235@gmail.com";

// Google Icon Component
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

export default function Header() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();
  const [userInitials, setUserInitials] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Handle sign out
  const handleSignOut = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      await signOut();
      setMobileNavOpen(false);
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
  }, [isSigningOut, signOut, router, toast]);

  // Handle sign in with Google
  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
      setMobileNavOpen(false);
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error instanceof Error ? error.message : "Could not sign in with Google. Please try again.",
      });
    }
  }, [signInWithGoogle, toast]);

  // Navigation items
  const navItems = useMemo<NavItem[]>(() => [
    { href: "/", label: "Home", icon: <Home className="h-4 w-4" /> },
    ...(user ? [{ href: "/profile", label: "Profile", icon: <ProfileIcon className="h-4 w-4" /> }] : []),
    { href: "/pricing", label: "Pricing", icon: <DollarSign className="h-4 w-4" /> },
    { href: "/blog", label: "Blog", icon: <Newspaper className="h-4 w-4" /> },
    { href: "/about", label: "About Us", icon: <AboutIcon className="h-4 w-4" /> },
    { href: "/contact-us", label: "Contact", icon: <ContactIcon className="h-4 w-4" /> },
  ], [user]);

  // User menu items
  const userMenuItems = useMemo<UserMenuItem[]>(() => {
    const items: UserMenuItem[] = [
      {
        label: 'Profile',
        icon: <UserCircle className="mr-2 h-4 w-4" />,
        href: '/profile',
      },
      {
        label: 'Settings',
        icon: <Settings className="mr-2 h-4 w-4" />,
        href: '/settings',
      },
    ];

    if (isAdmin) {
      items.push({
        label: 'Admin',
        icon: <ShieldCheck className="mr-2 h-4 w-4" />,
        href: '/admin',
      });
    }

    items.push({
      label: 'Sign out',
      icon: <LogOut className="mr-2 h-4 w-4" />,
      onClick: handleSignOut,
    });

    return items;
  }, [isAdmin, handleSignOut]);

  // Set up user display info when user changes
  useEffect(() => {
    if (user) {
      // Get user initials for avatar
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'U';
      const initials = name
        .split(' ')
        .map((part: string) => part[0]?.toUpperCase() || '')
        .join('')
        .substring(0, 2);
        
      setUserInitials(initials);
      setUserEmail(user.email || '');
    } else {
      setUserInitials('');
      setUserEmail('');
    }
  }, [user]);

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm">
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
          
          <nav className="hidden md:flex items-center gap-1">
            {/* Desktop navigation links intentionally removed from here. Footer serves as primary nav for these. */}
          </nav>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isLoading && user && <Button variant="ghost" size="icon" disabled><Loader2 className="h-5 w-5 animate-spin" /></Button>}
            
            {!isLoading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full p-0"
                    disabled={isLoading}
                  >
                    {userInitials ? (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-sm font-medium">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <UserCircle className="h-6 w-6" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-3 p-2">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {userInitials || 'U'}
                    </div>
                    <div className="flex flex-col space-y-0.5 overflow-hidden">
                      <p className="truncate text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                      </p>
                      {userEmail && (
                        <p className="truncate text-xs leading-none text-muted-foreground">
                          {userEmail}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {userMenuItems.map((item) => (
                    item.label === 'Settings' ? null : (
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
                asChild
                variant="outline"
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
                  <GoogleIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign in</span>
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="md:hidden border-t py-2">
            <nav className="flex flex-col space-y-1">
              {navItems.map(item => {
                // Skip rendering the Profile link if user is not authenticated
                if (item.href === '/profile' && !user) {
                  return null;
                }
                return (
                  <Button key={item.label} variant="ghost" asChild className="justify-start" onClick={()=>setMobileNavOpen(false)}>
                    <Link href={item.href} className="py-2 px-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent w-full">
                      <span className="mr-3 h-5 w-5">{item.icon}</span> {item.label}
                    </Link>
                  </Button>
                );
              })}
              {user?.email === ADMIN_EMAIL && (
                <Button variant="ghost" asChild className="justify-start" onClick={()=>setMobileNavOpen(false)}>
                  <Link href="/admin/blog" className="py-2 px-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent w-full">
                    <ShieldCheck className="mr-3 h-5 w-5" /> Admin
                  </Link>
                </Button>
              )}
              <DropdownMenuSeparator />
              {!user && (
                <Button 
                  variant="default" 
                  onClick={() => { handleSignIn(); setMobileNavOpen(false);}} 
                  className="w-full text-base py-3 mt-2 flex items-center justify-center"
                >
                  <GoogleIcon className="mr-2 h-5 w-5" />
                  Login / Sign Up
                </Button>
              )}
              {user && (
                <Button 
                  variant="outline" 
                  onClick={(e) => { handleSignOut(e); setMobileNavOpen(false);}}
                  className="w-full text-base py-3 mt-2"
                >
                  <LogOut className="mr-2 h-5 w-5" /> Sign Out
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
