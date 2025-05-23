
// src/components/Header.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
import { useSupabase } from '../hooks/useSupabase';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import { Brain, Menu, UserCircle, LogOut, ShieldCheck, Home, User as ProfileIcon, Newspaper, Mail as ContactIcon, Info as AboutIcon, DollarSign, Settings, Loader2 } from 'lucide-react';

const ADMIN_EMAIL = "sinhakaran01235@gmail.com";

// Simple Google Icon SVG
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" enableBackground="new 0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.71c-.4-1.2-.62-2.48-.62-3.71s.22-2.51.62-3.71l-7.98-6.19C.92 18.05 0 20.94 0 24c0 3.06.92 5.95 2.56 8.48l7.97-6.77z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);


interface HeaderProps {
  userProfile: UserProfile | null;
  isLoadingProfile: boolean;
  onSignOut: () => Promise<void>;
}

export default function Header({ userProfile, isLoadingProfile, onSignOut }: HeaderProps) {
  const { toast } = useToast();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Get Supabase client instance
  const supabase = useSupabase();
  
  // Derive currentUser from userProfile if it exists
  const currentUser = userProfile 
    ? { 
        id: userProfile.id, 
        email: userProfile.email || ''
      } as User 
    : null;
    
  // Debug log to track profile and loading state
  useEffect(() => {
    console.log('Header - Profile updated:', { 
      hasUserProfile: !!userProfile, 
      isLoadingProfile,
      currentUser: currentUser?.email
    });
  }, [userProfile, isLoadingProfile, currentUser]);

  const handleSignInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) {
        console.error('Google sign-in error:', error);
        toast({ 
          variant: "destructive", 
          title: "Login Error", 
          description: error.message || 'Failed to sign in with Google' 
        });
      }
    } catch (error) {
      console.error('Unexpected error during Google sign-in:', error);
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: "An unexpected error occurred during sign-in.",
      });
    }
  };

  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSigningOut) return; // Prevent multiple clicks
    
    setIsSigningOut(true);
    
    try {
      console.log('Header: Starting sign out process...');
      await onSignOut();
      console.log('Header: Sign out successful');
      
      toast({ 
        title: 'Signed out successfully',
        description: 'You have been signed out of your account.'
      });
    } catch (error) {
      console.error('Header: Sign out error:', error);
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sign out. Please try again.',
      });
      
      // Re-throw the error so the parent component can handle it if needed
      throw error;
    } finally {
      console.log('Header: Sign out process completed');
      setIsSigningOut(false);
      setMobileNavOpen(false);
    }
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/profile", label: "Profile", icon: ProfileIcon },
    { href: "/pricing", label: "Pricing", icon: DollarSign },
    { href: "/blog", label: "Blog", icon: Newspaper },
    { href: "/about", label: "About Us", icon: AboutIcon },
    { href: "/contact-us", label: "Contact", icon: ContactIcon },
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
            <Brain className="h-7 w-7" /> AOLBEAM
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            {/* Desktop navigation links intentionally removed from here. Footer serves as primary nav for these. */}
          </nav>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isLoadingProfile && currentUser && <Button variant="ghost" size="icon" disabled><Loader2 className="h-5 w-5 animate-spin" /></Button>}
            
            {!isLoadingProfile && currentUser && userProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <UserCircle className="h-6 w-6" />
                    <span className="sr-only">User Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {currentUser.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild onClick={() => setMobileNavOpen(false)}>
                    <Link href="/profile">
                      <ProfileIcon className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  {currentUser.email === ADMIN_EMAIL && (
                    <DropdownMenuItem asChild onClick={() => setMobileNavOpen(false)}>
                      <Link href="/admin/blog">
                        <ShieldCheck className="mr-2 h-4 w-4" /> Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <button 
                      onClick={(e) => handleSignOut(e)} 
                      className="w-full flex items-center"
                      disabled={isSigningOut}
                    >
                      {isSigningOut ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing out...
                        </>
                      ) : (
                        <>
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </>
                      )}
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
               !isLoadingProfile && !currentUser && (
                  <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSignInWithGoogle} 
                      className="min-w-[120px] hidden md:inline-flex items-center" // hidden md:inline-flex
                    >
                      <GoogleIcon className="mr-2 h-4 w-4" />
                      Login / Sign Up
                    </Button>
               )
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
              {navItems.map(item => (
                 <Button key={item.label} variant="ghost" asChild className="justify-start" onClick={()=>setMobileNavOpen(false)}>
                    <Link href={item.href} className="py-2 px-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent w-full">
                       <item.icon className="mr-3 h-5 w-5" /> {item.label}
                    </Link>
                 </Button>
              ))}
              {currentUser?.email === ADMIN_EMAIL && (
                  <Button variant="ghost" asChild className="justify-start" onClick={()=>setMobileNavOpen(false)}>
                      <Link href="/admin/blog" className="py-2 px-3 text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent w-full">
                      <ShieldCheck className="mr-3 h-5 w-5" /> Admin
                      </Link>
                  </Button>
              )}
              <DropdownMenuSeparator />
              {!currentUser && (
                <Button 
                    variant="default" 
                    onClick={() => { handleSignInWithGoogle(); setMobileNavOpen(false);}} 
                    className="w-full text-base py-3 mt-2 flex items-center justify-center"
                  >
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Login / Sign Up
                  </Button>
              )}
              {currentUser && (
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
