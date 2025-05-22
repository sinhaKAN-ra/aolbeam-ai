
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


export default function Header() {
  const { toast } = useToast();
  const [supabase] = useState<SupabaseClient>(() => {
    console.log('Header: Initializing Supabase client (once)...');
    return createClientComponentClient();
  });
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true); 
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const fetchAndSetUserProfileHeader = useCallback(async (user: User) => {
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
        let needsClientSideUpdate = false;
        const updatePayload: Partial<UserProfile> = {};

        if (!profileData.email && user.email) {
          updatePayload.email = user.email;
          needsClientSideUpdate = true;
        }
        if (!profileData.full_name && user.user_metadata?.full_name) {
          updatePayload.full_name = user.user_metadata.full_name;
          needsClientSideUpdate = true;
        } else if (!profileData.full_name && user.email && !user.user_metadata?.full_name) {
          // Fallback for full_name if not in metadata but email exists
          updatePayload.full_name = user.email.split('@')[0];
          needsClientSideUpdate = true;
        }


        if (needsClientSideUpdate) {
          console.log(`Header: Profile for ${user.id} missing details from DB, attempting client-side update...`, updatePayload);
          const { data: updatedProfile, error: clientUpdateError } = await supabase
            .from('user_profiles')
            .update(updatePayload)
            .eq('id', user.id)
            .select()
            .single();
          
          if (clientUpdateError) {
            console.error(`Header: Error updating profile for ${user.id} with missing details via client:`, clientUpdateError);
            // Continue with potentially incomplete profileData, or handle error more strictly
          } else if (updatedProfile) {
            profileData = updatedProfile as UserProfile; // Use the updated profile
            console.log(`Header: Profile for ${user.id} updated successfully with missing details via client.`);
          }
        }
        setUserProfile(profileData as UserProfile);

      } else if (fetchError && fetchError.code === 'PGRST116') { // Profile does not exist
        console.log('Header: No profile found (PGRST116), attempting to create as fallback (DB trigger might not have run/completed)...');
        const newProfilePayload: Omit<UserProfile, 'created_at' | 'updated_at'> = { 
          id: user.id,
          email: user.email!, // Email should exist on the user object
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User', // Extract full_name or fallback
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
            console.log('Header: Fallback profile created successfully on client-side request.');
        } else if (insertError && insertError.code === '23505') { // Unique violation, likely trigger created it
            console.log('Header: Profile insert failed due to unique violation (profile likely created by trigger). Re-fetching...');
            const { data: refetchedData, error: refetchError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (refetchedData) setUserProfile(refetchedData as UserProfile);
            else {
                console.error('Header: Error re-fetching profile after unique violation:', refetchError);
                toast({ variant: 'destructive', title: 'Profile Sync Error', description: `Could not sync your profile: ${refetchError?.message || 'Unknown error'}`});
            }
        } else { // Other insert error
            console.error('Header: Error creating user profile during fallback insert:', insertError);
            toast({ variant: 'destructive', title: 'Profile Creation Failed', description: `Could not create your profile: ${insertError?.message || 'Unknown error'}`});
        }
      } else if (fetchError) { // Other database error
        console.error('Header: Database error fetching profile:', fetchError);
        toast({ variant: 'destructive', title: 'Profile Error', description: `Could not load your profile: ${fetchError.message}`});
      }
    } catch (error) { // Catch-all for unexpected errors
      console.error('Header: Unexpected error during profile setup:', error);
      toast({ variant: 'destructive', title: 'Profile Setup Error', description: error instanceof Error ? error.message : 'An unknown error occurred.'});
    } finally {
      setIsLoadingProfile(false);
      console.log(`Header: Profile fetching complete. isLoading: ${false}, userProfile email: ${userProfile?.email}`);
    }
  }, [supabase, toast]); // Removed userProfile from dependencies as it's set inside

  useEffect(() => {
    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Header: Auth state changed:', event, { user: session?.user?.email });
      const user = session?.user ?? null;
      setCurrentUser(user);
      
      if (user) {
        await fetchAndSetUserProfileHeader(user);
      } else {
        setUserProfile(null);
        setIsLoadingProfile(false); // Ensure loading is false if user logs out
      }
    };

    const checkUser = async () => {
      setIsLoadingProfile(true); // Set loading true at the start of check
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setCurrentUser(user); // Set current user first
      if (user) {
        await fetchAndSetUserProfileHeader(user);
      } else {
        setIsLoadingProfile(false); // Ensure loading is false if no user
      }
    };

    console.log('Header: Setting up auth subscription...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    checkUser(); // Initial check for user session

    return () => {
      subscription?.unsubscribe();
      console.log("Header: Auth subscription cleaned up.");
    };
  }, [supabase, fetchAndSetUserProfileHeader]); // `fetchAndSetUserProfileHeader` is now a dependency

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
      setMobileNavOpen(false); // Close mobile nav on logout
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      // Optionally redirect to home page or login page: router.push('/');
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
