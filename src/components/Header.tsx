
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
import { createClientComponentClient, type SupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import { Brain, Menu, UserCircle, LogOut, ShieldCheck, Home, User as ProfileIcon, Newspaper, Mail as ContactIcon, Info as AboutIcon, DollarSign, Settings } from 'lucide-react';

const ADMIN_EMAIL = "sinhakaran01235@gmail.com"; // Define ADMIN_EMAIL or import if from a shared constants file

export default function Header() {
  const { toast } = useToast();
  const [supabase] = useState<SupabaseClient>(() => createClientComponentClient());
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const fetchAndSetUserProfile = useCallback(async (user: User) => {
    console.log(`Header: Attempting to fetch profile for user: ${user.id}`);
    setIsLoadingProfile(true);
    setUserProfile(null);

    try {
      let { data: profileData, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setUserProfile(profileData as UserProfile);
      } else if (fetchError && fetchError.code === 'PGRST116') {
        console.log('Header: No profile found (PGRST116), attempting to create as fallback...');
        const newProfilePayload: Omit<UserProfile, 'created_at' | 'updated_at'> = {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
          interaction_count: 0,
          is_subscribed: false,
        };
        const { data: insertedProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert(newProfilePayload)
          .select()
          .single();
        
        if (insertedProfile) {
          setUserProfile(insertedProfile as UserProfile);
        } else if (insertError && insertError.code === '23505') {
          console.log('Header: Profile insert failed (unique violation), re-fetching...');
          const { data: refetchedData, error: refetchError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (refetchedData) setUserProfile(refetchedData as UserProfile);
          else console.error('Header: Error re-fetching profile:', refetchError);
        } else {
          console.error('Header: Error creating profile:', insertError);
        }
      } else if (fetchError) {
        console.error('Header: Database error fetching profile:', fetchError);
      }
    } catch (error) {
      console.error('Header: Unexpected error during profile setup:', error);
    } finally {
      setIsLoadingProfile(false);
      console.log(`Header: Profile fetching complete. isLoading: ${false}, userProfile: ${!!userProfile}`);
    }
  }, [supabase, toast]);

  useEffect(() => {
    console.log("Header: Supabase client initialized.");
    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Header: Auth state changed:', event, { user: session?.user?.email });
      const user = session?.user ?? null;
      setCurrentUser(user);
      
      if (user) {
        await fetchAndSetUserProfile(user);
      } else {
        setUserProfile(null);
        setIsLoadingProfile(false);
      }
    };

    const checkUser = async () => {
      setIsLoadingProfile(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setCurrentUser(user);
      if (user) {
        await fetchAndSetUserProfile(user);
      } else {
        setIsLoadingProfile(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    checkUser();

    return () => {
      subscription?.unsubscribe();
      console.log("Header: Auth subscription cleaned up.");
    };
  }, [supabase, fetchAndSetUserProfile]);

  const handleSignInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    if (error) toast({ variant: "destructive", title: "Login Error", description: error.message });
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: "destructive", title: "Logout Error", description: error.message });
    } else {
      setCurrentUser(null);
      setUserProfile(null);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    }
  };

  const navItems = [
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
            {navItems.map(item => (
              <Button key={item.label} variant="ghost" asChild>
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isLoadingProfile && currentUser && <Button variant="outline" size="icon" disabled><Settings className="h-4 w-4 animate-spin" /></Button>}
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
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <ProfileIcon className="mr-2 h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  {currentUser.email === ADMIN_EMAIL && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/blog">
                        <ShieldCheck className="mr-2 h-4 w-4" /> Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
               !isLoadingProfile && !currentUser && (
                  <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSignInWithGoogle} 
                      className="min-w-[120px]"
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
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
                    className="w-full text-base py-3 mt-2"
                  >
                    <UserCircle className="mr-2 h-5 w-5" />
                    Login / Sign Up
                  </Button>
              )}
              {currentUser && (
                 <Button 
                    variant="outline" 
                    onClick={() => { handleSignOut(); setMobileNavOpen(false);}}
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

    