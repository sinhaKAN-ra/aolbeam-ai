'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/',
  loadingComponent,
}: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !user) {
        // If auth is required but no user is logged in, redirect to login
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (!requireAuth && user) {
        // If auth is not required but user is logged in, redirect away
        router.push(redirectTo);
      }
    }
  }, [isLoading, user, requireAuth, redirectTo, router, pathname]);

  // Show loading state while checking auth status
  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // If auth requirement is met, render children
  if ((requireAuth && user) || (!requireAuth && !user)) {
    return <>{children}</>;
  }

  // Default return (should be caught by the redirect above)
  return null;
}
