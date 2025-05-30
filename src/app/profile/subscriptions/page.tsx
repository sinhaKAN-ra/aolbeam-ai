'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSubscription, cancelSubscription } from '@/services/subscriptionService';
import { Loader2, AlertCircle, CheckCircle, Calendar, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Subscription } from '@/services/subscriptionService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export default function SubscriptionsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login?redirect=/profile/subscriptions');
      return;
    }

    if (user) {
      loadSubscription();
    }
  }, [user, isAuthLoading, router]);

  const loadSubscription = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sub = await getUserSubscription();
      setSubscription(sub);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription information. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    
    setIsCancelling(true);
    setCancelError(null);
    setCancelSuccess(false);
    
    try {
      const result = await cancelSubscription(subscription.id);
      if (result.success) {
        setCancelSuccess(true);
        // Reload subscription to get updated status
        loadSubscription();
      } else {
        setCancelError(result.message || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setCancelError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Cancelled</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Expired</Badge>;
      case 'PAST_DUE':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Past Due</Badge>;
      case 'PAUSED':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Paused</Badge>;
      case 'TRIAL':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Trial</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading subscription information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadSubscription}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">My Subscription</h1>
      
      {cancelSuccess && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            Your subscription has been cancelled successfully. You will continue to have access until the end of your current billing period.
          </AlertDescription>
        </Alert>
      )}
      
      {cancelError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{cancelError}</AlertDescription>
        </Alert>
      )}
      
      {!subscription ? (
        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>You don't have any active subscriptions at the moment.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Subscribe to AOLBeam to access premium features and enhance your learning experience.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/pricing">View Plans</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{subscription.plan_id.charAt(0).toUpperCase() + subscription.plan_id.slice(1)} Plan</CardTitle>
                <CardDescription>Subscription details</CardDescription>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">{subscription.status}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Payment Provider</p>
                  <p className="text-sm text-muted-foreground capitalize">{subscription.provider}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Amount</p>
                  <p className="text-sm text-muted-foreground">
                    {subscription.currency === 'INR' ? 'u20b9' : '$'}{subscription.amount} / {subscription.interval}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Started On</p>
                  <p className="text-sm text-muted-foreground">{formatDate(subscription.created_at)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Current Period</p>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                </p>
              </div>
              
              {subscription.cancel_at_period_end && (
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Your subscription is set to cancel at the end of the current billing period. You will continue to have access until {formatDate(subscription.current_period_end)}.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex-1">
              {!subscription.cancel_at_period_end && subscription.status === 'ACTIVE' && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              )}
            </div>
            <div className="flex-1">
              <Button asChild className="w-full">
                <Link href="/pricing">Manage Plan</Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
