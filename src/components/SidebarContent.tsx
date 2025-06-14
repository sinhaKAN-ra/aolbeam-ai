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
  FileText,
  Settings,
  Loader2,
  History,
  MessageSquare,
  NotepadTextDashed,
  BookOpen,
  Zap,
  TrendingUp,
  Clock,
  User,
  CreditCard,
  HelpCircle,
  Star,
  Crown,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  Eye,
  Gift,
  AlertCircle,
  X,
  PanelLeft
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';
import Image from 'next/image';
import ChatHistorySidebar from '@/components/chat-feature/ChatHistorySidebar';
import { useChatHistory } from '@/hooks/useChatHistory';

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

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface NavItem {
  href?: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  requiresAuth?: boolean;
  isPro?: boolean;
  description?: string;
  onClick?: (e: React.MouseEvent) => void;
}

interface UserMenuItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  divider?: boolean;
  badge?: string;
  description?: string;
}

interface SidebarContentProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function SidebarContent({ isCollapsed = false, onToggleCollapse }: SidebarContentProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();
  const [userInitials, setUserInitials] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { setOpenMobile } = useSidebar();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const chatHistory = useChatHistory(user?.id || null);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const isPro = false; // Replace with actual pro status check
  const trialDaysLeft = 7; // Replace with actual trial calculation

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

  const toggleHistory = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggling history sidebar. Current state:', isHistoryOpen);
    setIsHistoryOpen(!isHistoryOpen);
  }, [isHistoryOpen]);

  // Navigation sections with grouped items
  const navSections = useMemo<NavSection[]>(() => [
    {
      items: [
        { 
          href: "/", 
          label: "Home", 
          icon: <Home className="h-4 w-4" />,
          description: "Dashboard and overview"
        },
        { 
          href: "/chat", 
          label: "A Learn (alpha)", 
          icon: <MessageSquare className="h-4 w-4" />, 
          badge: "Beta",
          description: "Chat with AI tutor"
        },
        {
          label: "Chat History",
          icon: <History className="h-4 w-4" />,
          description: "View your chat history",
          onClick: toggleHistory,
        },
      ]
    },
    {
      title: "Practice & Learn",
      items: [
        { 
          href: "/#generate", 
          label: "Generate Problems", 
          icon: <Brain className="h-4 w-4" />,
          description: "Create custom practice problems"
        },
        { 
          href: "/tests", 
          label: "Practice Tests", 
          icon: <NotepadTextDashed className="h-4 w-4" />,
          description: "Full-length practice exams"
        },
        { 
          href: "/study-resources", 
          label: "Study Resources", 
          icon: <BookOpen className="h-4 w-4" />,
          description: "Curated study materials"
        },
        { 
          href: "/flashcards", 
          label: "Flashcards", 
          icon: <Zap className="h-4 w-4" />, 
          isPro: true,
          description: "Spaced repetition flashcards"
        },
      ]
    },
    {
      title: "Your Progress",
      items: [
        { 
          href: "/history", 
          label: "History", 
          icon: <History className="h-4 w-4" />,
          description: "View your learning history",
        },
        { 
          href: "/analytics", 
          label: "Analytics", 
          icon: <TrendingUp className="h-4 w-4" />, 
          isPro: true,
          description: "Detailed performance insights"
        },
        // { 
        //   href: "/streak", 
        //   label: "Study Streak", 
        //   icon: <Clock className="h-4 w-4" />,
        //   description: "Track your consistency"
        // },
      ]
    },
    {
      title: "Resources",
      items: [
        { 
          href: "/help", 
          label: "Help Center", 
          icon: <HelpCircle className="h-4 w-4" />,
          description: "Get help and support"
        },
        { 
          href: "/about", 
          label: "About", 
          icon: <AboutIcon className="h-4 w-4" />,
          description: "Learn about AOL Beam"
        },
        { 
          href: "/contact-us", 
          label: "Contact", 
          icon: <ContactIcon className="h-4 w-4" />,
          description: "Get in touch with us"
        },
      ]
    }
  ], [toggleHistory]);

  // Public menu items (shown before login)
  const publicMenuItems = useMemo<UserMenuItem[]>(() => [
    { 
      label: "Pricing Plans", 
      icon: <DollarSign className="h-4 w-4" />, 
      href: "/pricing",
      description: "View our affordable plans"
    },
    { 
      label: "Free Trial", 
      icon: <Gift className="h-4 w-4" />, 
      href: "/trial",
      badge: "7 Days Free",
      description: "Start your free trial"
    },
    { divider: true, label: "", icon: null },
    { 
      label: "Features", 
      icon: <Star className="h-4 w-4" />, 
      href: "/features",
      description: "See what AOL Beam offers"
    },
    { 
      label: "Student Discounts", 
      icon: <Crown className="h-4 w-4" />, 
      href: "/student-discount",
      badge: "50% Off",
      description: "Special pricing for students"
    },
    { divider: true, label: "", icon: null },
    { 
      label: "Terms of Service", 
      icon: <FileText className="h-4 w-4" />, 
      href: "/terms-of-service",
      description: "Read our terms"
    },
    { 
      label: "Privacy Policy", 
      icon: <ShieldCheck className="h-4 w-4" />, 
      href: "/privacy-policy",
      description: "How we protect your data"
    },
  ], []);

  // User menu items (shown after login)
  const userMenuItems = useMemo<UserMenuItem[]>(() => {
    const items: UserMenuItem[] = [
      { 
        label: "Profile", 
        icon: <ProfileIcon className="h-4 w-4" />, 
        href: "/profile",
        description: "Manage your profile"
      },
      { 
        label: "Settings", 
        icon: <Settings className="h-4 w-4" />, 
        href: "/profile/settings",
        description: "Account preferences"
      },
      { divider: true, label: "", icon: null },
      { 
        label: "Billing & Usage", 
        icon: <CreditCard className="h-4 w-4" />, 
        href: "/profile/subscriptions",
        badge: isPro ? "Pro" : "Free",
        description: "Manage subscription"
      },
      { 
        label: "Upgrade Plan", 
        icon: <Crown className="h-4 w-4" />, 
        href: "/pricing",
        badge: isPro ? undefined : "Upgrade",
        description: isPro ? "Manage your Pro plan" : "Unlock premium features"
      },
      { divider: true, label: "", icon: null },
      { 
        label: "Sign out", 
        icon: <LogOut className="h-4 w-4" />, 
        onClick: handleSignOut,
        description: "Sign out of your account"
      },
    ];

    if (isAdmin) {
      items.unshift(
        { 
          label: "Admin Panel", 
          icon: <ShieldCheck className="h-4 w-4" />, 
          href: "/admin",
          description: "Admin dashboard"
        },
        { divider: true, label: "", icon: null }
      );
    }

    return items;
  }, [isAdmin, handleSignOut, isPro]);

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

  const renderNavItem = (item: NavItem) => {
    const isActive = item.href && (pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href)));
    
    const ButtonContent = () => (
      <div className="flex items-center gap-3 w-full">
        <div className="flex-shrink-0">
          {item.icon}
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left truncate">{item.label}</span>
            <div className="flex items-center gap-1">
              {item.isPro && !isPro && (
                <Crown className="h-3 w-3 text-amber-500" />
              )}
              {item.badge && (
                <Badge 
                  variant={item.badgeVariant || "secondary"} 
                  className="text-xs px-1.5 py-0.5 h-5"
                >
                  {item.badge}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
    );

    const buttonElement = (
      <Button
        key={item.label}
        variant={isActive ? "secondary" : "ghost"}
        className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'} group relative ${
          isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
        }`}
        onClick={(e) => {
          if (item.onClick) {
            item.onClick(e);
          } else if (item.href) {
            setOpenMobile(false);
          }
        }}
        asChild={!!item.href && !item.onClick}
      >
        {item.href && !item.onClick ? (
          <Link href={item.href}>
            <ButtonContent />
          </Link>
        ) : (
          <ButtonContent />
        )}
      </Button>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider key={item.label}>
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonElement}
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">{item.label}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                )}
                {item.badge && (
                  <Badge variant={item.badgeVariant || "secondary"} className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return buttonElement;
  };

  return (
    <div className="relative">
      <div className={`flex flex-col h-screen bg-background transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        {/* Header - Fixed */}
        <div className={`flex-shrink-0 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        } p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`}>
          {!isCollapsed && (
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
          )}
          
          <div className="flex items-center gap-2">
            {!isCollapsed && <ThemeToggle />}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 p-0"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Trial/Upgrade Banner for logged-in users - Fixed */}
        {/* {user && !isPro && !isCollapsed && (
          <div className="flex-shrink-0 m-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Free Trial: {trialDaysLeft} days left
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
                  asChild
                >
                  <Link href="/pricing">Upgrade to Pro →</Link>
                </Button>
              </div>
            </div>
          </div>
        )} */}

        {/* New Chat Button - Fixed */}
        {user && (
          <div className={`flex-shrink-0 p-4 ${isCollapsed ? '' : 'border-b'}`}>
            {isCollapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="w-full h-10 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                      asChild
                    >
                      <Link href="/chat">
                        <Plus className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>New Chat</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button 
                variant="default" 
                className="w-full justify-start gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
                asChild
              >
                <Link href="/chat">
                  <Plus className="h-4 w-4" />
                  New Chat
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Main Navigation - Scrollable */}
        <div className="flex-1 min-h-0">
          <nav className="h-full overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
            {navSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-1">
                {section.title && !isCollapsed && (
                  <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map(renderNavItem)}
                </div>
              </div>
            ))}
            
            {/* Add some bottom padding to ensure last items are accessible */}
            <div className="h-4"></div>
          </nav>
        </div>

        {/* User Section / Login - Fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {isCollapsed ? (
                  <Button variant="ghost" size="sm" className="w-full h-10 hover:bg-accent/70 transition-colors">
                    <Avatar className="h-6 w-6 ring-2 ring-background shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-medium">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 h-auto p-3 hover:bg-accent/70 transition-colors rounded-lg"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-medium text-sm truncate">
                          {user?.user_metadata?.full_name || userEmail.split('@')[0]}
                        </span>
                        {isPro && <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                      </div>
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {isPro ? 'Pro Plan' : `Free Trial - ${trialDaysLeft}d left`}
                      </span>
                    </div>
                    <UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </Button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72" align="end" forceMount>
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium">{user?.user_metadata?.full_name || userEmail.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isPro ? "default" : "secondary"} className="text-xs">
                      {isPro ? 'Pro Plan' : 'Free Trial'}
                    </Badge>
                    {!isPro && (
                      <span className="text-xs text-muted-foreground">
                        {trialDaysLeft} days left
                      </span>
                    )}
                  </div>
                </div>
                {userMenuItems.map((item, index) => (
                  item.divider ? (
                    <DropdownMenuSeparator key={`sep-${index}`} />
                  ) : (
                    <DropdownMenuItem
                      key={item.label}
                      asChild={!!item.href}
                      onClick={item.onClick}
                      className="cursor-pointer flex-col items-start p-3"
                      disabled={isSigningOut && item.label === 'Sign out'}
                    >
                      {item.href ? (
                        <Link href={item.href} className="w-full">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              {item.icon}
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <Badge variant="outline" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          )}
                        </Link>
                      ) : (
                        <div className="w-full">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              {item.icon}
                              <span>{item.label}</span>
                            </div>
                            {isSigningOut && item.label === 'Sign out' && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      )}
                    </DropdownMenuItem>
                  )
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="space-y-3">
              <Button
                variant="default"
                onClick={handleSignIn}
                className={`w-full ${isCollapsed ? 'px-2' : 'justify-center gap-2'} bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon className="h-4 w-4" />
                    {!isCollapsed && "Sign in with Google"}
                  </>
                )}
              </Button>
              
              {/* Pre-signup information */}
              {!isCollapsed && (
                <>
                  <div className="text-xs text-center space-y-1">
                    <p className="text-muted-foreground">
                      Start your <span className="font-medium text-green-600">7-day free trial</span>
                    </p>
                    <p className="text-muted-foreground">
                      No credit card required
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full hover:bg-accent/70 transition-colors">
                        <Eye className="h-3 w-3 mr-1" />
                        Learn More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-72" align="end">
                      {publicMenuItems.map((item, index) => (
                        item.divider ? (
                          <DropdownMenuSeparator key={`sep-${index}`} />
                        ) : (
                          <DropdownMenuItem
                            key={item.label}
                            asChild
                            className="cursor-pointer flex-col items-start p-3"
                          >
                            <Link href={item.href || '#'} className="w-full">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  {item.icon}
                                  <span>{item.label}</span>
                                </div>
                                {item.badge && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}
                            </Link>
                          </DropdownMenuItem>
                        )
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat History Sidebar */}
      {isHistoryOpen && (
        <div className="absolute top-0 right-100 w-90 bg-background border-l shadow-2xl z-50 h-full overflow-hidden flex flex-col backdrop-blur-sm">
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-background/95">
            <h2 className="font-semibold text-lg">Chat History</h2>
            <Button variant="ghost" size="icon" onClick={toggleHistory} className="h-8 w-8 hover:bg-accent/70">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatHistorySidebar 
              sessions={chatHistory.sessions}
              currentSessionId={chatHistory.currentSessionId}
              onSelectSession={(sessionId) => {
                chatHistory.setCurrentSessionId(sessionId);
                router.push(`/chat/${sessionId}`);
              }}
              onCreateNewSession={async () => {
                const newSessionId = await chatHistory.createNewSession('New Chat');
                if (newSessionId) {
                  router.push(`/chat/${newSessionId}`);
                }
                return newSessionId || null;
              }}
              onDeleteSession={chatHistory.deleteSession}
              onUpdateSessionTitle={chatHistory.updateSessionTitle}
              isLoading={chatHistory.isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}