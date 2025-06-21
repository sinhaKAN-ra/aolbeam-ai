"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import { SubscriptionStatus } from '@/components/usage/SubscriptionStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UsagePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();
  const router = useRouter();

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Error checking auth status:', authError);
          setError('Failed to load authentication status');
          return;
        }
        
        if (!user) {
          // Redirect to login if not authenticated
          router.push('/login?redirectTo=/account/usage');
          return;
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error in auth check:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router, supabase.auth]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/profile">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
          </Button>
        </div>
        <div className="space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <h2 className="text-lg font-semibold">Error</h2>
          <p className="mt-2">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/profile">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Link>
        </Button>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Subscription & Usage</h1>
        <p className="text-muted-foreground mt-2">
          View your current plan, usage statistics, and manage your subscription
        </p>
      </div>
      
      <div className="grid gap-6">
        <SubscriptionStatus className="w-full" detailedView />
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Add more usage statistics or subscription management options here */}
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">Billing Information</h3>
            <p className="text-muted-foreground">
              Manage your payment methods and view billing history
            </p>
            <div className="mt-4">
              <Button variant="outline" asChild>
                <Link href="/account/billing">
                  Manage Billing
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">Upgrade Plan</h3>
            <p className="text-muted-foreground">
              Unlock more features and higher usage limits
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/pricing">
                  View Plans
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
